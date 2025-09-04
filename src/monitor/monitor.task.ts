import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MonitorService } from './monitor.service';

@Injectable()
export class MonitorTask {
  constructor(private readonly monitorService: MonitorService) {}

  @Cron('*/5 * * * * *') // 每5秒检查一次
  async handleCron() {
    await this.monitorService.checkAndTrigger();
  }
}