import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AcademicCohortController } from './academic-cohort.controller';
import { AcademicCohortService } from './academic-cohort.service';

@Module({
  imports: [PrismaModule],
  controllers: [AcademicCohortController],
  providers: [AcademicCohortService],
  exports: [AcademicCohortService],
})
export class AcademicCohortModule {}
