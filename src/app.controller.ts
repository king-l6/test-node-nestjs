import { Controller, Get, Param, Redirect } from '@nestjs/common';
import { ArticleScanner } from './tasks/article-scanner';

@Controller()
export class AppController {
  constructor(private readonly articleScanner: ArticleScanner) {}

  @Get()
  @Redirect('/monitor.html')
  root() {}

  @Get('api/monitor')
  getMonitorStatus() {
    return this.articleScanner.getMonitorStatus();
  }

  @Get('api/monitor/add-floor/:floorNum')
  addTargetFloor(@Param('floorNum') floorNum: string) {
    this.articleScanner.addManualTargetFloor(parseInt(floorNum, 10));
    return { success: true, floorNum: parseInt(floorNum, 10) };
  }
}
