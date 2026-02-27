import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MajorModule } from './major/major.module';
import { CourseClassModule } from './course-class/course-class.module';

@Module({
  imports: [PrismaModule, MajorModule, CourseClassModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
