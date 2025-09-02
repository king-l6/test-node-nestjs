import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [AppService], // 确保AppService和WechatTask都在providers中
  exports: [AppService], // 添加这行导出AppService
})
export class AppModule {}
