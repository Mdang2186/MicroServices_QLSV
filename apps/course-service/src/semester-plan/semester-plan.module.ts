import { Module } from '@nestjs/common';
import { SemesterPlanService } from './semester-plan-v2.service';
import { SemesterPlanController } from './semester-plan.controller';
import { EMSController } from './ems.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SemesterPlanController, EMSController],
  providers: [SemesterPlanService],
  exports: [SemesterPlanService],
})
export class SemesterPlanModule {}
