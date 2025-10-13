import { Injectable } from '@nestjs/common';
import axios from 'axios'; // 确保导入 axios
import * as dayjs from 'dayjs';
import { max } from 'radash';
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
        list: allMergedRecords.filter(
          (item) =>
            item.stock_code.startsWith('60') ||
            item.stock_code.startsWith('00'),
        ),
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
            total_score: item.total_score,
          });
        });
        const temp = max(
          response.data.result.records.filter(
            (item: any) =>
              item.stock_code.startsWith('60') ||
              item.stock_code.startsWith('00'),
          ),
          (item: any) => item.total_score,
        );
        // const temp = response.data.result.records;

        firstMainBoardStock.push(temp);
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

  // 获取两个列表中每天重叠的股票信息
  async getOverlappingStocks(datesString: string) {
    try {
      // 获取5星量化列表和高分量化列表
      const fiveStarsResult = await this.getFiveStarsList(datesString);
      const highScoreResult = await this.getHighScoreList(datesString);

      // 将逗号分隔的日期字符串拆分为数组
      const dates = datesString.split(',');

      // 按日期和股票代码分组
      const fiveStarsMap = new Map();
      const highScoreMap = new Map();

      // 处理5星量化列表数据，按日期和股票代码分组
      if (fiveStarsResult?.data?.list) {
        fiveStarsResult.data.list.forEach((item: any) => {
          if (item?.create_time && item?.stock_code) {
            // 使用字符串处理替代dayjs
            const date = dayjs(item.create_time).format('YYYY-MM-DD'); // 提取YYYY-MM-DD部分
            const key = `${date}_${item.stock_code}`;
            fiveStarsMap.set(key, item);
          }
        });
      }
      // 处理高分量化列表数据，按日期和股票代码分组
      if (highScoreResult?.data?.list) {
        highScoreResult.data.list.forEach((item: any) => {
          if (item?.create_time && item?.stock_code) {
            const date = dayjs(item.create_time).format('YYYY-MM-DD'); // 提取YYYY-MM-DD部分
            const key = `${date}_${item.stock_code}`;
            highScoreMap.set(key, item);
          }
        });
      }

      // 找出重叠的股票
      const overlappingStocks: any[] = [];
      let idCounter = 0;

      // 按日期组织结果
      const resultByDate: Record<string, any[]> = {};
      dates.forEach((date) => {
        const trimmedDate = date.trim();
        resultByDate[trimmedDate] = [];
      });

      // 遍历5星量化列表的所有键，检查是否在高分量化列表中存在
      for (const [key, fiveStarsItem] of fiveStarsMap.entries()) {
        if (highScoreMap.has(key)) {
          const highScoreItem = highScoreMap.get(key);
          console.log(`Found overlapping stock`, highScoreItem);
          const date = fiveStarsItem.create_time;

          // 合并两个列表中的数据，统一使用五星量化的数据，只保留高分量化的总分
          const mergedItem = {
            id: ++idCounter,
            stock_name: fiveStarsItem.stock_name,
            stock_code: fiveStarsItem.stock_code,
            create_time: fiveStarsItem.create_time,
            date: date,
            // 使用五星量化的所有数据
            change_rate: fiveStarsItem.change_rate,
            open_price: fiveStarsItem.open_price,
            price: fiveStarsItem.price,
            total_score: fiveStarsItem.total_score,
            star1: fiveStarsItem.star1,
            star2: fiveStarsItem.star2,
            star3: fiveStarsItem.star3,
            star4: fiveStarsItem.star4,
            star5: fiveStarsItem.star5,
            // 只保留高分量化的总分
            high_score_total_score: highScoreItem.total_score,
          };

          overlappingStocks.push(mergedItem);

          // 将结果添加到对应日期的数组中
          const trimmedDate = date;
          if (resultByDate[trimmedDate]) {
            resultByDate[trimmedDate].push(mergedItem);
          }
        }
      }

      return {
        data: {
          list: overlappingStocks,
          total: overlappingStocks.length,
        },
      };
    } catch (error) {
      console.error('获取重叠股票数据出错:', error);
      return {
        data: {
          list: [],
          total: 0,
        },
      };
    }
  }
}
