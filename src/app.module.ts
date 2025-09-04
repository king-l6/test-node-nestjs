import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitorService } from './monitor/monitor.service';
import { MonitorTask } from './monitor/monitor.task';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot()
  ],
  providers: [
    MonitorService,
    MonitorTask
  ]
})
export class AppModule {}
