import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { log } from 'console';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/quantify/stars')
  async getFiveStars(@Query('dates') dates: string) {
    return this.appService.getFiveStarsList(dates);
  }
  @Get('/quantify/highScore')
  async getHighScore(@Query('dates') dates: string) {
    return this.appService.getHighScoreList(dates);
  }

  @Post('/quantify/scoreRanking')
  async getScoreRanking(@Body() params: {
    trade_date: string;
    max_score: number;
    min_score: number;
    page_num: number;
    page_size: number;
  }) {
    return this.appService.getScoreRankingList(params);
  }
}
