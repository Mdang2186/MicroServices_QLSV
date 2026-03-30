import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { GpaService } from './gpa.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, PrismaService, GpaService],
})
export class AppModule { }
