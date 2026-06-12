import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppService } from '../app.service';
import { NotificationService } from '../notification.service';
import { config } from '../../config.local';
import * as fs from 'fs';
import * as path from 'path';

interface TargetFloor {
  floorNum: number;
  claimed: boolean;
  grabbed: boolean; // true=成功抢到, false=错过
  landedFloor?: number; // 评论实际落地的楼层(抢到时才有)
  claimedAt?: number;
  verified?: boolean; // 是否通过接口验证确认命中
}

interface TrackedArticle {
  businessId: string;
  title: string;
  publishTime: string;
  targetFloors: TargetFloor[];
  commentContent: string; // 指定的评论内容，为空则使用默认值 "1"
  lastCheckedFloor: number;
  lastCheckTime: number;
  currentSpeed: number; // 当前盖楼速度（层/分钟）
}

interface ProcessedArticle {
  title: string;
  businessId: string;
  reason: string;
  targetFloors: TargetFloor[];
  commentContent: string;
  publishTime: string;
}

@Injectable()
export class ArticleScanner {
  private readonly logger = new Logger(ArticleScanner.name);

  // 正在跟踪的盖楼帖子
  private trackedArticles: Map<string, TrackedArticle> = new Map();

  // 已处理过的帖子（避免重复扫描）
  private processedArticles: Map<string, ProcessedArticle> = new Map();

  // 动态检查间隔（毫秒）
  private checkInterval = 20000; // 默认 20 秒（速度检测模式）
  private checkTimer: NodeJS.Timeout | null = null;

  // 本地记录文件路径
  private readonly grabRecordsPath = path.resolve(
    __dirname,
    '../../data/grab-records.json',
  );

  constructor(
    private readonly appService: AppService,
    private readonly notificationService: NotificationService,
  ) {
    this.init();
  }

  private async init() {
    await this.scanNewArticles();
    if (this.trackedArticles.size > 0) {
      await this.checkCommentFloors();
    }
    this.startDynamicCheck();
  }

  // 手动注入目标楼层到所有监控中的帖子
  addManualTargetFloor(floorNum: number) {
    for (const [_, tracked] of this.trackedArticles) {
      const exists = tracked.targetFloors.some((f) => f.floorNum === floorNum);
      if (!exists) {
        tracked.targetFloors.push({ floorNum, claimed: false, grabbed: false });
        tracked.targetFloors.sort((a, b) => a.floorNum - b.floorNum);
        this.logger.log(`[${tracked.title}] 手动添加目标楼层: ${floorNum}`);
      }
    }
    this.updateCheckInterval();
  }

  // 动态检查循环
  private startDynamicCheck() {
    const check = async () => {
      await this.checkCommentFloors();
      this.checkTimer = setTimeout(check, this.checkInterval);
    };
    this.checkTimer = setTimeout(check, this.checkInterval);
  }

  // 根据盖楼速度和距离目标楼层的差距动态调整检查间隔
  // 逻辑：速度=0 时 20s 查一次，有速度时根据差距降级到 1-10s
  private updateCheckInterval() {
    if (this.trackedArticles.size === 0) {
      this.checkInterval = 60000;
      return;
    }

    // 检查是否有帖子有实际速度
    let maxSpeed = 0;
    for (const [_, tracked] of this.trackedArticles) {
      if (tracked.currentSpeed > maxSpeed) {
        maxSpeed = tracked.currentSpeed;
      }
    }

    // 速度为零，保持慢速轮询只检测速度
    if (maxSpeed === 0 && !this.hasPendingNearTarget()) {
      this.checkInterval = 20000;
      return;
    }

    // 有速度时，根据盖楼速度优先降级间隔
    if (maxSpeed > 100) {
      this.checkInterval = 1000;
      return;
    }
    if (maxSpeed > 50) {
      this.checkInterval = 3000;
      return;
    }

    // 低速度时，根据到目标楼层的差距调整
    let minGap = Infinity;
    for (const [_, tracked] of this.trackedArticles) {
      const pendingFloors = tracked.targetFloors.filter((f) => !f.claimed);
      if (pendingFloors.length === 0) continue;

      const nextTarget = pendingFloors[0].floorNum;
      const gap = nextTarget - tracked.lastCheckedFloor;
      if (gap > 0 && gap < minGap) {
        minGap = gap;
      }
    }

    if (minGap < 10) {
      this.checkInterval = 1000;
    } else if (minGap < 100) {
      this.checkInterval = 5000;
    } else {
      this.checkInterval = 10000;
    }
  }

  // 是否有帖子的目标楼层已接近（差距 < 200 层）
  private hasPendingNearTarget(): boolean {
    for (const [_, tracked] of this.trackedArticles) {
      const pendingFloors = tracked.targetFloors.filter((f) => !f.claimed);
      if (pendingFloors.length === 0) continue;
      const gap = pendingFloors[0].floorNum - tracked.lastCheckedFloor;
      if (gap > 0 && gap < 200) return true;
    }
    return false;
  }

  // 每5分钟扫描一次新帖子
  @Cron('*/5 * * * *')
  async scanNewArticles() {
    this.logger.log('开始扫描新帖子...');
    try {
      const data = await this.appService.getArticleList(1, 20);
      if (!data || !data.articleReplyList) {
        this.logger.warn('获取文章列表为空');
        return;
      }

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 临时改为24小时

      for (const article of data.articleReplyList) {
        const publishTime = new Date(article.publishTime);

        // 只处理最近一小时内发布的帖子
        if (publishTime < oneHourAgo) {
          continue;
        }

        // 检查是否已经跟踪或已处理过
        if (
          this.trackedArticles.has(article.businessId) ||
          this.processedArticles.has(article.businessId)
        ) {
          continue;
        }

        // 检查标题是否包含"盖楼"
        if (!article.title.includes('盖楼')) {
          continue;
        }

        this.logger.log(
          `发现新盖楼帖子: ${article.title} (${article.businessId})`,
        );

        // 获取帖子详情
        const detail = await this.appService.getArticleDetail(
          article.businessId,
        );
        if (!detail) {
          this.logger.warn(`获取帖子详情失败: ${article.businessId}`);
          continue;
        }

        // 解析目标楼层
        const targetFloors = this.parseTargetFloors(
          detail.fullContent || detail.simpleContent || '',
        );
        if (targetFloors.length === 0) {
          this.logger.warn(`未找到目标楼层: ${article.title}`);
          continue;
        }

        // 解析指定的评论内容
        const commentContent =
          this.parseCommentContent(
            detail.fullContent || detail.simpleContent || '',
          ) || '1';

        this.logger.log(
          `目标楼层: ${targetFloors.join(', ')}, 评论内容: "${commentContent}"`,
        );

        // 添加到跟踪列表
        this.trackedArticles.set(article.businessId, {
          businessId: article.businessId,
          title: article.title,
          publishTime: article.publishTime,
          commentContent,
          targetFloors: targetFloors.map((f) => ({
            floorNum: f,
            claimed: false,
            grabbed: false,
          })),
          lastCheckedFloor: 0,
          lastCheckTime: 0,
          currentSpeed: 0,
        });
        // 同时保存到已处理列表，这样帖子完成后结果不丢失
        this.processedArticles.set(article.businessId, {
          title: article.title,
          businessId: article.businessId,
          publishTime: article.publishTime,
          commentContent,
          reason: 'monitoring',
          targetFloors: targetFloors.map((f) => ({
            floorNum: f,
            claimed: false,
            grabbed: false,
          })),
        });

        // 新增监控帖子，更新检查间隔
        this.updateCheckInterval();
      }
    } catch (error) {
      this.logger.error('扫描新帖子失败:', error.message);
    }
  }

  // 检查评论楼层
  async checkCommentFloors() {
    if (this.trackedArticles.size === 0) {
      return;
    }

    for (const [businessId, tracked] of this.trackedArticles) {
      try {
        const commentData = await this.appService.getCommentList(
          businessId,
          1,
          5,
        );
        if (
          !commentData ||
          !commentData.commentReplyList ||
          commentData.commentReplyList.length === 0
        ) {
          continue;
        }

        const currentFloor: number = (commentData.commentReplyList[0] as any)
          .floorNum;

        // 计算盖楼速度（层/分钟）
        const now = Date.now();
        if (
          tracked.lastCheckTime > 0 &&
          currentFloor > tracked.lastCheckedFloor
        ) {
          const elapsedMinutes = (now - tracked.lastCheckTime) / 60000;
          if (elapsedMinutes > 0) {
            tracked.currentSpeed = Math.round(
              (currentFloor - tracked.lastCheckedFloor) / elapsedMinutes,
            );
          }
        } else if (currentFloor <= tracked.lastCheckedFloor) {
          tracked.currentSpeed = 0;
        }
        tracked.lastCheckTime = now;

        this.logger.log(
          `[${tracked.title}] 当前楼层: ${currentFloor}, 速度: ${tracked.currentSpeed}层/分钟`,
        );

        // 检查是否有需要抢的楼层
        for (const target of tracked.targetFloors) {
          if (target.claimed) {
            continue;
          }

          // 当前楼层到达目标附近，开始尝试抢楼
          // 速度越快，提前量越大，防止跳过窗口
          const speedThreshold =
            tracked.currentSpeed > 100
              ? 30
              : tracked.currentSpeed > 50
                ? 15
                : 10;
          const gap = target.floorNum - currentFloor;
          if (gap > 0 && gap <= speedThreshold) {
            this.logger.log(
              `[${tracked.title}] 接近目标楼层 ${target.floorNum}，当前楼层: ${currentFloor}，差距: ${gap}层，触发阈值: ${speedThreshold}层，尝试抢楼`,
            );

            const sendCount = 3; // 高速度下发三条确保命中
            for (let i = 0; i < sendCount; i++) {
              const result = await this.appService.sendComment(
                businessId,
                tracked.commentContent,
              );
              if (result) {
                this.logger.log(
                  `[${tracked.title}] 第${i + 1}条发送成功，目标: ${target.floorNum}, 实际: ${result.floorNum}`,
                );
                if (result.floorNum >= target.floorNum) {
                  this.logger.log(
                    `[${tracked.title}] 抢楼成功! 实际楼层 ${result.floorNum} 到达目标 ${target.floorNum}`,
                  );
                  target.claimed = true;
                  target.grabbed = true;
                  target.landedFloor = result.floorNum;
                  target.claimedAt = Date.now();
                  // 同步更新已处理列表的记录
                  const processed = this.processedArticles.get(businessId);
                  if (processed) {
                    const pt = processed.targetFloors.find(
                      (f) => f.floorNum === target.floorNum,
                    );
                    if (pt) {
                      pt.claimed = true;
                      pt.grabbed = true;
                      pt.landedFloor = result.floorNum;
                      pt.claimedAt = Date.now();
                    }
                  }
                  // 自动验证：查目标楼层是不是我
                  this.verifyFloor(businessId, target.floorNum).then((ok) => {
                    target.verified = ok;
                    if (processed) {
                      const pt = processed.targetFloors.find(
                        (f) => f.floorNum === target.floorNum,
                      );
                      if (pt) pt.verified = ok;
                    }
                    if (ok) {
                      this.logger.log(
                        `[${tracked.title}] ✓ 楼层 ${target.floorNum} 确认命中`,
                      );
                      this.saveGrabRecords();
                    } else {
                      this.logger.warn(
                        `[${tracked.title}] ✗ 楼层 ${target.floorNum} 未命中（可能被抢）`,
                      );
                    }
                  });
                  this.notificationService.send(
                    '抢楼成功!',
                    `<b>${tracked.title}</b><br>目标楼层: ${target.floorNum}<br>实际楼层: ${result.floorNum}`,
                  );
                  break;
                }
              }
            }
          }

          // 已经超过目标楼层（没抢到）
          if (currentFloor > target.floorNum && !target.claimed) {
            target.claimed = true;
            target.grabbed = false;
            target.claimedAt = Date.now();
            // 同步更新已处理列表
            const processed = this.processedArticles.get(businessId);
            if (processed) {
              const pt = processed.targetFloors.find(
                (f) => f.floorNum === target.floorNum,
              );
              if (pt) {
                pt.claimed = true;
                pt.grabbed = false;
                pt.claimedAt = Date.now();
              }
            }
          }
        }

        tracked.lastCheckedFloor = currentFloor;

        // 检查是否所有目标楼层都已完成
        const allClaimed = tracked.targetFloors.every((f) => f.claimed);
        if (allClaimed) {
          this.logger.log(`[${tracked.title}] 所有目标楼层已完成，移除跟踪`);
          // 将最终结果保存到已处理列表
          this.processedArticles.set(businessId, {
            title: tracked.title,
            businessId: businessId,
            publishTime: tracked.publishTime,
            commentContent: tracked.commentContent,
            reason: 'all_floors_passed',
            targetFloors: tracked.targetFloors.map((f) => ({ ...f })),
          });
          this.trackedArticles.delete(businessId);
          this.updateCheckInterval();
        }
      } catch (error) {
        this.logger.error(`检查评论楼层失败 [${businessId}]:`, error.message);
      }
    }

    // 更新检查间隔
    this.updateCheckInterval();
  }

  // 获取监控状态（供 API 调用）
  getMonitorStatus() {
    // 监控中的帖子
    const monitoring: any[] = [];
    for (const [id, tracked] of this.trackedArticles) {
      const pendingFloors = tracked.targetFloors.filter((f) => !f.claimed);
      const claimedFloors = tracked.targetFloors.filter((f) => f.claimed);
      monitoring.push({
        businessId: id,
        title: tracked.title,
        url: `https://bbplanet.bilibili.co/pc/#/detail?tId=${id}&h=4`,
        publishTime: tracked.publishTime,
        currentFloor: tracked.lastCheckedFloor,
        targetFloors: tracked.targetFloors,
        pendingCount: pendingFloors.length,
        claimedCount: claimedFloors.length,
        nextTarget: pendingFloors.length > 0 ? pendingFloors[0].floorNum : null,
      });
    }

    // 已处理的帖子（楼层已过期）
    const expired: any[] = [];
    for (const [id, info] of this.processedArticles) {
      if (info.reason === 'all_floors_passed') {
        const grabbedFloors = info.targetFloors.filter((f) => f.grabbed);
        expired.push({
          businessId: id,
          title: info.title,
          publishTime: info.publishTime,
          targetFloors: info.targetFloors,
          grabbedCount: grabbedFloors.length,
          totalCount: info.targetFloors.length,
          url: `https://bbplanet.bilibili.co/pc/#/detail?tId=${id}&h=4`,
        });
      }
    }

    return {
      monitoring,
      expired,
      summary: {
        monitoringCount: monitoring.length,
        expiredCount: expired.length,
        checkInterval: this.checkInterval / 1000,
      },
    };
  }

  // 验证目标楼层：查帖子指定的楼层（如 666、2026、2233）上是不是我的名字
  async verifyFloor(businessId: string, floorNum: number): Promise<boolean> {
    try {
      const data = await this.appService.getCommentFloor(businessId, floorNum);
      if (!data) {
        this.logger.warn(`验证失败: 未找到楼层 ${floorNum} 的评论`);
        return false;
      }

      const myName = config.sourceNickname;
      const matched = data.userName === myName;
      this.logger.log(
        `验证楼层 ${floorNum}: 用户名 "${data.userName}", ${matched ? '✓ 是我' : '✗ 不是'}`,
      );
      return matched;
    } catch (error) {
      this.logger.error(`验证失败 [楼层 ${floorNum}]:`, error.message);
      return false;
    }
  }

  // 验证所有帖子的所有目标楼层
  async verifyAllGrabs() {
    const results: any[] = [];
    for (const [id, info] of this.processedArticles) {
      for (const f of info.targetFloors) {
        const ok = await this.verifyFloor(id, f.floorNum);
        f.verified = ok;
        if (ok) {
          f.grabbed = true;
          f.landedFloor = f.floorNum;
        }
        results.push({ title: info.title, floor: f.floorNum, verified: ok });
      }
    }
    for (const [id, tracked] of this.trackedArticles) {
      for (const f of tracked.targetFloors) {
        const ok = await this.verifyFloor(id, f.floorNum);
        f.verified = ok;
        if (ok) {
          f.grabbed = true;
          f.landedFloor = f.floorNum;
        }
        results.push({ title: tracked.title, floor: f.floorNum, verified: ok });
      }
    }
    this.saveGrabRecords();
    return results;
  }

  // 从内存中提取已验证的抢楼记录
  private collectGrabRecords(): any[] {
    const records: any[] = [];
    const seen = new Set<string>();

    const collect = (
      title: string,
      bid: string,
      f: TargetFloor,
      commentContent: string,
      publishTime: string,
    ) => {
      if (!f.grabbed || !f.verified) return;
      const key = `${bid}:${f.floorNum}`;
      if (seen.has(key)) return;
      seen.add(key);
      records.push({
        title,
        businessId: bid,
        url: `https://bbplanet.bilibili.co/pc/#/detail?tId=${bid}&h=4`,
        floorNum: f.floorNum,
        landedFloor: f.landedFloor ?? f.floorNum,
        commentContent,
        publishTime,
        verified: true,
        verifiedAt: new Date().toISOString(),
      });
    };

    for (const [id, info] of this.processedArticles) {
      for (const f of info.targetFloors) {
        collect(info.title, id, f, info.commentContent, info.publishTime);
      }
    }
    for (const [id, tracked] of this.trackedArticles) {
      for (const f of tracked.targetFloors) {
        collect(
          tracked.title,
          id,
          f,
          tracked.commentContent,
          tracked.publishTime,
        );
      }
    }
    return records;
  }

  // 保存抢楼记录到本地 JSON 文件
  private saveGrabRecords() {
    try {
      const dir = path.dirname(this.grabRecordsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const records = this.collectGrabRecords();
      fs.writeFileSync(
        this.grabRecordsPath,
        JSON.stringify(records, null, 2),
        'utf-8',
      );
      this.logger.log(
        `抢楼记录已保存到 ${this.grabRecordsPath} (${records.length} 条)`,
      );
    } catch (error) {
      this.logger.error('保存抢楼记录失败:', error.message);
    }
  }

  // 获取所有已保存的抢楼记录
  getGrabRecords(): any[] {
    try {
      if (fs.existsSync(this.grabRecordsPath)) {
        const raw = fs.readFileSync(this.grabRecordsPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (error) {
      this.logger.error('读取抢楼记录失败:', error.message);
    }
    return [];
  }

  // 从帖子内容中解析指定的评论内容
  // 常见格式：评论"BML轨道已接入"、回复"xxxx"、发送"xxxx"
  private parseCommentContent(content: string): string | null {
    const cleaned = content
      .replace(/&#60;/g, '<')
      .replace(/&#62;/g, '>')
      .replace(/&#47;/g, '/')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&#34;/g, '"')
      .replace(/&quot;/g, '"')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r?\n/g, ' ');

    // 匹配：评论"xxx"、回复"xxx"、发送"xxx"、评论："xxx"、评论区 "xxx"
    const patterns = [
      /(?:评论|回复|发送|留言)[：:]\s*[""](.+?)[""]/,
      /(?:评论|回复|发送|留言)\s*[""](.+?)[""]/,
      /(?:评论区)\s+[""](.+?)[""]/,
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
    }

    return null;
  }
  private parseTargetFloors(content: string): number[] {
    const floors: number[] = [];

    // 清理HTML实体和标签
    const contentCleaned = content
      .replace(/&#60;/g, '<')
      .replace(/&#62;/g, '>')
      .replace(/&#47;/g, '/')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r?\n/g, ' ');

    // 匹配常见的楼层格式
    const patterns = [
      /第\s*(\d+)\s*[楼层]/g, // "第188楼"
      /(\d+)\s*[楼层]/g, // "188楼"、"233层"
      /[抽送送第]\s*(\d+)/g, // "抽233"、"送888"
      /[,，、\s](\d{2,})\s*[,，、楼层]/g, // "、233、"、"，666楼"
    ];

    const found = new Set<number>();

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(contentCleaned)) !== null) {
        const num = parseInt(match[1], 10);
        // 过滤掉太小的数字（可能是日期等）和太大的数字
        if (num >= 10 && num <= 100000) {
          found.add(num);
        }
      }
    }

    floors.push(...Array.from(found).sort((a, b) => a - b));
    return floors;
  }
}
