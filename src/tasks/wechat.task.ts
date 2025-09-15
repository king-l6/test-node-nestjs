import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppService } from '../app.service';
import * as dayjs from 'dayjs';

@Injectable()
export class WechatTask {
  private readonly logger = new Logger(WechatTask.name);

  constructor(private readonly appService: AppService) {}

  @Cron('0,30 28,29 9 * * *')
  // @Cron('* * * * * *')  // 每分钟触发
  async handleCron() {
    this.logger.debug('Called every day at 8 AM');
    try {
      // 示例：获取数据并构建消息
      const data = await this.appService.getFiveStarsList(
        dayjs().format('YYYY-MM-DD'),
      );
      let notificationMessage = dayjs().format('YYYY-MM-DD') + '：\n';
      if (data && data.data && data.data.list && data.data.list.length > 0) {
        data.data.list.forEach((item: any) => {
          if (
            item.stock_code.startsWith('00') ||
            item.stock_code.startsWith('60')
          ) {
            notificationMessage += `🔴 代码: ${item.stock_code}, 名称: ${item.stock_name}\n`;
          } else {
            notificationMessage += `代码: ${item.stock_code}, 名称: ${item.stock_name}\n`;
          }
        });
      } else {
        notificationMessage += '暂无数据。';
      }

      // 发送微信通知
      await this.appService.sendWechatNotification(notificationMessage);
      this.logger.log('微信通知发送完成。');
    } catch (error) {
      this.logger.error('定时任务执行失败:', error.message);
    }
  }
}
