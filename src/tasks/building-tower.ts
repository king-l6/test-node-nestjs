import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppService } from '../app.service';

@Injectable()
export class BuildingTower {
  private readonly logger = new Logger(BuildingTower.name);

  constructor(private readonly appService: AppService) {}

  @Cron('1 * * * * *')
  async handleCron() {
    try {
      // 示例：获取数据并构建消息
      const data = await this.appService.getBuildingTowerCommentList();
      this.logger.log(
        '获取同事吧评论数据:',
        JSON.stringify(data.commentReplyList[0].floorNum),
      );
      const floorNumList = [22, 33, 233];
      floorNumList.forEach((floorNum) => {
        if (
          floorNum - 10 <= data.commentReplyList[0].floorNum &&
          data.commentReplyList[0].floorNum <= floorNum
        ) {
          this.appService.sendBuildingTowerComment();
        }
      });

      // 发送微信通知
    } catch (error) {
      this.logger.error('定时任务执行失败:', error.message);
    }
  }
}
