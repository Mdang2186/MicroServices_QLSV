import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // [NEW] Enable CORS

  const config = new DocumentBuilder()
    .setTitle('Student Service API')
    .setVersion('1.0')
    .addServer('/api')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('students/docs', app, document);

  // Student Service runs on 3002
  await app.listen(3002, '0.0.0.0');
  console.log(`Student Service is running on: ${await app.getUrl()}`);
}
bootstrap();
