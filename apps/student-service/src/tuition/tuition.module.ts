import { Module } from "@nestjs/common";
import { TuitionController } from "./tuition.controller";
import { StudentFeeController } from "./student-fee.controller";
import { TuitionService } from "./tuition.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [TuitionController, StudentFeeController],
  providers: [TuitionService],
  exports: [TuitionService],
})
export class TuitionModule {}
