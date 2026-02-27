
import { Module } from '@nestjs/common';
import { CourseClassService } from './course-class.service';
import { CourseClassController } from './controllers/course-class.controller';
import { CourseClassAdminController } from './controllers/course-class.admin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CourseClassController, CourseClassAdminController],
    providers: [CourseClassService],
    exports: [CourseClassService],
})
export class CourseClassModule { }
