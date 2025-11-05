import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BuildingTower } from './tasks/building-tower';
import { WechatTask } from './tasks/wechat.task'; // 导入 WechatTask

@Module({
  imports: [ScheduleModule.forRoot()], // 导入 ScheduleModule
  controllers: [AppController],
  providers: [AppService, WechatTask, BuildingTower], // 将 WechatTask 添加到 providers
})
export class AppModule {}
