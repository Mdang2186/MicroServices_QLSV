import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ClassScheduleDto {
  @IsOptional()
  @IsString()
  roomId?: string;

  @IsNotEmpty()
  @IsNumber()
  dayOfWeek: number;

  @IsNotEmpty()
  @IsNumber()
  startShift: number;

  @IsNotEmpty()
  @IsNumber()
  endShift: number;

  @IsOptional()
  @IsString()
  @IsIn(['THEORY', 'PRACTICE'])
  type?: string;
}

export class CreateCourseClassDto {
  @IsNotEmpty()
  @IsString()
  subjectId: string;

  @IsNotEmpty()
  @IsString()
  semesterId: string;

  @IsOptional()
  @IsString()
  lecturerId?: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  maxSlots?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adminClassIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassScheduleDto)
  schedules?: ClassScheduleDto[];
}
