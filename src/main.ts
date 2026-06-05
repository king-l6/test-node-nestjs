import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`\n========================================`);
  console.log(`盖楼监控面板已启动: http://localhost:${port}`);
  console.log(`API 接口: http://localhost:${port}/api/monitor`);
  console.log(`========================================\n`);
}
bootstrap();
