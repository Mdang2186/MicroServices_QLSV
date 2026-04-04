import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { DepartmentModule } from './department/department.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '../../.env'],
        }),
        PrismaModule, 
        CacheModule, 
        MajorModule, 
        SubjectModule, 
        CourseClassModule, 
        AdminClassModule, 
        SemesterModule, 
        LecturerModule, 
        RoomModule, 
        FacultyModule, 
        DepartmentModule
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
