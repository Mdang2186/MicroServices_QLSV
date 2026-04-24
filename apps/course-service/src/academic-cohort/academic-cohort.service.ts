import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_COHORTS = [
  { code: 'K17', startYear: 2023, endYear: 2027, isActive: true },
  { code: 'K18', startYear: 2024, endYear: 2028, isActive: true },
  { code: 'K19', startYear: 2025, endYear: 2029, isActive: true },
  { code: 'K20', startYear: 2026, endYear: 2030, isActive: true },
  { code: 'K21', startYear: 2027, endYear: 2031, isActive: true },
  { code: 'K22', startYear: 2028, endYear: 2032, isActive: true },
];

@Injectable()
export class AcademicCohortService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly migrationHint =
    'CSDL chưa có bảng AcademicCohort. Hãy chạy script packages/database/prisma/training-plan-module-migration.sql.';

  private isStorageError(error: any) {
    const code = `${error?.code || ''}`;
    const message = `${error?.message || ''}`;
    return (
      code === 'P2021' ||
      code === 'P2022' ||
      /AcademicCohort/i.test(message) ||
      /Invalid object name/i.test(message)
    );
  }

  private mergeWithDefaults(items: any[]) {
    const merged = new Map<string, any>();

    [...DEFAULT_COHORTS, ...(items || [])].forEach((item: any) => {
      merged.set(item.code, {
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        ...merged.get(item.code),
        ...item,
      });
    });

    return [...merged.values()].sort(
      (left, right) => left.startYear - right.startYear,
    );
  }

  async findAll() {
    try {
      const cohorts = await (this.prisma as any).academicCohort.findMany({
        orderBy: { startYear: 'asc' },
      });

      return this.mergeWithDefaults(cohorts);
    } catch (error) {
      console.warn(
        'AcademicCohortService.findAll fallback to defaults:',
        (error as Error)?.message,
      );
    }

    return DEFAULT_COHORTS;
  }

  async create(data: any) {
    const code = `${data?.code || ''}`.trim().toUpperCase();
    const startYear = Number(data?.startYear);
    const endYear = Number(data?.endYear || startYear + 4);

    if (!code) {
      throw new BadRequestException('Mã khóa sinh viên không được để trống.');
    }
    if (!Number.isInteger(startYear) || startYear < 2000) {
      throw new BadRequestException('Năm bắt đầu của khóa không hợp lệ.');
    }
    if (!Number.isInteger(endYear) || endYear < startYear) {
      throw new BadRequestException('Năm kết thúc của khóa không hợp lệ.');
    }

    try {
      const cohort = await (this.prisma as any).academicCohort.create({
        data: {
          code,
          startYear,
          endYear,
          isActive: data?.isActive ?? true,
        },
      });

      // Auto-generate 8 standard semesters
      if (data?.autoGenerateSemesters !== false) {
        await this.generateStandardSemesters(code, startYear);
      }

      return cohort;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(`Khóa ${code} đã tồn tại.`);
      }
      if (this.isStorageError(error)) {
        throw new BadRequestException(this.migrationHint);
      }
      throw error;
    }
  }

  private async generateStandardSemesters(
    cohortCode: string,
    startYear: number,
  ) {
    for (let i = 0; i < 4; i++) {
      const yearStart = startYear + i;
      const yearEnd = yearStart + 1;
      const academicYearLabel = `${yearStart}-${yearEnd}`;
      const firstSemesterNumber = i * 2 + 1;
      const secondSemesterNumber = i * 2 + 2;

      // Semester 1: Sep to Jan
      const firstSemester = await this.createSemesterSafe({
        name: `HK${firstSemesterNumber} - Năm ${i + 1} (${academicYearLabel})`,
        code: `${cohortCode}_HK${firstSemesterNumber}`,
        year: yearStart,
        startDate: new Date(`${yearStart}-09-01`),
        endDate: new Date(`${yearEnd}-01-20`),
        semesterNumber: firstSemesterNumber,
      });
      await this.createCohortSemesterSafe({
        cohortCode,
        semester: firstSemester,
        semesterNumber: firstSemesterNumber,
        studyYear: i + 1,
        academicYear: academicYearLabel,
        label: `HK${firstSemesterNumber} - Năm ${i + 1} (${academicYearLabel})`,
        startDate: new Date(`${yearStart}-09-01`),
        endDate: new Date(`${yearEnd}-01-20`),
      });

      // Semester 2: Feb to Jun
      const secondSemester = await this.createSemesterSafe({
        name: `HK${secondSemesterNumber} - Năm ${i + 1} (${academicYearLabel})`,
        code: `${cohortCode}_HK${secondSemesterNumber}`,
        year: yearEnd,
        startDate: new Date(`${yearEnd}-02-01`),
        endDate: new Date(`${yearEnd}-06-30`),
        semesterNumber: secondSemesterNumber,
      });
      await this.createCohortSemesterSafe({
        cohortCode,
        semester: secondSemester,
        semesterNumber: secondSemesterNumber,
        studyYear: i + 1,
        academicYear: academicYearLabel,
        label: `HK${secondSemesterNumber} - Năm ${i + 1} (${academicYearLabel})`,
        startDate: new Date(`${yearEnd}-02-01`),
        endDate: new Date(`${yearEnd}-06-30`),
      });
    }
  }

  private async createSemesterSafe(data: any) {
    try {
      return await this.prisma.semester.upsert({
        where: { code: data.code },
        update: data,
        create: data,
      });
    } catch (error) {
      console.warn(`Failed to auto-generate semester ${data.code}:`, error);
      return null;
    }
  }

  private async createCohortSemesterSafe(data: {
    cohortCode: string;
    semester: any;
    semesterNumber: number;
    studyYear: number;
    academicYear: string;
    label: string;
    startDate: Date;
    endDate: Date;
  }) {
    if (!data.semester?.id) return null;

    try {
      return await (this.prisma as any).cohortSemester.upsert({
        where: {
          cohortCode_semesterNumber: {
            cohortCode: data.cohortCode,
            semesterNumber: data.semesterNumber,
          },
        },
        update: {
          semesterId: data.semester.id,
          studyYear: data.studyYear,
          academicYear: data.academicYear,
          label: data.label,
          startDate: data.startDate,
          endDate: data.endDate,
        },
        create: {
          id: `CS_${data.cohortCode}_HK${data.semesterNumber}`.slice(0, 50),
          cohortCode: data.cohortCode,
          semesterId: data.semester.id,
          semesterNumber: data.semesterNumber,
          studyYear: data.studyYear,
          academicYear: data.academicYear,
          label: data.label,
          startDate: data.startDate,
          endDate: data.endDate,
          isCurrent: Boolean(data.semester.isCurrent),
          isRegistering: Boolean(data.semester.isRegistering),
          registerStartDate: data.semester.registerStartDate,
          registerEndDate: data.semester.registerEndDate,
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      console.warn(
        `Failed to auto-generate cohort semester ${data.cohortCode} HK${data.semesterNumber}:`,
        (error as Error)?.message || error,
      );
      return null;
    }
  }

  async getSemesters(code: string) {
    const cohortCode = `${code || ''}`.trim().toUpperCase();
    if (!cohortCode) {
      throw new BadRequestException('Mã khóa sinh viên không được để trống.');
    }

    try {
      const rows = await (this.prisma as any).cohortSemester.findMany({
        where: { cohortCode, status: 'ACTIVE' },
        include: { semester: true },
        orderBy: { semesterNumber: 'asc' },
      });

      if (rows.length > 0) {
        return rows;
      }
    } catch (error) {
      console.warn(
        `AcademicCohortService.getSemesters fallback for ${cohortCode}:`,
        (error as Error)?.message,
      );
    }

    const cohort = await (this.prisma as any).academicCohort.findFirst({
      where: { code: cohortCode },
    });
    if (!cohort) return [];

    return this.prisma.semester.findMany({
      where: {
        startDate: { gte: new Date(`${cohort.startYear}-08-01`) },
        endDate: { lte: new Date(`${cohort.endYear}-08-31`) },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async update(code: string, data: any) {
    const nextCode = `${data?.code || code}`.trim().toUpperCase();
    const startYear =
      data?.startYear !== undefined ? Number(data.startYear) : undefined;
    const endYear =
      data?.endYear !== undefined ? Number(data.endYear) : undefined;

    try {
      const existing = await (this.prisma as any).academicCohort.findFirst({
        where: { code },
      });

      if (!existing) {
        throw new NotFoundException('Khóa sinh viên không tồn tại.');
      }

      if (!nextCode) {
        throw new BadRequestException('Mã khóa sinh viên không được để trống.');
      }
      if (
        startYear !== undefined &&
        (!Number.isInteger(startYear) || startYear < 2000)
      ) {
        throw new BadRequestException('Năm bắt đầu của khóa không hợp lệ.');
      }
      if (
        endYear !== undefined &&
        (!Number.isInteger(endYear) ||
          endYear < (startYear ?? existing.startYear))
      ) {
        throw new BadRequestException('Năm kết thúc của khóa không hợp lệ.');
      }

      return await (this.prisma as any).academicCohort.update({
        where: { code },
        data: {
          code: nextCode,
          startYear,
          endYear,
          isActive:
            data?.isActive === undefined ? undefined : Boolean(data.isActive),
        },
      });
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error?.code === 'P2002') {
        throw new BadRequestException(`Khóa ${nextCode} đã tồn tại.`);
      }
      if (this.isStorageError(error)) {
        throw new BadRequestException(this.migrationHint);
      }
      throw error;
    }
  }

  async delete(code: string) {
    try {
      const existing = await (this.prisma as any).academicCohort.findFirst({
        where: { code },
      });
      if (!existing) {
        throw new NotFoundException('Khóa sinh viên không tồn tại.');
      }

      return await (this.prisma as any).academicCohort.delete({
        where: { code },
      });
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error?.code === 'P2003') {
        throw new BadRequestException(
          'Không thể xóa khóa này vì đã có dữ liệu kế hoạch đào tạo tham chiếu.',
        );
      }
      if (this.isStorageError(error)) {
        throw new BadRequestException(this.migrationHint);
      }
      throw error;
    }
  }
}
