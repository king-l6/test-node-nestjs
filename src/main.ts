import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WechatTask } from './tasks/wechat.task'; // 导入 WechatTask

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
