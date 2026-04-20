import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

const TTL_30MIN = 30 * 60 * 1000;

@Injectable()
export class RoomService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  private hasShiftOverlap(
    startShiftA: number,
    endShiftA: number,
    startShiftB: number,
    endShiftB: number,
  ) {
    return startShiftA <= endShiftB && startShiftB <= endShiftA;
  }

  async findAll() {
    return this.cache.getOrSet('rooms:all', TTL_30MIN, () =>
      this.prisma.room.findMany({ orderBy: { name: 'asc' } }),
    );
  }

  async findOne(id: string) {
    return this.prisma.room.findUnique({
      where: { id },
    });
  }

  async create(data: any) {
    const room = await this.prisma.room.create({
      data,
    });
    this.cache.invalidate('rooms:all');
    return room;
  }

  async update(id: string, data: any) {
    try {
      const room = await this.prisma.room.update({
        where: { id },
        data,
      });
      this.cache.invalidate('rooms:all');
      return room;
    } catch (error) {
      console.error(`Prisma error updating room ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const room = await this.prisma.room.delete({
        where: { id },
      });
      this.cache.invalidate('rooms:all');
      return room;
    } catch (error) {
      console.error(`Prisma error deleting room ${id}:`, error);
      throw error;
    }
  }

  async getRoomSchedule(roomId: string, semesterId?: string) {
    // Fetch sessions (lectures)
    const semesterFilter: any = semesterId ? { semesterId } : {};
    const sessions: any[] = (await this.prisma.classSession.findMany({
      where: {
        roomId,
        ...semesterFilter,
      },
      include: {
        courseClass: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startShift: 'asc' }],
    })) as any;

    // Fetch exam room assignments
    const examAssignments: any[] = await (
      this.prisma.examRoomAssignment as any
    ).findMany({
      where: { roomId },
    });

    const examPlanIds = [
      ...new Set(examAssignments.map((a: any) => a.examPlanId)),
    ];
    const examPlans: any[] =
      examPlanIds.length > 0
        ? await (this.prisma.examPlan as any).findMany({
            where: {
              id: { in: examPlanIds as any },
              ...(semesterId ? { semesterId } : {}),
            },
            include: { subject: true },
          })
        : [];

    // Combine into a unified format
    const scheduleItems = [
      ...sessions.map((s: any) => ({
        id: s.id,
        type: 'LECTURE',
        date: s.date,
        startShift: s.startShift,
        endShift: s.endShift,
        subjectName: s.courseClass?.subject?.name || 'Môn học',
        classCode: s.courseClass?.code || 'Lớp HP',
        courseClassId: s.courseClassId,
        note: s.note,
      })),
      ...examPlans.flatMap((plan: any) => {
        const assignment = examAssignments.find(
          (a: any) => a.examPlanId === plan.id,
        );
        if (!assignment) return []; // Only show exams actually assigned to this room

        return [
          {
            id: plan.id,
            type: 'EXAM',
            date: plan.examDate,
            startShift: plan.startShift,
            endShift: plan.endShift,
            subjectName: plan.subject?.name || 'Môn thi',
            classCode: plan.cohort || 'Khóa',
            note: plan.note,
          },
        ];
      }),
    ];

    const sortedItems = scheduleItems.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.startShift - b.startShift;
    });

    const annotatedItems = sortedItems.map((item) => ({
      ...item,
      hasConflict: false,
      conflicts: [] as string[],
    }));

    for (let index = 0; index < annotatedItems.length; index += 1) {
      const current = annotatedItems[index];
      for (
        let candidateIndex = index + 1;
        candidateIndex < annotatedItems.length;
        candidateIndex += 1
      ) {
        const candidate = annotatedItems[candidateIndex];
        if (
          new Date(current.date).getTime() !==
            new Date(candidate.date).getTime() ||
          !this.hasShiftOverlap(
            current.startShift,
            current.endShift,
            candidate.startShift,
            candidate.endShift,
          )
        ) {
          continue;
        }

        const currentMessage = `${candidate.subjectName} (${candidate.classCode}) T${candidate.startShift}-T${candidate.endShift}`;
        const candidateMessage = `${current.subjectName} (${current.classCode}) T${current.startShift}-T${current.endShift}`;

        current.hasConflict = true;
        candidate.hasConflict = true;

        if (!current.conflicts.includes(currentMessage)) {
          current.conflicts.push(currentMessage);
        }
        if (!candidate.conflicts.includes(candidateMessage)) {
          candidate.conflicts.push(candidateMessage);
        }
      }
    }

    return annotatedItems;
  }
}
