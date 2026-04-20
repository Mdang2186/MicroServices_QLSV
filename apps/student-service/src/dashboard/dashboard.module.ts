import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TuitionModule } from "../tuition/tuition.module";

@Module({
  imports: [PrismaModule, TuitionModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
