import { Module } from '@nestjs/common';
import { FacultyService } from './faculty.service';
import { FacultyController } from './faculty.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FacultyService],
  controllers: [FacultyController],
  exports: [FacultyService],
})
export class FacultyModule {}
