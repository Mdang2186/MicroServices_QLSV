import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { MajorModule } from './major/major.module';
import { CourseClassModule } from './course-class/course-class.module';
import { AdminClassModule } from './admin-class/admin-class.module';
import { SemesterModule } from './semester/semester.module';
import { LecturerModule } from './lecturer/lecturer.module';
import { RoomModule } from './room/room.module';
import { SubjectModule } from './subject/subject.module';
import { FacultyModule } from './faculty/faculty.module';

@Module({
    imports: [PrismaModule, CacheModule, MajorModule, SubjectModule, CourseClassModule, AdminClassModule, SemesterModule, LecturerModule, RoomModule, FacultyModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
