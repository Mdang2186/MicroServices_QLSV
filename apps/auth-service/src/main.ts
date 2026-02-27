import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Also enable Microservice for gRPC or TCP if needed, but for MVP we might just use HTTP or hybrid
  // defined in Transport. For now, let's expose HTTP for debugging and inter-service via HTTP
  // or setup Microservice listener

  // Example Microservice setup
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3011
    }
  });

  await app.startAllMicroservices();
  await app.listen(3001, '0.0.0.0'); // Auth Service runs on 3001
  console.log(`Auth Service is running on: ${await app.getUrl()}`);
}
bootstrap();
