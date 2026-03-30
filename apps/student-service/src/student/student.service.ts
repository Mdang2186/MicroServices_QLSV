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
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStudentDto): Promise<StudentResponse> {
    const {
      email,
      majorId,
      userId,
      dob,
      status,
      gpa,
      cpa,
      totalEarnedCredits,
      admissionDate,
      idIssueDate,
      youthUnionDate,
      partyDate,
      adminClassId,
      specializationId,
      ...studentData
    } = dto;

    return this.prisma.student.create({
      data: {
        ...studentData,
        major: { connect: { id: majorId } },
        ...(adminClassId
          ? { adminClass: { connect: { id: adminClassId } } }
          : {}),
        ...(specializationId
          ? { specialization: { connect: { id: specializationId } } }
          : {}),
        user: userId ? { connect: { id: userId } } : undefined,
        dob: new Date(dob),
        status: status || "STUDYING",
        gpa: gpa ?? 0.0,
        cpa: cpa ?? 0.0,
        totalEarnedCredits: totalEarnedCredits ?? 0,
        warningLevel: dto.warningLevel ?? 0,
        academicStatus: dto.academicStatus || "NORMAL",
        admissionDate: admissionDate ? new Date(admissionDate) : undefined,
        idIssueDate: idIssueDate ? new Date(idIssueDate) : undefined,
        youthUnionDate: youthUnionDate ? new Date(youthUnionDate) : undefined,
        partyDate: partyDate ? new Date(partyDate) : undefined,
      },
      include: {
        user: true,
        specialization: true,
        adminClass: true,
        major: true,
      },
    }) as unknown as StudentResponse;
  }

  async findAll(): Promise<StudentResponse[]> {
    return this.prisma.student.findMany({
      include: {
        user: true,
        major: true,
        specialization: true,
        adminClass: true,
      },
    }) as unknown as StudentResponse[];
  }

  async findOne(id: string): Promise<StudentResponse | null> {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        major: true,
        specialization: true,
        enrollments: {
          include: {
            courseClass: {
              include: {
                subject: true,
                schedules: {
                  include: { room: true },
                },
                lecturer: true,
              },
            },
            attendances: true,
          },
        },
        grades: {
          include: {
            subject: true,
            courseClass: true,
          },
        },
      },
    }) as unknown as StudentResponse | null;
  }

  async findByUserId(userId: string): Promise<StudentResponse | null> {
    return this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: true,
        major: true,
        specialization: true,
        enrollments: {
          include: {
            courseClass: {
              include: {
                subject: true,
                schedules: {
                  include: { room: true },
                },
                lecturer: true,
              },
            },
            attendances: true,
          },
        },
        grades: {
          include: {
            subject: true,
            courseClass: true,
          },
        },
      },
    }) as unknown as StudentResponse | null;
  }

  async update(id: string, dto: UpdateStudentDto): Promise<StudentResponse> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!student) throw new Error("Student not found");

    const {
      dob,
      email,
      studentCode,
      majorId,
      admissionDate,
      idIssueDate,
      youthUnionDate,
      partyDate,
      adminClassId,
      specializationId,
      ...rest
    } = dto;

    // Update linked user if email changed and user exists
    if (email && student.user && email !== student.user.email) {
      await this.prisma.user.update({
        where: { id: student.userId! },
        data: {
          email: email,
          username: studentCode || student.user.username,
        },
      });
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        fullName: rest.fullName,
        phone: rest.phone,
        address: rest.address,
        gender: rest.gender,
        citizenId: rest.citizenId,
        emailPersonal: rest.emailPersonal,
        idIssuePlace: rest.idIssuePlace,
        campus: rest.campus,
        educationLevel: rest.educationLevel,
        educationType: rest.educationType,
        intake: rest.intake,
        ethnicity: rest.ethnicity,
        religion: rest.religion,
        nationality: rest.nationality,
        region: rest.region,
        policyBeneficiary: rest.policyBeneficiary,
        birthPlace: rest.birthPlace,
        permanentAddress: rest.permanentAddress,
        bankName: rest.bankName,
        bankBranch: rest.bankBranch,
        bankAccountName: rest.bankAccountName,
        bankAccountNumber: rest.bankAccountNumber,
        status: rest.status,
        gpa: rest.gpa,
        cpa: rest.cpa,
        totalEarnedCredits: rest.totalEarnedCredits,
        warningLevel: rest.warningLevel,
        academicStatus: rest.academicStatus,
        studentCode,
        major: majorId ? { connect: { id: majorId } } : undefined,
        adminClass: adminClassId
          ? { connect: { id: adminClassId } }
          : undefined,
        specialization: specializationId
          ? { connect: { id: specializationId } }
          : undefined,
        dob: dob && !isNaN(Date.parse(dob)) ? new Date(dob) : undefined,
        admissionDate:
          admissionDate && !isNaN(Date.parse(admissionDate))
            ? new Date(admissionDate)
            : undefined,
        idIssueDate:
          idIssueDate && !isNaN(Date.parse(idIssueDate))
            ? new Date(idIssueDate)
            : undefined,
        youthUnionDate:
          youthUnionDate && !isNaN(Date.parse(youthUnionDate))
            ? new Date(youthUnionDate)
            : undefined,
        partyDate:
          partyDate && !isNaN(Date.parse(partyDate))
            ? new Date(partyDate)
            : undefined,
      },
      include: {
        user: true,
        specialization: true,
        adminClass: true,
        major: true,
      },
    }) as unknown as StudentResponse;
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) return null;

    if (student.userId) {
      // Delete the user record, which will cascade delete the student profile
      return this.prisma.user.delete({ where: { id: student.userId } });
    } else {
      // Just delete the student profile
      return this.prisma.student.delete({ where: { id } });
    }
  }
}
