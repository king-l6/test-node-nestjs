import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get('/quantify/bigMarket')
  async getBigMarketCap(@Query('dates') dates: string) {
    return this.appService.getBigMarketCapList(dates);
  }

  @Get('/quantify/stars')
  async getFiveStars(@Query('dates') dates: string) {
    return this.appService.getFiveStarsList(dates);
  }
  @Get('/quantify/highScore')
  async getHighScore(@Query('dates') dates: string) {
    return this.appService.getHighScoreList(dates);
  }

  @Post('/quantify/scoreRanking')
  async getScoreRanking(
    @Body()
    params: {
      trade_date: string;
      max_score: number;
      min_score: number;
      page_num: number;
      page_size: number;
    },
  ) {
    return this.appService.getScoreRankingList(params);
  }

  // @Controller()
  // export class AppController {
  //   constructor(private readonly wechatTask: WechatTask) {}

  //   @Get('/test-wechat-task')
  //   async testWechatTask() {
  //     await this.wechatTask.sendNameToWechat();
  //     return { message: '手动触发成功' };
  //   }
  // }
}
