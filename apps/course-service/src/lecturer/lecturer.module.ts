
import { Module } from '@nestjs/common';
import { LecturerService } from './lecturer.service';
import { LecturerController } from './lecturer.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [LecturerService],
    controllers: [LecturerController],
    exports: [LecturerService]
})
export class LecturerModule { }
