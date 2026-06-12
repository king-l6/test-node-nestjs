import { Controller, Get, Param, Redirect } from '@nestjs/common';
import { ArticleScanner } from './tasks/article-scanner';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly articleScanner: ArticleScanner,
    private readonly appService: AppService,
  ) {}

  @Get()
  root() {
    return { message: '盖楼监控面板: /monitor.html' };
  }

  @Get('api/monitor')
  getMonitorStatus() {
    return this.articleScanner.getMonitorStatus();
  }

  @Get('api/monitor/add-floor/:floorNum')
  addTargetFloor(@Param('floorNum') floorNum: string) {
    this.articleScanner.addManualTargetFloor(parseInt(floorNum, 10));
    return { success: true, floorNum: parseInt(floorNum, 10) };
  }

  @Get('api/verify')
  async verifyAll() {
    return this.articleScanner.verifyAllGrabs();
  }

  @Get('api/records')
  getGrabRecords() {
    return this.articleScanner.getGrabRecords();
  }

  @Get('api/user')
  async getUserInfo() {
    return this.appService.getUserInfo();
  }
}
