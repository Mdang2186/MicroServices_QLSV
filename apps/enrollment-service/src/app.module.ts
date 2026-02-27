import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnrollmentModule } from './enrollment/enrollment.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '../../.env'],
        }),
        EnrollmentModule,
    ],
})
export class AppModule { }
