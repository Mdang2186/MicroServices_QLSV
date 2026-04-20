import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TrainingResultService {
  constructor(private prisma: PrismaService) {}

  private parseLegacyAdminClass(
    adminClassCode?: string | null,
    cohortCode?: string | null,
  ) {
    const code = `${adminClassCode || ""}`.trim().toUpperCase();
    const cohort = `${cohortCode || ""}`.trim().toUpperCase();
    if (!code || code.startsWith("K")) return null;

    const match = code.match(/^(\d{2})A([12])-([A-Z0-9]+)$/);
    if (!match) return null;

    return {
      cohort: cohort || `K${match[1]}`,
      section: match[2].padStart(2, "0"),
      majorCode: match[3],
    };
  }

  private async resolveLinkedStudentIds(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { adminClass: true },
    });

    if (!student) {
      return [studentId];
    }

    const linkedStudentIds = [student.id];
    const legacyMeta = this.parseLegacyAdminClass(
      student.adminClass?.code,
      student.adminClass?.cohort || student.intake,
    );

    if (!legacyMeta) {
      return linkedStudentIds;
    }

    const mirrorAdminClass = await this.prisma.adminClass.findFirst({
      where: {
        cohort: legacyMeta.cohort,
        code: {
          startsWith: `${legacyMeta.cohort}-`,
          contains: `-${legacyMeta.majorCode}`,
          endsWith: `-${legacyMeta.section}`,
        },
      },
      orderBy: { code: "asc" },
      select: { id: true },
    });

    if (!mirrorAdminClass) {
      return linkedStudentIds;
    }

    let mirrorStudent = await this.prisma.student.findFirst({
      where: {
        adminClassId: mirrorAdminClass.id,
        fullName: student.fullName,
        status: "STUDYING",
      },
      select: { id: true },
    });

    if (!mirrorStudent) {
      const codeSuffix = `${student.studentCode || ""}`.match(/(\d{2})$/)?.[1];
      if (codeSuffix) {
        mirrorStudent = await this.prisma.student.findFirst({
          where: {
            adminClassId: mirrorAdminClass.id,
            studentCode: { endsWith: codeSuffix },
            status: "STUDYING",
          },
          select: { id: true },
        });
      }
    }

    if (mirrorStudent?.id) {
      linkedStudentIds.push(mirrorStudent.id);
    }

    return [...new Set(linkedStudentIds)];
  }

  async getStudentTrainingResults(studentId: string) {
    const linkedStudentIds = await this.resolveLinkedStudentIds(studentId);
    const items = await this.prisma.trainingScore.findMany({
      where: {
        studentId: { in: linkedStudentIds },
      },
      include: { semester: true },
    });

    const uniqueBySemester = new Map<string, any>();
    for (const item of items) {
      const key = item.semesterId;
      const existing = uniqueBySemester.get(key);
      if (!existing || Number(item.score || 0) > Number(existing.score || 0)) {
        uniqueBySemester.set(key, item);
      }
    }

    return [...uniqueBySemester.values()]
      .sort((left, right) => {
        const leftTime = left.semester?.startDate
          ? new Date(left.semester.startDate).getTime()
          : 0;
        const rightTime = right.semester?.startDate
          ? new Date(right.semester.startDate).getTime()
          : 0;
        return rightTime - leftTime;
      })
      .map((item) => ({
        id: item.id,
        semesterId: item.semesterId,
        semester: item.semester?.name || item.semesterId,
        score: item.score,
        rating: item.classification,
      }));
  }
}
