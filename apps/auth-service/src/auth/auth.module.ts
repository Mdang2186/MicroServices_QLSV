import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { PrismaService } from "../prisma/prisma.service";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { MailerModule } from "@nestjs-modules/mailer";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET") || "supersecretkey",
        signOptions: { expiresIn: "60m" },
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>("SMTP_HOST"),
          port: Number(configService.get("SMTP_PORT") || 587),
          secure: false, // true for 465, false for other ports
          auth: {
            user: configService.get<string>("SMTP_USER"),
            pass: configService.get<string>("SMTP_PASS"),
          },
        },
        defaults: {
          from: `"No Reply" <${configService.get<string>("MAIL_FROM")}>`,
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  providers: [AuthService, NotificationService, PrismaService, JwtStrategy],
  controllers: [AuthController, NotificationController],
  exports: [AuthService, NotificationService],
})
export class AuthModule { }
