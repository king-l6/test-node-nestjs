import { Injectable } from '@nestjs/common';
import axios from 'axios'; // 确保导入 axios
@Injectable()
export class AppService {
  // 大市值量化列表
  async getBigMarketCapList(datesString: string) {
    // 将逗号分隔的日期字符串拆分为数组
    const dates = datesString.split(',');

    // 使用Promise.all并发请求所有日期
    const requests = dates.map((date) => {
      return axios.get(
        'https://prod-web.cloudgn.com/qs_svc/v1/stock_start_rank_f',
        {
          params: {
            date: date.trim(),
            version: 2,
            url: '/qs_svc/v1/stock_start_rank_f',
          },
        },
      );
    });

    // 等待所有请求完成
    const responses = await Promise.all(requests);

    // 合并所有响应数据
    let idCounter = 0; // 初始化idCounter
    const allMergedRecords: any[] = []; // 用于存储所有合并后的记录
    const firstMainBoardStock: any[] = [];
    responses.forEach((response) => {
      if (response.data?.result?.total_count) {
        response.data.result.records.forEach((item: any) => {
          allMergedRecords.push({
            id: ++idCounter,
            stock_name: item.stock_name,
            create_time: item.create_time,
            stock_code: item.stock_code,
            change_rate: item.change_rate,
            open_price: item.open_price,
            price: item.price,
            star1: item.star1,
            star2: item.star2,
            star3: item.star3,
            star4: item.star4,
            star5: item.star5,
          });
        });
        // 用于存储每天第一个主板票信息
        const temp = response.data.result.records.filter((item: any) => {
          return (
            item.stock_code.startsWith('60') || item.stock_code.startsWith('00')
          );
        });

        firstMainBoardStock.push(temp[0]);
      }
    });
    return {
      data: {
        list: allMergedRecords,
        firstMainBoardStock,
        total: allMergedRecords.length,
      },
    }; // 返回合并后的所有记录
  }
  // 5星量化列表
  async getFiveStarsList(datesString: string) {
    // 将逗号分隔的日期字符串拆分为数组
    const dates = datesString.split(',');

    // 使用Promise.all并发请求所有日期
    const requests = dates.map((date) => {
      return axios.get(
        'https://prod-web.cloudgn.com/qs_svc/v1/stock_start_rank',
        {
          params: {
            date: date.trim(),
            version: 2,
            url: '/qs_svc/v1/stock_start_rank',
          },
        },
      );
    });

    // 等待所有请求完成
    const responses = await Promise.all(requests);

    // 合并所有响应数据
    let idCounter = 0; // 初始化idCounter
    const allMergedRecords: any[] = []; // 用于存储所有合并后的记录
    const firstMainBoardStock: any[] = [];
    responses.forEach((response) => {
      if (response.data?.result?.total_count) {
        response.data.result.records.forEach((item: any) => {
          allMergedRecords.push({
            id: ++idCounter,
            stock_name: item.stock_name,
            create_time: item.create_time,
            stock_code: item.stock_code,
            change_rate: item.change_rate,
            open_price: item.open_price,
            total_score: item.total_score,  
            price: item.price,
            star1: item.star1,
            star2: item.star2,
            star3: item.star3,
            star4: item.star4,
            star5: item.star5,
          });
        });
        // 用于存储每天第一个主板票信息
        const temp = response.data.result.records.filter((item: any) => {
          return (
            item.stock_code.startsWith('60') || item.stock_code.startsWith('00')
          );
        });
        // const temp = response.data.result.records;

        firstMainBoardStock.push(temp[0]);
      }
    });
    return {
      data: {
        list: allMergedRecords,
        firstMainBoardStock,
        total: allMergedRecords.length,
      },
    }; // 返回合并后的所有记录
  }
  // 高分量化列表
  async getHighScoreList(datesString: string) {
    // 将逗号分隔的日期字符串拆分为数组
    const dates = datesString.split(',');

    // 使用Promise.all并发请求所有日期
    const requests = dates.map((date) => {
      return axios.get(
        'https://prod-web.cloudgn.com/qs_svc/v1/stock_start_block_score',
        {
          params: {
            date: date.trim(),
            version: 2,
            url: '/qs_svc/v1/stock_start_block_score',
          },
        },
      );
    });

    // 等待所有请求完成
    const responses = await Promise.all(requests);

    // 合并所有响应数据
    let idCounter = 0; // 初始化idCounter
    const allMergedRecords: any[] = []; // 用于存储所有合并后的记录

    responses.forEach((response) => {
      if (response.data?.result?.total_count) {
        response.data.result.records.forEach((item: any) => {
          allMergedRecords.push({
            id: ++idCounter,
            stock_name: item.stock_name,
            create_time: item.create_time,
            stock_code: item.stock_code,
            change_rate: item.change_rate,
            open_price: item.open_price,
            price: item.price,
            star1: item.star1,
            star2: item.star2,
            star3: item.star3,
            star4: item.star4,
            star5: item.star5,
            total_score: item.total_score,
          });
        });
      }
    });
    return {
      data: {
        list: allMergedRecords,
        total: allMergedRecords.length,
      },
    }; // 返回合并后的所有记录
  }

  // 量化分值排名系统列表
  async getScoreRankingList(params: {
    trade_date: string;
    max_score: number;
    min_score: number;
    page_num: number;
    page_size: number;
  }) {
    const res = await axios.post(
      'https://prod-web.cloudgn.com/qs_svc/v1/list_stock_auction_score',
      params,
    );
    console.log('11111111', res, params);
    return {
      data: {
        list: res.data.result.list,
        total: res.data.result.total,
      },
    };
  }
  async sendWechatNotification(message: string): Promise<any> {
    const webhookUrl =
      'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=61b004af-549d-48bb-bf9d-af9ca210f832'; // 替换为您的微信群机器人Webhook URL
    try {
      const response = await axios.post(webhookUrl, {
        msgtype: 'text',
        text: {
          content: message,
        },
      });
      console.log('微信通知发送成功:', response.data);
      return response.data;
    } catch (error) {
      console.error('微信通知发送失败:', error.message);
      throw error;
    }
  }
}
