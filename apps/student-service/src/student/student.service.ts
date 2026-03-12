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
    let finalUserId = studentData.userId;
    
    // Auto-create a linked user account if not provided via Gateway/Auth
    if (!finalUserId) {
      const crypto = require('crypto');
      const mockPassword = crypto.randomBytes(8).toString('hex');
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(mockPassword, 10);
      
      const newUser = await this.prisma.user.create({
        data: {
          username: studentData.studentCode || email.split('@')[0],
          email: email,
          passwordHash: passwordHash,
          role: 'STUDENT'
        }
      });
      finalUserId = newUser.id;
    }

    return this.prisma.student.create({
      data: {
        ...studentData,
        userId: finalUserId,
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
    const student = await this.prisma.student.findUnique({ where: { id }, include: { user: true } });
    if (!student) throw new Error("Student not found");

    const { dob, email, studentCode, ...rest } = dto;

    // Update linked user if email changed
    if (email && email !== student.user.email) {
      await this.prisma.user.update({
        where: { id: student.userId },
        data: {
          email: email,
          username: studentCode || student.user.username
        }
      });
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        ...rest,
        studentCode,
        dob: dob ? new Date(dob) : undefined,
      },
      include: { user: true }
    }) as unknown as StudentResponse;
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) return null;
    // Delete the user record, which will cascade delete the student profile
    return this.prisma.user.delete({ where: { id: student.userId } });
  }
}
