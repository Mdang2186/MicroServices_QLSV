
import { Module } from '@nestjs/common';
import { AdminClassService } from './admin-class.service';
import { AdminClassController } from './admin-class.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [AdminClassService],
    controllers: [AdminClassController],
    exports: [AdminClassService]
})
export class AdminClassModule { }
