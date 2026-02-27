import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    // Enrollment Service runs on 3004
    await app.listen(3004, '0.0.0.0');
    console.log(`Enrollment Service is running on: ${await app.getUrl()}`);
}
bootstrap();
