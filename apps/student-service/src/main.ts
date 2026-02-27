import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // [NEW] Enable CORS
  // Student Service runs on 3002
  await app.listen(3002, '0.0.0.0');
  console.log(`Student Service is running on: ${await app.getUrl()}`);
}
bootstrap();
