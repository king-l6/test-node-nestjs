import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { config } from '../config.local';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  private readonly cookie = config.cookie;

  private readonly headers = {
    accept: 'application/json',
    'accept-language': 'zh-CN,zh;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    priority: 'u=1, i',
    referer: 'https://bbplanet.bilibili.co/pc/',
    'sec-ch-ua':
      '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    'x-appkey': 'ops.teamwork.portal',
    'x-requested-with': 'XMLHttpRequest',
    'x-usertype': '1',
    'x1-bilispy-color': '2424',
  };

  // 获取文章列表
  async getArticleList(pageNum = 1, pageSize = 20) {
    try {
      const res = await axios.get(
        'https://bbplanet.bilibili.co/api/planet/article/list',
        {
          params: {
            pageNum,
            pageSize,
            scrollId: '',
            searchKey: '',
            order: 1,
          },
          headers: {
            ...this.headers,
            'x-csrf': `csrf-${Math.random()}`,
            cookie: this.cookie,
          },
        },
      );
      if (res.data.code !== 0) {
        this.logger.error('获取文章列表返回错误:', res.data.message);
        return null;
      }
      return res.data.data;
    } catch (error) {
      this.logger.error(
        '获取文章列表失败:',
        error.response?.data || error.message,
      );
      return null;
    }
  }

  // 获取文章详情
  async getArticleDetail(businessId: string) {
    try {
      const res = await axios.get(
        'https://bbplanet.bilibili.co/api/planet/article/detail',
        {
          params: { businessId },
          headers: {
            ...this.headers,
            'x-csrf': `csrf-${Math.random()}`,
            cookie: this.cookie,
          },
        },
      );
      if (res.data.code !== 0) {
        this.logger.error('获取文章详情返回错误:', res.data.message);
        return null;
      }
      return res.data.data;
    } catch (error) {
      this.logger.error(
        '获取文章详情失败:',
        error.response?.data || error.message,
      );
      return null;
    }
  }

  // 获取评论列表
  async getCommentList(articleBusinessId: string, pageNum = 1, pageSize = 50) {
    try {
      const res = await axios.get(
        'https://bbplanet.bilibili.co/api/planet/comment/commentList',
        {
          params: {
            articleBusinessId,
            pageSize,
            pageNum,
            order: 1,
            scrollId: null,
          },
          headers: {
            ...this.headers,
            'x-csrf': `csrf-${Math.random()}`,
            cookie: this.cookie,
          },
        },
      );
      if (res.data.code !== 0) {
        this.logger.error('获取评论列表返回错误:', res.data.message);
        return null;
      }
      return res.data.data;
    } catch (error) {
      this.logger.error(
        '获取评论列表失败:',
        error.response?.data || error.message,
      );
      return null;
    }
  }

  // 发送评论
  async sendComment(articleBusinessId: string, content: string) {
    try {
      const res = await axios.post(
        'https://bbplanet.bilibili.co/api/planet/comment/publish',
        {
          articleBusinessId,
          content,
          atUserList: [],
        },
        {
          headers: {
            ...this.headers,
            'content-type': 'application/json',
            'x-csrf': `csrf-${Math.random()}`,
            origin: 'https://bbplanet.bilibili.co',
            cookie: this.cookie,
          },
        },
      );
      if (res.data.code !== 0) {
        this.logger.error('发送评论返回错误:', res.data.message);
        return null;
      }
      this.logger.log(`发送评论成功, 楼层: ${res.data.data?.floorNum}`);
      return res.data.data;
    } catch (error) {
      this.logger.error('发送评论失败:', error.response?.data || error.message);
      return null;
    }
  }

  async getBuildingTowerCommentList() {
    try {
      const requests = axios.get(
        'https://bbplanet.bilibili.co/api/planet/comment/commentList',
        {
          params: {
            articleBusinessId: 'a3ce4dd1bbf54b89a475d1c01b1f92fc',
            pageSize: 50,
            pageNum: 1,
            order: 1,
            scrollId: null,
          },
          headers: {
            'X-CSRF': `csrf-${Math.random()}`,
            'X-UserType': 1,
            'X-AppKey': 'ops.teamwork.portal',
            cookie: '_AJSESSIONID=4c5a697f740938158b27b7f95e1bb471;',
          },
        },
      );
      const res = await requests;
      return res.data.data;
    } catch (error) {
      console.error('获取同事吧评论数据出错:', error);
      return {
        data: {
          list: [],
          total: 0,
        },
      };
    }
  }
  async sendBuildingTowerComment() {
    try {
      const requests = axios.post(
        'https://bbplanet.bilibili.co/api/planet/comment/publish',
        {
          articleBusinessId: 'a3ce4dd1bbf54b89a475d1c01b1f92fc',
          content: `1`,
        },
        {
          headers: {
            'X-CSRF': `csrf-${Math.random()}`,
            'X-UserType': 1,
            'X-AppKey': 'ops.teamwork.portal',
            cookie: '_AJSESSIONID=4c5a697f740938158b27b7f95e1bb471;',
          },
        },
      );
      const res = await requests;
      console.log('发送同事吧评论成功,当前层数--->', res.data.data.floorNum);
      return res.data.data;
    } catch (error) {
      console.error('发送同事吧评论数据出错:', error);
    }
  }

  // 获取当前用户信息
  async getUserInfo() {
    try {
      const res = await axios.get(
        'https://bbplanet.bilibili.co/api/planet/user/current',
        {
          headers: {
            ...this.headers,
            'x-csrf': `csrf-${Math.random()}`,
            cookie: this.cookie,
          },
        },
      );
      if (res.data.code !== 0) {
        this.logger.error('获取用户信息返回错误:', res.data.message);
        return null;
      }
      return res.data.data;
    } catch (error) {
      this.logger.error('获取用户信息失败:', error.response?.data || error.message);
      return null;
    }
  }

  // 获取指定评论楼层的信息
  async getCommentFloor(articleBusinessId: string, floorNum: number) {
    try {
      // 获取第一页，拿到 total 总数
      const res = await axios.get(
        'https://bbplanet.bilibili.co/api/planet/comment/commentList',
        {
          params: {
            articleBusinessId,
            pageSize: 50,
            pageNum: 1,
            order: 1,
            scrollId: null,
          },
          headers: {
            ...this.headers,
            'x-csrf': `csrf-${Math.random()}`,
            cookie: this.cookie,
          },
        },
      );
      if (res.data.code !== 0) return null;

      // 先查第一页
      const firstList = res.data.data?.commentReplyList || [];
      for (const c of firstList) {
        if (c.floorNum === floorNum) {
          return { floorNum: c.floorNum, content: c.content, userName: c.sourceNickname || c.userName || c.nickName };
        }
      }

      const total = res.data.data?.total || 0;
      // order=1 最新在前，楼层号从高到低排列
      // 目标楼层在第几页：先算它在倒排中的位置，再换算页码
      const position = total - floorNum + 1; // 在倒排中的序号（从1开始）
      const estimatedPage = Math.ceil(position / 50);

      // 在估算页附近 ±3 页范围内搜索
      const startPage = Math.max(2, estimatedPage - 3);
      const endPage = Math.min(estimatedPage + 3, 100);

      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        const pageRes = await axios.get(
          'https://bbplanet.bilibili.co/api/planet/comment/commentList',
          {
            params: { articleBusinessId, pageSize: 50, pageNum, order: 1, scrollId: null },
            headers: { ...this.headers, 'x-csrf': `csrf-${Math.random()}`, cookie: this.cookie },
          },
        );
        if (pageRes.data.code !== 0 || !pageRes.data.data?.commentReplyList) break;
        for (const c of pageRes.data.data.commentReplyList) {
          if (c.floorNum === floorNum) {
            return { floorNum: c.floorNum, content: c.content, userName: c.sourceNickname || c.userName || c.nickName };
          }
        }
        if (pageRes.data.data.commentReplyList.length < 50) break;
      }
      return null;
    } catch (error) {
      this.logger.error(`获取评论楼层失败 [${floorNum}]:`, error.response?.data || error.message);
      return null;
    }
  }
}
