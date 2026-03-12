import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const config = new DocumentBuilder()
      .setTitle('Enrollment Service API')
      .setVersion('1.0')
      .addServer('/api')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('enrollments/docs', app, document);

    // Enrollment Service runs on 3004
    await app.listen(3004, '0.0.0.0');
    console.log(`Enrollment Service is running on: ${await app.getUrl()}`);
}
bootstrap();
