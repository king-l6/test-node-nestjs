import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BuildingTower } from './tasks/building-tower';
import { ArticleScanner } from './tasks/article-scanner';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
    }),
  ],
  controllers: [AppController],
  providers: [AppService, BuildingTower, ArticleScanner, NotificationService],
})
export class AppModule {}
