import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StudentModule } from "./student/student.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { TuitionModule } from "./tuition/tuition.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    StudentModule,
    DashboardModule,
    TuitionModule,
    PrismaModule,
  ],
})
export class AppModule {}
