import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppService } from '../app.service';
import { NotificationService } from '../notification.service';

interface TargetFloor {
  floorNum: number;
  claimed: boolean;
}

interface TrackedArticle {
  businessId: string;
  title: string;
  publishTime: string;
  targetFloors: TargetFloor[];
  lastCheckedFloor: number;
}

@Injectable()
export class ArticleScanner {
  private readonly logger = new Logger(ArticleScanner.name);

  // 正在跟踪的盖楼帖子
  private trackedArticles: Map<string, TrackedArticle> = new Map();

  // 已处理过的帖子（避免重复扫描）
  private processedArticles: Map<
    string,
    { title: string; businessId: string; reason: string }
  > = new Map();

  // 动态检查间隔（毫秒）
  private checkInterval = 60000; // 默认 60 秒
  private checkTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly appService: AppService,
    private readonly notificationService: NotificationService,
  ) {
    // 启动时立即执行一次
    setTimeout(() => this.scanNewArticles(), 3000);
    // 扫描完成后注入目标楼层
    setTimeout(() => {
      this.addManualTargetFloor(2330);
    }, 8000);
    // 启动动态检查循环
    this.startDynamicCheck();
  }

  // 手动注入目标楼层到所有监控中的帖子
  addManualTargetFloor(floorNum: number) {
    for (const [_, tracked] of this.trackedArticles) {
      const exists = tracked.targetFloors.some((f) => f.floorNum === floorNum);
      if (!exists) {
        tracked.targetFloors.push({ floorNum, claimed: false });
        tracked.targetFloors.sort((a, b) => a.floorNum - b.floorNum);
        this.logger.log(`[${tracked.title}] 手动添加目标楼层: ${floorNum}`);
      }
    }
    this.updateCheckInterval();
  }

  // 启动动态检查循环
  private startDynamicCheck() {
    const check = async () => {
      await this.checkCommentFloors();
      this.checkTimer = setTimeout(check, this.checkInterval);
    };
    this.checkTimer = setTimeout(check, this.checkInterval);
  }

  // 根据距离目标楼层的差距动态调整检查间隔
  private updateCheckInterval() {
    if (this.trackedArticles.size === 0) {
      this.checkInterval = 60000; // 没有监控的帖子，60 秒检查一次
      return;
    }

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

    // 动态调整间隔
    if (minGap < 10) {
      this.checkInterval = 1000; // 差 10 层以内：1 秒
    } else if (minGap < 50) {
      this.checkInterval = 1000; // 差 50 层以内：1 秒
    } else if (minGap < 100) {
      this.checkInterval = 5000; // 差 100 层以内：5 秒
    } else {
      this.checkInterval = 10000; // 差 100 层以上：10 秒
    }

    this.logger.log(
      `检查间隔调整为: ${this.checkInterval / 1000}秒 (最近目标差距: ${minGap}层)`,
    );
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

        this.logger.log(`目标楼层: ${targetFloors.join(', ')}`);

        // 添加到跟踪列表
        this.trackedArticles.set(article.businessId, {
          businessId: article.businessId,
          title: article.title,
          publishTime: article.publishTime,
          targetFloors: targetFloors.map((f) => ({
            floorNum: f,
            claimed: false,
          })),
          lastCheckedFloor: 0,
        });
        this.processedArticles.set(article.businessId, {
          title: article.title,
          businessId: article.businessId,
          reason: 'monitoring',
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

        // 检查是否有需要抢的楼层
        for (const target of tracked.targetFloors) {
          if (target.claimed) {
            continue;
          }

          // 当前楼层到达目标附近，开始尝试抢楼
          const gap = target.floorNum - currentFloor;
          if (gap > 0 && gap <= 10) {
            this.logger.log(
              `[${tracked.title}] 接近目标楼层 ${target.floorNum}，当前楼层: ${currentFloor}，差距: ${gap}层，尝试抢楼`,
            );

            // 差距小于10层时连发两条
            const sendCount = gap < 10 ? 2 : 1;
            for (let i = 0; i < sendCount; i++) {
              const result = await this.appService.sendComment(businessId, '1');
              if (result) {
                this.logger.log(
                  `[${tracked.title}] 第${i + 1}条发送成功，目标: ${target.floorNum}, 实际: ${result.floorNum}`,
                );
                if (result.floorNum >= target.floorNum) {
                  this.logger.log(
                    `[${tracked.title}] 抢楼成功! 实际楼层 ${result.floorNum} 到达目标 ${target.floorNum}`,
                  );
                  target.claimed = true;
                  this.notificationService.send(
                    '抢楼成功!',
                    `<b>${tracked.title}</b><br>目标楼层: ${target.floorNum}<br>实际楼层: ${result.floorNum}`,
                  );
                  break;
                }
              }
            }
          }

          // 已经超过目标楼层
          if (currentFloor > target.floorNum) {
            target.claimed = true;
          }
        }

        tracked.lastCheckedFloor = currentFloor;

        // 检查是否所有目标楼层都已完成
        const allClaimed = tracked.targetFloors.every((f) => f.claimed);
        if (allClaimed) {
          this.logger.log(`[${tracked.title}] 所有目标楼层已完成，移除跟踪`);
          this.trackedArticles.delete(businessId);
          this.processedArticles.set(businessId, {
            title: tracked.title,
            businessId: businessId,
            reason: 'all_floors_passed',
          });
          // 移除监控帖子，更新检查间隔
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
        expired.push({
          businessId: id,
          title: info.title,
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

  // 从帖子内容中解析目标楼层
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
