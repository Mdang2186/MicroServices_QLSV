import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateStudentDto,
  UpdateStudentDto,
  StudentResponse,
} from "@repo/shared-dto";

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);
  constructor(private prisma: PrismaService) { }


  async create(dto: CreateStudentDto): Promise<StudentResponse> {
    const { email, ...studentData } = dto;
    if (!studentData.userId) {
      throw new Error("UserId is required to create a Student");
    }
    return this.prisma.student.create({
      data: {
        ...studentData,
        userId: studentData.userId,
        dob: new Date(dto.dob),
      },
      include: { user: true }
    }) as unknown as StudentResponse;
  }

  async findAll(): Promise<StudentResponse[]> {
    return this.prisma.student.findMany() as unknown as StudentResponse[];
  }

  async findOne(id: string): Promise<StudentResponse | null> {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        major: true,
        enrollments: {
          include: {
            courseClass: {
              include: {
                subject: true,
                schedules: true,
                lecturer: true
              }
            }
          }
        },
        grades: {
          include: {
            subject: true,
            courseClass: true
          }
        }
      }
    }) as unknown as StudentResponse | null;
  }

  async findByUserId(userId: string): Promise<StudentResponse | null> {
    return this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: true,
        major: true,
        enrollments: {
          include: {
            courseClass: {
              include: {
                subject: true,
                schedules: true,
                lecturer: true
              }
            }
          }
        },
        grades: {
          include: {
            subject: true,
            courseClass: true
          }
        }
      }
    }) as unknown as StudentResponse | null;
  }

  async update(id: string, dto: UpdateStudentDto): Promise<StudentResponse> {
    const { dob, ...rest } = dto;
    return this.prisma.student.update({
      where: { id },
      data: {
        ...rest,
        dob: dob ? new Date(dob) : undefined,
      },
    }) as unknown as StudentResponse;
  }
}
