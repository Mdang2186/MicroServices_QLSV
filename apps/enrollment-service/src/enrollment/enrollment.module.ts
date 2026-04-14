import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceGateway } from './attendance.gateway';

@Module({
    controllers: [EnrollmentController],
    providers: [EnrollmentService, PrismaService, AttendanceGateway],
})
export class EnrollmentModule { }
