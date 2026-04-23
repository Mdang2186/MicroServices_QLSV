import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class SubjectService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  private readonly PREREQUISITE_TYPE = 'TIEN_QUYET';
  private readonly PRECEDING_TYPE = 'HOC_TRUOC';

  private normalizeRelationIds(values: any): string[] {
    if (!Array.isArray(values)) {
      return [];
    }

    return [...new Set(values.map((value) => `${value || ''}`.trim()).filter(Boolean))];
  }

  private mapSubject(subject: any) {
    const relations = Array.isArray(subject?.prerequisites)
      ? [...subject.prerequisites]
      : [];
    const prerequisiteSubjects = relations
      .filter((item) => `${item.type || ''}`.toUpperCase() === this.PREREQUISITE_TYPE)
      .map((item) => item.prerequisite)
      .filter(Boolean);
    const precedingSubjects = relations
      .filter((item) => `${item.type || ''}`.toUpperCase() === this.PRECEDING_TYPE)
      .map((item) => item.prerequisite)
      .filter(Boolean);

    return {
      ...subject,
      prerequisiteSubjects,
      precedingSubjects,
      prerequisiteIds: prerequisiteSubjects.map((item: any) => item.id),
      precedingSubjectIds: precedingSubjects.map((item: any) => item.id),
      prerequisiteCount: prerequisiteSubjects.length,
      precedingCount: precedingSubjects.length,
    };
  }

  private buildRelationRows(
    subjectId: string,
    prerequisiteIds: string[],
    precedingSubjectIds: string[],
  ) {
    return [
      ...prerequisiteIds.map((prerequisiteId) => ({
        subjectId,
        prerequisiteId,
        type: this.PREREQUISITE_TYPE,
      })),
      ...precedingSubjectIds
        .filter((prerequisiteId) => !prerequisiteIds.includes(prerequisiteId))
        .map((prerequisiteId) => ({
          subjectId,
          prerequisiteId,
          type: this.PRECEDING_TYPE,
        })),
    ];
  }

  private splitPayload(data: any) {
    const payload = { ...(data || {}) };
    const prerequisiteIds = this.normalizeRelationIds(payload.prerequisiteIds);
    const precedingSubjectIds = this.normalizeRelationIds(payload.precedingSubjectIds);

    delete payload.prerequisiteIds;
    delete payload.precedingSubjectIds;
    delete payload.prerequisiteSubjects;
    delete payload.precedingSubjects;
    delete payload.prerequisiteCount;
    delete payload.precedingCount;
    delete payload.prerequisites;

    if (payload.departmentId === '') {
      payload.departmentId = null;
    }

    const theoryHours = Number(payload.theoryHours ?? 0);
    const practiceHours = Number(payload.practiceHours ?? 0);
    payload.theoryHours = Number.isFinite(theoryHours) ? Math.max(theoryHours, 0) : 0;
    payload.practiceHours = Number.isFinite(practiceHours) ? Math.max(practiceHours, 0) : 0;
    payload.theoryPeriods = payload.theoryHours;
    payload.practicePeriods = payload.practiceHours;

    const theorySessions = Number(payload.theorySessionsPerWeek ?? (payload.theoryHours > 0 ? 1 : 0));
    const practiceSessions = Number(
      payload.practiceSessionsPerWeek ?? (payload.practiceHours > 0 ? 1 : 0),
    );
    payload.theorySessionsPerWeek =
      payload.theoryHours > 0 && Number.isFinite(theorySessions)
        ? Math.max(theorySessions, 1)
        : 0;
    payload.practiceSessionsPerWeek =
      payload.practiceHours > 0 && Number.isFinite(practiceSessions)
        ? Math.max(practiceSessions, 1)
        : 0;

    return {
      payload,
      prerequisiteIds,
      precedingSubjectIds,
    };
  }

  async findAll(majorId?: string, departmentId?: string, facultyId?: string) {
    const subjects = await this.prisma.subject.findMany({
      where: {
        ...(majorId ? { majorId } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(facultyId ? { major: { facultyId } } : {}),
      },
      include: {
        major: true,
        department: true,
        prerequisites: {
          include: {
            prerequisite: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
          orderBy: [
            { type: 'asc' },
            { prerequisite: { code: 'asc' } },
          ],
        },
      },
      orderBy: { name: 'asc' },
    });
    return subjects.map((subject) => this.mapSubject(subject));
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        major: true,
        department: true,
        prerequisites: {
          include: {
            prerequisite: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
          orderBy: [
            { type: 'asc' },
            { prerequisite: { code: 'asc' } },
          ],
        },
      },
    });
    return subject ? this.mapSubject(subject) : null;
  }

  async create(data: any) {
    const { payload, prerequisiteIds, precedingSubjectIds } =
      this.splitPayload(data);
    if (
      !payload.code?.trim() ||
      !payload.name?.trim() ||
      !payload.majorId?.trim()
    ) {
      throw new BadRequestException(
        'Mã môn, tên môn và ngành chủ quản là bắt buộc.',
      );
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const subject = await tx.subject.create({
          data: payload,
          include: {
            major: true,
            department: true,
          },
        });

        const invalidRelations = [...prerequisiteIds, ...precedingSubjectIds].filter(
          (relationId) => relationId === subject.id,
        );
        if (invalidRelations.length > 0) {
          throw new BadRequestException(
            'Một môn học không thể tự tham chiếu chính nó.',
          );
        }

        const relationRows = this.buildRelationRows(
          subject.id,
          prerequisiteIds,
          precedingSubjectIds,
        );
        if (relationRows.length > 0) {
          await tx.prerequisite.createMany({ data: relationRows });
        }

        const hydrated = await tx.subject.findUnique({
          where: { id: subject.id },
          include: {
            major: true,
            department: true,
            prerequisites: {
              include: {
                prerequisite: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
              orderBy: [
                { type: 'asc' },
                { prerequisite: { code: 'asc' } },
              ],
            },
          },
        });

        return hydrated;
      });
      this.cache.invalidatePrefix('subjects:');
      return this.mapSubject(created);
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('Mã môn học đã tồn tại trong hệ thống.');
      }
      throw new BadRequestException(
        'Lỗi hệ thống: ' + (error.message || 'Không thể lưu môn học'),
      );
    }
  }

  async update(id: string, data: any) {
    const { payload, prerequisiteIds, precedingSubjectIds } =
      this.splitPayload(data);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.subject.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!existing) {
          throw new NotFoundException('Môn học không tồn tại.');
        }

        const invalidRelations = [...prerequisiteIds, ...precedingSubjectIds].filter(
          (relationId) => relationId === id,
        );
        if (invalidRelations.length > 0) {
          throw new BadRequestException(
            'Một môn học không thể tự tham chiếu chính nó.',
          );
        }

        await tx.subject.update({
          where: { id },
          data: payload,
        });

        await tx.prerequisite.deleteMany({
          where: { subjectId: id },
        });

        const relationRows = this.buildRelationRows(
          id,
          prerequisiteIds,
          precedingSubjectIds,
        );
        if (relationRows.length > 0) {
          await tx.prerequisite.createMany({ data: relationRows });
        }

        return tx.subject.findUnique({
          where: { id },
          include: {
            major: true,
            department: true,
            prerequisites: {
              include: {
                prerequisite: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
              orderBy: [
                { type: 'asc' },
                { prerequisite: { code: 'asc' } },
              ],
            },
          },
        });
      });
      this.cache.invalidatePrefix('subjects:');
      return this.mapSubject(updated);
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('Mã môn học đã tồn tại trong hệ thống.');
      }
      throw new BadRequestException(
        'Lỗi hệ thống: ' + (error.message || 'Không thể cập nhật môn học'),
      );
    }
  }

  async delete(id: string) {
    // Kiểm tra môn học có tồn tại không
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            classes: true,
            curriculums: true,
            semesterPlanItems: true,
            trainingPlanTemplateItems: true,
            grades: true,
            prerequisites: true,
            requiredFor: true,
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Môn học không tồn tại.');
    }

    const { _count } = subject;
    const totalRelated =
      _count.classes +
      _count.curriculums +
      _count.semesterPlanItems +
      _count.trainingPlanTemplateItems +
      _count.grades +
      _count.prerequisites +
      _count.requiredFor;

    if (totalRelated > 0) {
      const details: string[] = [];
      if (_count.classes > 0)
        details.push(`${_count.classes} lớp học phần`);
      if (_count.curriculums > 0)
        details.push(`${_count.curriculums} mục CTĐT`);
      if (_count.semesterPlanItems > 0)
        details.push(`${_count.semesterPlanItems} mục kế hoạch học kỳ`);
      if (_count.trainingPlanTemplateItems > 0)
        details.push(`${_count.trainingPlanTemplateItems} mục kế hoạch đào tạo`);
      if (_count.grades > 0)
        details.push(`${_count.grades} bản điểm`);
      if (_count.prerequisites > 0)
        details.push(`${_count.prerequisites} quan hệ tiên quyết / học trước`);
      if (_count.requiredFor > 0)
        details.push(`${_count.requiredFor} môn đang phụ thuộc`);

      throw new BadRequestException(
        `Không thể xóa môn học "${subject.name}" vì đang được sử dụng trong: ${details.join(', ')}. Vui lòng xóa các dữ liệu liên kết trước.`,
      );
    }

    try {
      const deleted = await this.prisma.subject.delete({
        where: { id },
      });
      this.cache.invalidatePrefix('subjects:');
      return deleted;
    } catch (error: any) {
      if (error.code === 'P2003' || error.code === 'P2014') {
        throw new BadRequestException(
          'Không thể xóa môn học vì đang được tham chiếu bởi dữ liệu khác trong hệ thống.',
        );
      }
      throw new BadRequestException(
        'Lỗi hệ thống: ' + (error.message || 'Không thể xóa môn học'),
      );
    }
  }
}
