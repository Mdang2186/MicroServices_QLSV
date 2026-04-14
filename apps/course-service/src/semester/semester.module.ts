import { Module } from '@nestjs/common';
import { SemesterService } from './semester.service';
import { SemesterController } from './semester.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SemesterService],
  controllers: [SemesterController],
  exports: [SemesterService],
})
export class SemesterModule {}
