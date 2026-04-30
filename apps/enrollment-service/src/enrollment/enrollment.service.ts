import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Redis } from 'ioredis';
import Redlock from 'redlock';

@Injectable()
export class EnrollmentService {
    private readonly logger = new Logger(EnrollmentService.name);
    private redlock: Redlock | null = null;
    private redisClient: Redis | null = null;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService
    ) {
        this.initRedis();
    }

    private initRedis() {
        const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';

        try {
            this.redisClient = new Redis(redisUrl, {
                maxRetriesPerRequest: 1, // Fail fast to use SQL fallback
                retryStrategy(times) {
                    return Math.min(times * 100, 2000);
                },
                connectTimeout: 2000,
            });

            this.redisClient.on('error', (err) => {
                console.warn('[Redis] Connection Issue (Enrollment):', err.message);
            });

            this.redisClient.on('connect', () => {
                console.log('[Redis] Connected (Enrollment) for Distributed Locking.');
            });

            this.redlock = new Redlock([this.redisClient], {
                driftFactor: 0.01,
                retryCount: 2,
                retryDelay: 150,
                retryJitter: 50,
            });

            this.redlock.on('error', (err) => {
                // Ignore lock release errors during connection blips
                if (err instanceof Error && err.name === 'LockError') return;
                console.warn('[Redlock] Issue:', err.message);
            });

        } catch (error) {
            console.warn('[Redis] Integration failed, falling back to pure SQL Server mode.');
        }
    }

    private async acquireLock(classId: string): Promise<any | null> {
        if (!this.redlock || !this.redisClient || this.redisClient.status !== 'ready') {
            return null;
        }

        const resource = `locks:registration:class:${classId}`;
        const ttl = 4000;

        try {
            return await this.redlock.acquire([resource], ttl);
        } catch (err) {
            // If it's a connection error, we fall back to SQL
            if (this.redisClient.status !== 'ready') return null;
            // If it's actually busy, we respect the lock
            throw new BadRequestException('Lớp học đang có lưu lượng truy cập cao, vui lòng thử lại sau giây lát.');
        }
    }

    private toPortalDayOfWeek(value: Date | string) {
        const day = new Date(value).getDay();
        return day === 0 ? 8 : day + 1;
    }

    private mapSessionsToSchedules(sessions: any[] = []) {
        return sessions
            .map((session) => ({
                id: session.id,
                date: session.date,
                dayOfWeek: this.toPortalDayOfWeek(session.date),
                startShift: session.startShift,
                endShift: session.endShift,
                type: session.type,
                room: session.room,
                roomId: session.roomId,
                note: session.note,
            }))
            .sort((left, right) => {
                if (left.dayOfWeek !== right.dayOfWeek) return left.dayOfWeek - right.dayOfWeek;
                return left.startShift - right.startShift;
            });
    }

    private normalizeCourseClass(courseClass: any) {
        if (!courseClass) return courseClass;
        return {
            ...courseClass,
            schedules: this.mapSessionsToSchedules(courseClass.sessions || []),
        };
    }

    private getSessionPeriods(session: { startShift?: number; endShift?: number } | null | undefined) {
        if (!session) return 0;
        return Math.max(Number(session.endShift) - Number(session.startShift) + 1, 0);
    }

    private parseAttendanceNote(note?: string | null) {
        if (!note) {
            return { manualNote: '', meta: {} as any };
        }

        try {
            const parsed = JSON.parse(note);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return {
                    manualNote: `${parsed.manualNote || ''}`,
                    meta: parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {},
                };
            }
        } catch {
            // Legacy free-text note
        }

        return { manualNote: `${note}`, meta: {} as any };
    }

    private isHardPrerequisite(type?: string | null) {
        const normalized = `${type || ''}`.trim().toUpperCase();
        return !normalized || normalized === 'TIEN_QUYET' || normalized === 'PREREQUISITE';
    }

    private async resolveStudent(idOrCode: string, tx?: any) {
        const client = tx || this.prisma;
        let student = await client.student.findUnique({
            where: { id: idOrCode },
            include: { major: true, adminClass: true }
        });

        if (!student) {
            student = await client.student.findUnique({
                where: { userId: idOrCode },
                include: { major: true, adminClass: true }
            });
        }

        if (!student) {
            student = await client.student.findFirst({
                where: { studentCode: idOrCode },
                include: { major: true, adminClass: true }
            });
        }

        if (!student) throw new NotFoundException('Sinh viên không tồn tại');
        return student;
    }

    private buildAttendanceNote(
        currentNote: string | null | undefined,
        payload: { manualNote?: string | null; meta?: Record<string, any> | null },
    ) {
        const existing = this.parseAttendanceNote(currentNote);
        const manualNote =
            payload.manualNote !== undefined ? `${payload.manualNote || ''}` : existing.manualNote;
        const meta = {
            ...existing.meta,
            ...(payload.meta || {}),
        };

        if (!manualNote && Object.keys(meta).length === 0) {
            return null;
        }

        return JSON.stringify({ manualNote, meta });
    }

    private isUnexcusedAttendanceStatus(status?: string | null) {
        const normalized = `${status || ''}`.trim().toUpperCase();
        return normalized === 'ABSENT' || normalized === 'ABSENT_UNEXCUSED';
    }

    private calculateAttendanceDerivedGrade(totalPeriods: number, absentPeriods: number) {
        if (totalPeriods <= 0) {
            return { attendanceScore: 10, isEligibleForExam: true };
        }

        const missedPct = (absentPeriods / totalPeriods) * 100;

        if (missedPct >= 50) {
            return { attendanceScore: 0, isEligibleForExam: false };
        }
        if (missedPct === 0) {
            return { attendanceScore: 10, isEligibleForExam: true };
        }
        if (missedPct <= 10) {
            return { attendanceScore: 9, isEligibleForExam: true };
        }
        if (missedPct <= 20) {
            return { attendanceScore: 8, isEligibleForExam: true };
        }
        if (missedPct <= 30) {
            return { attendanceScore: 6, isEligibleForExam: true };
        }
        if (missedPct <= 40) {
            return { attendanceScore: 4, isEligibleForExam: true };
        }

        return { attendanceScore: 2, isEligibleForExam: true };
    }

    private async syncAttendanceDerivedGradesForEnrollments(
        tx: any,
        enrollmentIds: string[],
    ) {
        const uniqueEnrollmentIds = [...new Set(enrollmentIds.filter(Boolean))];
        if (!uniqueEnrollmentIds.length) {
            return;
        }

        const enrollments = await tx.enrollment.findMany({
            where: { id: { in: uniqueEnrollmentIds } },
            include: {
                courseClass: {
                    include: {
                        sessions: {
                            select: {
                                id: true,
                                date: true,
                                startShift: true,
                                endShift: true,
                            },
                        },
                    },
                },
                attendances: {
                    select: {
                        date: true,
                        status: true,
                    },
                },
            },
        });

        for (const enrollment of enrollments) {
            const sessions = enrollment.courseClass?.sessions || [];
            const attendanceByDate = new Map<string, string>(
                (enrollment.attendances || []).map((attendance) => [
                    new Date(attendance.date).toISOString().slice(0, 10),
                    `${attendance.status || ''}`,
                ]),
            );

            const totalPeriods = sessions.reduce(
                (sum, session) => sum + this.getSessionPeriods(session),
                0,
            );

            const absentPeriods = sessions.reduce((sum, session) => {
                const key = new Date(session.date).toISOString().slice(0, 10);
                const status = attendanceByDate.get(key);
                if (!this.isUnexcusedAttendanceStatus(status)) {
                    return sum;
                }
                return sum + this.getSessionPeriods(session);
            }, 0);

            const derived = this.calculateAttendanceDerivedGrade(
                totalPeriods,
                absentPeriods,
            );

            await tx.grade.updateMany({
                where: {
                    studentId: enrollment.studentId,
                    courseClassId: enrollment.courseClassId,
                },
                data: {
                    attendanceScore: derived.attendanceScore,
                    isEligibleForExam: derived.isEligibleForExam,
                },
            });
        }
    }

    async syncAttendanceDerivedGrades(enrollmentIds: string[]) {
        return this.prisma.$transaction(async (tx) => {
            await this.syncAttendanceDerivedGradesForEnrollments(tx, enrollmentIds);
            return { updatedEnrollmentIds: [...new Set(enrollmentIds.filter(Boolean))] };
        });
    }

    private buildTuitionFeeId(studentId: string, semesterId: string) {
        const normalizedStudent = studentId.replace(/[^A-Za-z0-9]/g, '').slice(-16) || 'STUDENT';
        const normalizedSemester = semesterId.replace(/[^A-Za-z0-9]/g, '').slice(-16) || 'SEMESTER';
        return `TUITION_${normalizedStudent}_${normalizedSemester}`.slice(0, 50);
    }

    private ensureSemesterRegistrationOpen(semester: any) {
        if (!semester) {
            throw new BadRequestException('Học kỳ đăng ký không hợp lệ');
        }

        const now = new Date();
        const hasExplicitWindow = semester.registerStartDate || semester.registerEndDate;
        const startDate = semester.registerStartDate ? new Date(semester.registerStartDate) : null;
        const endDate = semester.registerEndDate ? new Date(semester.registerEndDate) : null;
        const withinWindow =
            (!startDate || now >= startDate) &&
            (!endDate || now <= endDate);

        if (semester.isRegistering || (hasExplicitWindow && withinWindow)) {
            return;
        }

        throw new BadRequestException('Học kỳ hiện không mở cổng đăng ký / đổi lớp.');
    }

    private async resolveTargetSemester(semesterId?: string) {
        if (semesterId) {
            const semester = await this.prisma.semester.findUnique({
                where: { id: semesterId },
            });

            if (!semester) {
                throw new NotFoundException('Học kỳ không tồn tại');
            }

            return semester;
        }

        const registeringSemester = await this.prisma.semester.findFirst({
            where: { isRegistering: true },
            orderBy: { startDate: 'desc' },
        });
        if (registeringSemester) {
            return registeringSemester;
        }

        const currentSemester = await this.prisma.semester.findFirst({
            where: { isCurrent: true },
            orderBy: { startDate: 'desc' },
        });
        if (currentSemester) {
            return currentSemester;
        }

        const latestSemester = await this.prisma.semester.findFirst({
            orderBy: { startDate: 'desc' },
        });
        if (!latestSemester) {
            throw new NotFoundException('Chưa có học kỳ nào trong hệ thống');
        }

        return latestSemester;
    }

    private parseLegacyAdminClass(
        adminClassCode?: string | null,
        cohortCode?: string | null,
    ) {
        const code = `${adminClassCode || ''}`.trim().toUpperCase();
        const cohort = `${cohortCode || ''}`.trim().toUpperCase();
        if (!code || code.startsWith('K')) return null;

        // Support: 18A1-CNTT, 18A1_CNTT, 18CNTT101, etc.
        const match = code.match(
            /^(\d{2})([A-Z]?)(\d{1,2})[-_]?([A-Z0-9]+)([-_]?\d*)?$/,
        );
        if (!match) return null;

        return {
            cohort: cohort || `K${match[1]}`,
            section: match[3]?.padStart(2, '0'),
            majorCode: match[4],
        };
    }

    private resolveStudentCohortCode(student: any) {
        const candidates = [
            student?.intake,
            student?.adminClass?.cohort,
            student?.adminClass?.code,
            student?.studentCode,
        ];

        for (const candidate of candidates) {
            const cohortCode = this.normalizeCohortCode(candidate);
            if (cohortCode) {
                return cohortCode;
            }
        }

        const legacyMeta = this.parseLegacyAdminClass(student?.adminClass?.code);
        return legacyMeta?.cohort || null;
    }

    private normalizeCohortCode(value?: string | null) {
        const raw = `${value || ''}`.trim().toUpperCase();
        if (!raw) return null;

        const direct = raw.match(/^K?(\d{1,2})$/);
        if (direct) return `K${Number(direct[1])}`;

        const kMatch = raw.match(/\bK(\d{1,2})\b/);
        if (kMatch) return `K${Number(kMatch[1])}`;

        const legacyClass = raw.match(/^(\d{2})A[12]/);
        if (legacyClass) return `K${Number(legacyClass[1])}`;

        const studentCode = raw.match(/^SVK?(\d{2})/);
        if (studentCode) return `K${Number(studentCode[1])}`;

        return null;
    }

    private parseCohortStartYear(cohortCode?: string | null) {
        const normalized = this.normalizeCohortCode(cohortCode);
        const cohortNumber = Number(`${normalized || ''}`.replace(/\D/g, ''));
        if (!Number.isFinite(cohortNumber) || cohortNumber <= 0) return null;
        if (cohortNumber >= 2000) return cohortNumber;
        return 2006 + cohortNumber;
    }

    private resolveCohortStartYear(student: any, academicCohort?: any | null) {
        const cohortStartYear = this.parseCohortStartYear(this.resolveStudentCohortCode(student));
        if (cohortStartYear) return cohortStartYear;

        const admissionYear = student?.admissionDate
            ? new Date(student.admissionDate).getFullYear()
            : null;
        if (Number.isInteger(admissionYear) && admissionYear >= 2000) {
            return admissionYear;
        }

        const academicStartYear = Number(academicCohort?.startYear || 0);
        return Number.isInteger(academicStartYear) && academicStartYear >= 2000
            ? academicStartYear
            : null;
    }

    private isSemesterInCohortWindow(semester: any, startYear: number | null) {
        if (!startYear) return true;

        const startDate = semester?.startDate ? new Date(semester.startDate) : null;
        const endDate = semester?.endDate ? new Date(semester.endDate) : null;
        const windowStart = new Date(startYear, 7, 1);
        const windowEnd = new Date(startYear + 4, 7, 31, 23, 59, 59);

        if (startDate && !Number.isNaN(startDate.getTime())) {
            const compareDate = endDate && !Number.isNaN(endDate.getTime()) ? endDate : startDate;
            return compareDate >= windowStart && startDate <= windowEnd;
        }

        const semesterYear = Number(semester?.year || 0);
        return semesterYear >= startYear && semesterYear <= startYear + 4;
    }

    private isDateInSemester(date: Date, semester: any) {
        const startDate = semester?.startDate ? new Date(semester.startDate) : null;
        const endDate = semester?.endDate ? new Date(semester.endDate) : null;
        if (!startDate || !endDate) return false;
        return date >= startDate && date <= endDate;
    }

    private getCohortSemesterSlot(semester: any, startYear: number | null) {
        if (!startYear) return null;

        const startDate = semester?.startDate ? new Date(semester.startDate) : null;
        const endDate = semester?.endDate ? new Date(semester.endDate) : null;
        if (!startDate || Number.isNaN(startDate.getTime())) return null;

        const compareDate = endDate && !Number.isNaN(endDate.getTime()) ? endDate : startDate;
        for (let yearIndex = 0; yearIndex < 4; yearIndex += 1) {
            const academicStartYear = startYear + yearIndex;
            const oddSemester = yearIndex * 2 + 1;
            const evenSemester = yearIndex * 2 + 2;
            const firstStart = new Date(academicStartYear, 8, 1);
            const firstEnd = new Date(academicStartYear + 1, 0, 31, 23, 59, 59);
            const secondStart = new Date(academicStartYear + 1, 1, 1);
            const secondEnd = new Date(academicStartYear + 1, 6, 31, 23, 59, 59);

            if (compareDate >= firstStart && startDate <= firstEnd) {
                return {
                    semesterNumber: oddSemester,
                    studyYear: yearIndex + 1,
                    academicYearLabel: `${academicStartYear}-${academicStartYear + 1}`,
                    standardStartDate: firstStart,
                    standardEndDate: new Date(academicStartYear + 1, 0, 20),
                };
            }

            if (compareDate >= secondStart && startDate <= secondEnd) {
                return {
                    semesterNumber: evenSemester,
                    studyYear: yearIndex + 1,
                    academicYearLabel: `${academicStartYear}-${academicStartYear + 1}`,
                    standardStartDate: secondStart,
                    standardEndDate: new Date(academicStartYear + 1, 5, 30),
                };
            }
        }

        return null;
    }

    private normalizeSemesterForCohort(semester: any, cohortCode: string | null, startYear: number | null) {
        const slot = this.getCohortSemesterSlot(semester, startYear);
        if (!slot) return semester;

        return {
            ...semester,
            code: `${cohortCode || 'KHOA'}_HK${slot.semesterNumber}`,
            name: `HK${slot.semesterNumber} - Năm ${slot.studyYear} (${slot.academicYearLabel})`,
            year: slot.semesterNumber % 2 === 1 ? startYear + slot.studyYear - 1 : startYear + slot.studyYear,
            startDate: slot.standardStartDate,
            endDate: slot.standardEndDate,
            semesterNumber: slot.semesterNumber,
            cohortSemesterNumber: slot.semesterNumber,
            cohortStudyYear: slot.studyYear,
            cohortAcademicYear: slot.academicYearLabel,
        };
    }

    private buildSyntheticCohortSemester(cohortCode: string, startYear: number, semesterNumber: number) {
        const studyYear = Math.ceil(semesterNumber / 2);
        const academicStartYear = startYear + studyYear - 1;
        const academicYearLabel = `${academicStartYear}-${academicStartYear + 1}`;
        const isOddSemester = semesterNumber % 2 === 1;

        return {
            id: `${cohortCode}_HK${semesterNumber}`,
            code: `${cohortCode}_HK${semesterNumber}`,
            name: `HK${semesterNumber} - Năm ${studyYear} (${academicYearLabel})`,
            year: isOddSemester ? academicStartYear : academicStartYear + 1,
            startDate: isOddSemester
                ? new Date(academicStartYear, 8, 1)
                : new Date(academicStartYear + 1, 1, 1),
            endDate: isOddSemester
                ? new Date(academicStartYear + 1, 0, 20)
                : new Date(academicStartYear + 1, 5, 30),
            semesterNumber,
            cohortCode,
            cohortSemesterNumber: semesterNumber,
            cohortStudyYear: studyYear,
            cohortAcademicYear: academicYearLabel,
            isCurrent: false,
            isRegistering: false,
        };
    }

    private normalizeStudentSemestersForCohort(semesters: any[], cohortCode: string | null, startYear: number | null) {
        const semesterBySlot = new Map<number, any>();
        const semesterById = new Set<string>();

        for (const semester of semesters) {
            if (!semester?.id || semesterById.has(semester.id)) continue;
            semesterById.add(semester.id);

            const normalized = this.normalizeSemesterForCohort(semester, cohortCode, startYear);
            const slot = Number(normalized?.cohortSemesterNumber || 0);
            if (slot >= 1 && slot <= 8 && !semesterBySlot.has(slot)) {
                semesterBySlot.set(slot, normalized);
            }
        }

        if (cohortCode && startYear) {
            for (let slot = 1; slot <= 8; slot += 1) {
                if (!semesterBySlot.has(slot)) {
                    semesterBySlot.set(
                        slot,
                        this.buildSyntheticCohortSemester(cohortCode, startYear, slot),
                    );
                }
            }
        }

        return this.sortSemestersDesc([...semesterBySlot.values()]).slice(0, 8);
    }

    private mapCohortSemesterRow(row: any, startYear: number | null) {
        const semester = row?.semester || {};
        return this.normalizeSemesterForCohort(
            {
                ...semester,
                id: row.semesterId || semester.id,
                code: `${row.cohortCode}_HK${row.semesterNumber}`,
                name: row.label,
                year: row.semesterNumber % 2 === 1
                    ? Number(startYear || semester.year || 0) + row.studyYear - 1
                    : Number(startYear || semester.year || 0) + row.studyYear,
                startDate: row.startDate,
                endDate: row.endDate,
                isCurrent: row.isCurrent,
                isRegistering: row.isRegistering,
                registerStartDate: row.registerStartDate,
                registerEndDate: row.registerEndDate,
                semesterNumber: row.semesterNumber,
                cohortSemesterId: row.id,
                cohortCode: row.cohortCode,
                cohortSemesterNumber: row.semesterNumber,
                cohortStudyYear: row.studyYear,
                cohortAcademicYear: row.academicYear,
            },
            row.cohortCode,
            startYear,
        );
    }

    private async getPersistedCohortSemesters(cohortCode: string, startYear: number | null) {
        try {
            const rows = await (this.prisma as any).cohortSemester.findMany({
                where: {
                    cohortCode,
                    status: 'ACTIVE',
                },
                include: { semester: true },
                orderBy: { semesterNumber: 'asc' },
            });

            return rows
                .map((row: any) => this.mapCohortSemesterRow(row, startYear))
                .filter((semester: any) =>
                    this.isRegularSemester(semester) &&
                    this.isSemesterInCohortWindow(semester, startYear),
                );
        } catch (error) {
            this.logger.warn(
                `CohortSemester unavailable for ${cohortCode}; falling back to Semester mapping: ${(error as Error)?.message}`,
            );
            return [];
        }
    }

    private async resolveCourseClassRegistrationWindow(tx: any, courseClass: any) {
        const classCohort = this.normalizeCohortCode(courseClass?.cohort);
        try {
            const cohortSemester = classCohort
                ? await tx.cohortSemester.findFirst({
                    where: {
                        cohortCode: classCohort,
                        semesterId: courseClass.semesterId,
                        status: 'ACTIVE',
                    },
                })
                : null;

            if (cohortSemester) {
                return {
                    ...courseClass.semester,
                    isCurrent: cohortSemester.isCurrent,
                    isRegistering: cohortSemester.isRegistering,
                    registerStartDate: cohortSemester.registerStartDate,
                    registerEndDate: cohortSemester.registerEndDate,
                };
            }
        } catch {
            // CohortSemester is additive; if migration has not run, use Semester.
        }

        return courseClass.semester;
    }

    private isRegularSemester(semester: any) {
        const normalized = `${semester?.code || ''} ${semester?.name || ''}`
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        return !/(hoc\s*ky\s*phu|hockyphu|summer|phu)/.test(normalized);
    }

    private sortSemestersDesc(semesters: any[]) {
        return semesters.sort((left, right) => {
            const leftTime = left?.startDate ? new Date(left.startDate).getTime() : 0;
            const rightTime = right?.startDate ? new Date(right.startDate).getTime() : 0;
            return rightTime - leftTime;
        });
    }

    private async getStudentSemestersFromPlan(student: any) {
        const cohortCode = this.resolveStudentCohortCode(student);
        if (!student?.majorId || !cohortCode) {
            return [];
        }

        const plans = await this.prisma.semesterPlan.findMany({
            where: {
                majorId: student.majorId,
                cohort: cohortCode,
            },
            include: {
                semester: true,
            },
            orderBy: {
                conceptualSemester: 'asc',
            },
        });

        const semesterByConcept = new Map<number, any>();
        for (const plan of plans) {
            const conceptualSemester = Number(plan.conceptualSemester);
            if (
                plan.semester?.id &&
                conceptualSemester >= 1 &&
                conceptualSemester <= 8 &&
                this.isRegularSemester(plan.semester) &&
                !semesterByConcept.has(conceptualSemester)
            ) {
                semesterByConcept.set(conceptualSemester, plan.semester);
            }
        }

        const plannedSemesters = this.sortSemestersDesc([...semesterByConcept.values()]);

        const academicCohort = await this.prisma.academicCohort.findUnique({
            where: { code: cohortCode },
        });
        const startYear = this.resolveCohortStartYear(student, academicCohort);
        const persistedCohortSemesters = await this.getPersistedCohortSemesters(cohortCode, startYear);
        if (persistedCohortSemesters.length > 0) {
            return persistedCohortSemesters;
        }

        let cohortWindowSemesters: any[] = [];
        if (startYear > 0) {
            const semesters = await this.prisma.semester.findMany({
                where: {
                    year: {
                        gte: startYear,
                        lte: startYear + 4,
                    },
                },
                orderBy: { startDate: 'desc' },
            });

            cohortWindowSemesters = this.sortSemestersDesc(
                semesters.filter((semester) =>
                    this.isRegularSemester(semester) &&
                    this.isSemesterInCohortWindow(semester, startYear),
                ),
            );
        }

        const semesterMap = new Map<string, any>();
        for (const semester of [...plannedSemesters, ...cohortWindowSemesters]) {
            if (
                semester?.id &&
                !semesterMap.has(semester.id) &&
                this.isRegularSemester(semester) &&
                this.isSemesterInCohortWindow(semester, startYear)
            ) {
                semesterMap.set(semester.id, semester);
            }
        }

        return this.normalizeStudentSemestersForCohort(
            [...semesterMap.values()],
            cohortCode,
            startYear,
        );
    }

    private async calculateEnrollmentFee(
        tx: any,
        student: any,
        courseClass: any,
        isRetake: boolean
    ) {
        // 1. Resolve Multiplier
        // Priority: Retake (1.5) > Class Multiplier (Default 1.0)
        const multiplier = isRetake ? 1.5 : (courseClass.tuitionMultiplier || 1.0);

        // 2. Lookup Tuition Config
        // Strategy: Match Major + Year + Cohort + Type -> Fallback to Major + Year
        const config = await tx.tuitionConfig.findFirst({
            where: {
                majorId: student.majorId,
                academicYear: courseClass.semester.year,
                cohort: student.intake || undefined,
                educationType: student.educationType || undefined,
                isActive: true
            }
        }) || await tx.tuitionConfig.findFirst({
            where: {
                majorId: student.majorId,
                academicYear: courseClass.semester.year,
                isActive: true
            }
        });

        const pricePerCredit = config ? Number(config.pricePerCredit) : 500000;
        const credits = Number(courseClass.subject.credits || 0);

        return Math.round(credits * pricePerCredit * multiplier);
    }

    async registerCourse(studentIdOrUserId: string, classId: string) {
        // --- HYBRID LOCKING ---
        // 1. Try Redis Lock (Fast distributed lock)
        // 2. Fallback to SQL Atomic transaction if Redis is down
        const lock = await this.acquireLock(classId);

        try {
            // Transaction to prevent race conditions (Database isolation)
            return await this.prisma.$transaction(async (tx) => {
                // Resolve Student
                const student = await this.resolveStudent(studentIdOrUserId, tx);
                const studentId = student.id;

                // 1. Get Class Info
                const courseClass = await tx.courseClass.findUnique({
                    where: { id: classId },
                    include: {
                        subject: { include: { prerequisites: true } },
                        sessions: { include: { room: true } },
                        semester: true
                    }
                });

                if (!courseClass) throw new NotFoundException('Lớp học phần không tồn tại');
                // 1. Check Slot and Status (Initial check)
                if (courseClass.status !== 'OPEN') {
                    const registrationWindow = await this.resolveCourseClassRegistrationWindow(tx, courseClass);
                    this.ensureSemesterRegistrationOpen(registrationWindow);
                    throw new BadRequestException('Lớp học phần chưa mở hoặc đã đóng đăng ký');
                }
                
                if (courseClass.currentSlots >= courseClass.maxSlots) {
                    throw new BadRequestException('Lớp đã hết chỗ (Class is full)');
                }

                // 3. Duplication check
                const existing = await tx.enrollment.findUnique({
                    where: { studentId_courseClassId: { studentId, courseClassId: classId } }
                });
                if (existing) throw new BadRequestException('Bạn đã đăng ký lớp học này rồi');

                const sameSubjectEnrollment = await tx.enrollment.findFirst({
                    where: {
                        studentId,
                        courseClass: {
                            subjectId: courseClass.subjectId,
                            semesterId: courseClass.semesterId
                        }
                    }
                });
                if (sameSubjectEnrollment) throw new BadRequestException('Bạn đã đăng ký một lớp khác của môn học này trong học kỳ');

                // 4. Prerequisite Check
                for (const prereq of courseClass.subject.prerequisites.filter((item) =>
                    this.isHardPrerequisite(item.type),
                )) {
                    const passed = await tx.grade.findFirst({
                        where: {
                            studentId,
                            subjectId: prereq.prerequisiteId,
                            totalScore10: { gte: 4.0 }
                        }
                    });
                    if (!passed) {
                        const subj = await tx.subject.findUnique({ where: { id: prereq.prerequisiteId } });
                        throw new BadRequestException(`Chưa đạt môn tiên quyết: ${subj?.name}`);
                    }
                }

                // 5. Schedule Conflict Check (Detailed)
                const studentEnrollments = await tx.enrollment.findMany({
                    where: { studentId, courseClass: { semesterId: courseClass.semesterId } },
                    include: { courseClass: { include: { subject: true, sessions: true } } }
                });

                const existingSchedules = studentEnrollments.flatMap(e =>
                    (e.courseClass as any).sessions.map(s => ({ 
                        ...s, 
                        dayOfWeek: this.toPortalDayOfWeek(s.date),
                        subjectName: e.courseClass.subject.name 
                    }))
                );

                const newSchedules = (courseClass as any).sessions.map(s => ({
                    ...s,
                    dayOfWeek: this.toPortalDayOfWeek(s.date)
                }));

                const conflict = this.checkConflictDetailed(newSchedules, existingSchedules);
                if (conflict.isConflicted) {
                    throw new BadRequestException(conflict.message);
                }

                // 6. Atomic Increment & Strict Slot Check (Race Condition Prevention)
                // This is our second layer of defense (SQL level)
                const updated = await tx.courseClass.updateMany({
                    where: {
                        id: classId,
                        currentSlots: { lt: courseClass.maxSlots }
                    },
                    data: {
                        currentSlots: { increment: 1 }
                    }
                });

                if (updated.count === 0) {
                    throw new BadRequestException('Lớp vừa hết chỗ, vui lòng tải lại trang và chọn lớp khác.');
                }

                // 7. Calculate Tuition Fee
                const previouslyTaken = await tx.enrollment.findFirst({
                    where: {
                        studentId,
                        courseClass: { subjectId: courseClass.subjectId }
                    }
                });
                const isRetake = !!previouslyTaken;
                const tuitionFee = await this.calculateEnrollmentFee(tx, student, courseClass, isRetake);

                // 8. Create Enrollment
                const enrollment = await tx.enrollment.create({
                    data: {
                        studentId,
                        courseClassId: classId,
                        status: 'REGISTERED',
                        isRetake,
                        tuitionFee
                    }
                });

                // 9. Sync Tuition
                await this.syncStudentTuition(studentId, courseClass.semesterId, tx);

                return enrollment;
            });
        } finally {
            if (lock) await lock.release();
        }
    }

    async dropEnrollmentById(id: string) {
        return await this.prisma.$transaction(async (tx) => {
            const enrollment = await tx.enrollment.findUnique({
                where: { id },
                include: { courseClass: true }
            });

            if (!enrollment) throw new NotFoundException('Enrollment not found');

            const classId = enrollment.courseClassId;
            const studentId = enrollment.studentId;
            const semesterId = enrollment.courseClass.semesterId;

            // 1. Delete Enrollment
            await tx.enrollment.delete({ where: { id } });

            // 2. Decrement Slot
            await tx.courseClass.update({
                where: { id: classId },
                data: { currentSlots: { decrement: 1 } }
            });

            // 3. Sync Tuition
            await this.syncStudentTuition(studentId, semesterId, tx);

            return { message: 'Hủy đăng ký thành công' };
        });
    }

    async dropCourse(studentIdOrUserId: string, classId: string) {
        return await this.prisma.$transaction(async (tx) => {
            // Resolve Student
            const student = await this.resolveStudent(studentIdOrUserId, tx);
            const studentId = student.id;
            const linkedStudentIds = await this.resolveLinkedStudentIds(studentIdOrUserId);

            // 1. Get Enrollment
            const enrollment = await tx.enrollment.findFirst({
                where: { studentId: { in: linkedStudentIds }, courseClassId: classId }
            });
            if (!enrollment) throw new BadRequestException('Bạn chưa đăng ký lớp này');

            const courseClass = await tx.courseClass.findUnique({ where: { id: classId } });
            if (!courseClass) throw new NotFoundException('Course class not found');

            // 2. Delete Enrollment
            await tx.enrollment.delete({ where: { id: enrollment.id } });

            // 3. Decrement Slot
            await tx.courseClass.update({
                where: { id: classId },
                data: { currentSlots: { decrement: 1 } }
            });

            // 4. Sync Tuition
            await this.syncStudentTuition(studentId, courseClass.semesterId, tx);

            return { message: 'Hủy đăng ký thành công' };
        });
    }

    private async syncStudentTuition(studentId: string, semesterId: string, tx: any) {
        // Use provided transaction client (tx) for consistency
        const prisma = tx || this.prisma;

        // 1. Get all enrollments for this student in this semester to calculate totals
        const enrollments = await prisma.enrollment.findMany({
            where: { 
                studentId,
                courseClass: { semesterId }
            },
            include: { courseClass: { include: { subject: true } } }
        });

        const totalTuition = enrollments.reduce((sum, enr) => sum + Number(enr.tuitionFee), 0);
        const paidTuition = enrollments
            .filter(enr => enr.status === 'PAID')
            .reduce((sum, enr) => sum + Number(enr.tuitionFee), 0);

        if (totalTuition === 0 && enrollments.length === 0) {
            await prisma.studentFee.deleteMany({
                where: {
                    studentId,
                    semesterId,
                    feeType: 'TUITION',
                }
            });
            return;
        }

        const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
        const feeName = `Học phí ${semester?.name || semesterId}`;

        const feePayload = {
            totalAmount: totalTuition,
            finalAmount: totalTuition,
            paidAmount: paidTuition,
            status: paidTuition >= totalTuition ? 'PAID' : (paidTuition > 0 ? 'PARTIAL' : 'DEBT')
        };

        const existingFee = await prisma.studentFee.findFirst({
            where: {
                studentId,
                semesterId,
                feeType: 'TUITION',
            }
        });

        if (existingFee) {
            await prisma.studentFee.update({
                where: { id: existingFee.id },
                data: feePayload,
            });
            return;
        }

        await prisma.studentFee.create({
            data: {
                id: this.buildTuitionFeeId(studentId, semesterId),
                studentId,
                semesterId,
                feeType: 'TUITION',
                name: feeName,
                discountAmount: 0,
                isMandatory: true,
                ...feePayload,
            }
        });
    }

    private checkConflictDetailed(newSchedule: any[], existingSchedules: any[]) {
        const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        for (const ns of newSchedule) {
            const nsDay = ns.dayOfWeek || this.toPortalDayOfWeek(ns.date);
            for (const es of existingSchedules) {
                const esDay = es.dayOfWeek || this.toPortalDayOfWeek(es.date);
                if (nsDay === esDay) {
                    const hasOverlap = Math.max(ns.startShift || ns.startPeriod, es.startShift || es.startPeriod) <= Math.min(ns.endShift || ns.endPeriod, es.endShift || es.endPeriod);
                    if (hasOverlap) {
                        return {
                            isConflicted: true,
                            message: `Trùng lịch học với môn ${es.subjectName || 'đã đăng ký'} vào ${days[nsDay-1] || 'N/A'}, Tiết ${es.startShift || es.startPeriod}-${es.endShift || es.endPeriod}`
                        };
                    }
                }
            }
        }
        return { isConflicted: false };
    }

    private checkConflict(newSchedule: any[], existingSchedules: any[]) {
        return this.checkConflictDetailed(newSchedule, existingSchedules).isConflicted;
    }

    async switchClass(studentIdOrUserId: string, oldClassId: string, newClassId: string) {
        if (oldClassId === newClassId) {
            throw new BadRequestException('Bạn đang ở trong lớp này rồi');
        }

        const lock = await this.acquireLock(newClassId);

        try {
        return await this.prisma.$transaction(async (tx) => {
            // Resolve Student
            const student = await this.resolveStudent(studentIdOrUserId, tx);
            const studentId = student.id;
            const linkedStudentIds = await this.resolveLinkedStudentIds(studentIdOrUserId);

            // 1. Check if enrolled in old class
            const oldEnrollment = await tx.enrollment.findFirst({
                where: { studentId: { in: linkedStudentIds }, courseClassId: oldClassId }
            });
            if (!oldEnrollment) {
                throw new BadRequestException('Bạn không tham gia lớp cũ này');
            }

            // 2. Get New Class Info
            const newClass = await tx.courseClass.findUnique({
                where: { id: newClassId },
                include: {
                    subject: true,
                    sessions: true,
                    semester: true
                }
            });

            if (!newClass) throw new NotFoundException('Lớp học phần mới không tồn tại');
            if (newClass.status !== 'OPEN') {
                const registrationWindow = await this.resolveCourseClassRegistrationWindow(tx, newClass);
                this.ensureSemesterRegistrationOpen(registrationWindow);
                const statusLabel = newClass.status === 'LOCKED' ? 'Bị khóa' : newClass.status;
                throw new BadRequestException(`Lớp mới đang ở trạng thái '${statusLabel}', không thể đăng ký chuyển lớp.`);
            }
            if (newClass.currentSlots >= newClass.maxSlots) {
                throw new BadRequestException('Lớp mới đã đầy');
            }
            if (oldEnrollment.courseClassId === newClassId) {
                throw new BadRequestException('Bạn đang ở trong lớp học phần này');
            }

            // 3. Verify it's the same subject (optional but recommended)
            const oldClass = await tx.courseClass.findUnique({
                where: { id: oldClassId },
                select: { subjectId: true, semesterId: true }
            });
            if (oldClass?.subjectId !== newClass.subjectId) {
               throw new BadRequestException('Lớp mới không cùng môn học với lớp cũ');
            }
            if (oldClass?.semesterId !== newClass.semesterId) {
               throw new BadRequestException('Chỉ được đổi sang lớp khác trong cùng học kỳ đăng ký');
            }

            const existingNewEnrollment = await tx.enrollment.findUnique({
                where: { studentId_courseClassId: { studentId, courseClassId: newClassId } }
            });
            if (existingNewEnrollment) {
                throw new BadRequestException('Bạn đã đăng ký lớp học phần đích này rồi');
            }

            // 4. Schedule Conflict Check
            // Get all OTHER enrollments for the same semester
            const otherEnrollments = await tx.enrollment.findMany({
                where: { 
                    studentId, 
                    courseClass: { 
                        semesterId: newClass.semesterId,
                        id: { not: oldClassId } 
                    } 
                },
                include: { courseClass: { include: { sessions: true } } }
            });

            const existingSchedules = otherEnrollments.flatMap(e => 
                (e.courseClass as any).sessions.map(s => ({
                    ...s,
                    dayOfWeek: this.toPortalDayOfWeek(s.date)
                }))
            );
            const newSchedules = (newClass as any).sessions.map(s => ({
                ...s,
                dayOfWeek: this.toPortalDayOfWeek(s.date)
            }));

            const conflict = this.checkConflictDetailed(newSchedules, existingSchedules);
            if (conflict.isConflicted) {
                throw new BadRequestException(conflict.message || 'Lịch học lớp mới bị trùng với các môn khác bạn đã đăng ký');
            }

            // 5. Atomic Swap
            // Calculate new fee (mandatory as multipliers or configs might differ across classes)
            const isRetake = oldEnrollment.isRetake;
            const tuitionFee = await this.calculateEnrollmentFee(tx, student, newClass, isRetake);

            const updated = await tx.courseClass.updateMany({
                where: {
                    id: newClassId,
                    currentSlots: { lt: newClass.maxSlots }
                },
                data: {
                    currentSlots: { increment: 1 }
                }
            });

            if (updated.count === 0) {
                throw new BadRequestException('Lớp mới vừa hết chỗ, vui lòng chọn lớp khác.');
            }

            // Delete old enrollment
            await tx.enrollment.delete({
                where: { id: oldEnrollment.id }
            });

            // Create new enrollment
            const newEnrollment = await tx.enrollment.create({
                data: {
                    studentId,
                    courseClassId: newClassId,
                    status: 'REGISTERED',
                    isRetake,
                    tuitionFee
                }
            });

            // 6. Update Slot Counts
            await tx.courseClass.update({
                where: { id: oldClassId },
                data: { currentSlots: { decrement: 1 } }
            });

            // 7. Sync Tuition
            await this.syncStudentTuition(studentId, newClass.semesterId, tx);

            return {
                message: 'Chuyển lớp thành công!',
                enrollment: newEnrollment
            };
        });
        } finally {
            if (lock) await lock.release();
        }
    }

    async getRegistrationOverview(studentIdOrUserId: string) {
        const student = await this.resolveStudent(studentIdOrUserId);
        const studentSemesters = await this.getStudentSemestersFromPlan(student);
        const now = new Date();
        const targetSemester =
            studentSemesters.find((semester) => this.isDateInSemester(now, semester)) ||
            studentSemesters.find((semester) => semester.isRegistering || semester.isCurrent) ||
            studentSemesters[0] ||
            await this.resolveTargetSemester();
        let semester = targetSemester;
        let enrolledCourses = await this.getStudentEnrollments(student.id, targetSemester.id);

        if (enrolledCourses.length === 0) {
            const latestEnrollment = await this.prisma.enrollment.findFirst({
                where: { studentId: student.id },
                include: {
                    courseClass: {
                        include: {
                            semester: true,
                        },
                    },
                },
                orderBy: [
                    { courseClass: { semester: { startDate: 'desc' } } },
                    { registeredAt: 'desc' },
                ],
            });

            if (latestEnrollment?.courseClass?.semester?.id) {
                semester = latestEnrollment.courseClass.semester;
                enrolledCourses = await this.getStudentEnrollments(student.id, semester.id);
            }
        }

        const registrationStatus = await this.getRegistrationStatus(student.id, semester.id);

        return {
            semester,
            registrationStatus,
            enrolledCourses,
        };
    }

    async getRegistrationStatus(studentIdOrUserId: string, semesterId?: string) {
        const student = await this.resolveStudent(studentIdOrUserId);
        const studentId = student.id;
        const studentSemesters = semesterId ? [] : await this.getStudentSemestersFromPlan(student);
        const now = new Date();
        const targetSemester = semesterId
            ? await this.resolveTargetSemester(semesterId)
            : studentSemesters.find((semester) => this.isDateInSemester(now, semester)) ||
                studentSemesters.find((semester) => semester.isRegistering || semester.isCurrent) ||
                studentSemesters[0] ||
                await this.resolveTargetSemester();
        const targetSemesterId = targetSemester.id;

        const cohortCode = this.resolveStudentCohortCode(student);
        const trainingTemplate = cohortCode
            ? await this.prisma.trainingPlanTemplate.findFirst({
                where: {
                    majorId: student.majorId,
                    cohort: cohortCode,
                    status: { in: ['PUBLISHED', 'ACTIVE'] },
                },
                orderBy: [
                    { publishedAt: 'desc' },
                    { version: 'desc' },
                ],
                include: {
                    items: {
                        include: {
                            subject: {
                                include: {
                                    prerequisites: true,
                                },
                            },
                        },
                    },
                },
            })
            : null;

        const templateItems = trainingTemplate?.items?.length
            ? trainingTemplate.items.map((item) => ({
                subjectId: item.subjectId,
                suggestedSemester: item.conceptualSemester,
                isRequired: item.isRequired,
                subject: item.subject,
            }))
            : [];

        const curriculum = templateItems.length > 0
            ? templateItems
            : await this.prisma.curriculum.findMany({
                where: {
                    majorId: student.majorId,
                    ...(cohortCode ? { cohort: cohortCode } : {}),
                },
                orderBy: {
                    suggestedSemester: 'asc'
                },
                include: {
                    subject: {
                        include: {
                            prerequisites: true
                        }
                    }
                }
            });

        // 1.5 Find subjects that have OPEN classes in the target semester
        // Include subjects from student's major OR general education (KCB)
        const openClasses = await this.prisma.courseClass.findMany({
            where: {
                semesterId: targetSemesterId,
                status: 'OPEN',
                subject: {
                    OR: [
                        { majorId: student.majorId },
                        { major: { code: 'KCB' } } // Assuming KCB is General Education
                    ]
                }
            },
            select: { subjectId: true }
        });
        const openSubjectIds = new Set(openClasses.map(c => c.subjectId));

        // 2. Get passed subjects
        const grades = await this.prisma.grade.findMany({
            where: { studentId },
            select: { subjectId: true, totalScore10: true }
        });
        const passedSubjectIds = new Set(
            grades.filter(g => (g.totalScore10 ?? 0) >= 4.0).map(g => g.subjectId)
        );

        // 3. Get currently enrolled subjects (in classes with OPEN status) in THIS semester
        const enrolledInSemester = await this.prisma.enrollment.findMany({
            where: { 
                studentId,
                courseClass: { semesterId: targetSemesterId }
            },
            include: { courseClass: true }
        });
        const enrolledSubjectIds = new Set(enrolledInSemester.map(e => e.courseClass.subjectId));

        // 4. Map subjects with registration metadata
        // FILTER: Only show subjects offered this semester OR already enrolled this semester
        return curriculum
            .filter(item => openSubjectIds.has(item.subjectId) || enrolledSubjectIds.has(item.subjectId))
            .map(item => {
                const subject = item.subject;
                const isPassed = passedSubjectIds.has(subject.id);
                const isEnrolled = enrolledSubjectIds.has(subject.id);

                // Check if all prerequisites are passed
                const missingPrereqs = subject.prerequisites
                    .filter((p) => this.isHardPrerequisite(p.type))
                    .filter(p => !passedSubjectIds.has(p.prerequisiteId))
                    .map(p => p.prerequisiteId);

                return {
                    subjectId: subject.id,
                    subjectCode: subject.code,
                    subjectName: subject.name,
                    semesterId: targetSemesterId,
                    credits: subject.credits,
                    suggestedSemester: item.suggestedSemester,
                    isRequired: item.isRequired,
                    isPassed,
                    isEnrolled,
                    isEligible: !isPassed && !isEnrolled && missingPrereqs.length === 0,
                    missingPrereqs
                };
            });
    }

    async getSemesters() {
        return this.prisma.semester.findMany({
            orderBy: { startDate: 'desc' }
        });
    }

    async getSemestersByStudent(studentIdOrUserId: string) {
        const student = await this.resolveStudent(studentIdOrUserId);
        const plannedSemesters = await this.getStudentSemestersFromPlan(student);
        if (plannedSemesters.length > 0) {
            return plannedSemesters;
        }

        const regularSemesters = await this.prisma.semester.findMany({
            orderBy: { startDate: 'desc' },
        });
        const cohortCode = this.resolveStudentCohortCode(student);
        const cohortStartYear = this.resolveCohortStartYear(student);

        return this.normalizeStudentSemestersForCohort(
            regularSemesters.filter((semester) =>
                this.isRegularSemester(semester) &&
                this.isSemesterInCohortWindow(semester, cohortStartYear),
            ),
            cohortCode,
            cohortStartYear,
        );
    }

    async getClassesBySubject(subjectId: string, semesterId?: string) {
        const targetSemester = await this.resolveTargetSemester(semesterId);

        const classes = await this.prisma.courseClass.findMany({
            where: {
                subjectId,
                semesterId: targetSemester.id,
                status: 'OPEN',
            },
            include: {
                lecturer: true,
                adminClasses: true,
                sessions: {
                    include: { room: true }
                }
            },
            orderBy: { code: 'asc' },
        });

        return classes.map((courseClass) => this.normalizeCourseClass(courseClass));
    }

    async getOpenClasses() {
        const classes = await this.prisma.courseClass.findMany({
            include: { subject: true, adminClasses: true },
            orderBy: { code: 'asc' }
        });

        return classes.map((courseClass) => this.normalizeCourseClass(courseClass));
    }

    async getStudentEnrollments(studentIdOrUserId: string, semesterId?: string) {
        const linkedStudentIds = await this.resolveLinkedStudentIds(studentIdOrUserId);

        const enrollments = await this.prisma.enrollment.findMany({
            where: { 
                studentId: { in: linkedStudentIds },
                ...(semesterId ? { courseClass: { semesterId } } : {})
            },
            include: {
                courseClass: {
                    include: {
                        subject: true,
                        lecturer: true,
                        adminClasses: true,
                        sessions: {
                            include: { room: true }
                        },
                        semester: true,
                    }
                },
                attendances: {
                    include: {
                        session: {
                            include: {
                                room: true,
                            },
                        },
                    },
                    orderBy: { date: 'desc' },
                },
                student: {
                    include: { adminClass: true }
                }
            },
            orderBy: { registeredAt: 'desc' }
        });

        return enrollments.map((enrollment) => ({
            ...enrollment,
            courseClass: this.normalizeCourseClass(enrollment.courseClass),
        }));
    }

    async getAllClassesSchedule() {
        const classes = await this.prisma.courseClass.findMany({
            include: {
                subject: true,
                lecturer: true,
                sessions: {
                    include: { room: true }
                },
                _count: {
                    select: { enrollments: true }
                }
            },
            orderBy: { code: 'asc' }
        });

        return classes.map((courseClass) => this.normalizeCourseClass(courseClass));
    }

    async getClassEnrollments(classId: string) {
        try {
            // First, try the full include
            return await this.prisma.enrollment.findMany({
                where: { courseClassId: classId },
                include: {
                    student: {
                        include: { user: true, adminClass: true }
                    },
                    attendances: {
                        include: {
                            session: {
                                include: {
                                    room: true,
                                },
                            },
                        },
                        orderBy: { date: 'desc' },
                    }
                },
                orderBy: { student: { studentCode: 'asc' } }
            });
        } catch (error) {
            this.logger.error(`Error fetching class enrollments for ${classId}: ${error.message}`);
            
            // Fallback: Fetch without complex attendance includes if it fails
            return this.prisma.enrollment.findMany({
                where: { courseClassId: classId },
                include: {
                    student: {
                        include: { user: true, adminClass: true }
                    },
                    attendances: {
                        orderBy: { date: 'desc' }
                    }
                },
                orderBy: { student: { studentCode: 'asc' } }
            });
        }
    }

    async bulkMarkAttendance(
        date: string,
        attendances: { enrollmentId: string; status: string; note?: string }[],
        options?: { sessionId?: string; classId?: string; method?: string },
    ) {
        const attendanceDate = new Date(date);

        return await this.prisma.$transaction(async (tx) => {
            const sessionMap = new Map<string, any>();
            let explicitSession: any = null;
            const enrollmentMap = new Map<string, { courseClassId: string }>();

            if (options?.sessionId) {
                explicitSession = await tx.classSession.findUnique({
                    where: { id: options.sessionId },
                    select: {
                        id: true,
                        courseClassId: true,
                        date: true,
                        startShift: true,
                        endShift: true,
                    },
                });

                if (!explicitSession) {
                    throw new BadRequestException('Buổi học điểm danh không tồn tại.');
                }

                const explicitDateKey = new Date(explicitSession.date).toISOString().slice(0, 10);
                const attendanceDateKey = attendanceDate.toISOString().slice(0, 10);
                if (explicitDateKey !== attendanceDateKey) {
                    throw new BadRequestException('Ngày điểm danh không khớp với lịch học đã chọn.');
                }
            }

            if (!explicitSession) {
                const enrollmentIds = [...new Set(attendances.map((att) => att.enrollmentId))];
                const enrollmentRows = await tx.enrollment.findMany({
                    where: { id: { in: enrollmentIds } },
                    select: { id: true, courseClassId: true },
                });
                for (const row of enrollmentRows) {
                    enrollmentMap.set(row.id, row);
                }

                const courseClassIds = [...new Set(enrollmentRows.map((row) => row.courseClassId))];
                if (courseClassIds.length) {
                    const sessions = await tx.classSession.findMany({
                        where: {
                            courseClassId: { in: courseClassIds },
                            date: attendanceDate,
                        },
                        select: {
                            id: true,
                            courseClassId: true,
                            date: true,
                            startShift: true,
                            endShift: true,
                        },
                    });
                    for (const session of sessions) {
                        sessionMap.set(session.courseClassId, session);
                    }
                }

                if (options?.classId && !sessionMap.has(options.classId)) {
                    throw new BadRequestException(
                        'Ngày được chọn không có lịch học của lớp học phần này, không thể lưu điểm danh.',
                    );
                }
            }

            const results = await Promise.all(
                attendances.map(async (att) => {
                    const enrollment = enrollmentMap.get(att.enrollmentId)
                        || await tx.enrollment.findUnique({
                            where: { id: att.enrollmentId },
                            select: { courseClassId: true },
                        });
                    const existingAttendance = await tx.attendance.findUnique({
                        where: {
                            enrollmentId_date: {
                                enrollmentId: att.enrollmentId,
                                date: attendanceDate,
                            },
                        },
                        select: { note: true },
                    });
                    const session =
                        explicitSession && enrollment?.courseClassId === explicitSession.courseClassId
                            ? explicitSession
                            : enrollment?.courseClassId
                                ? sessionMap.get(enrollment.courseClassId)
                                : null;

                    return tx.attendance.upsert({
                        where: {
                            enrollmentId_date: {
                                enrollmentId: att.enrollmentId,
                                date: attendanceDate,
                            },
                        },
                        update: {
                            status: att.status,
                            note: this.buildAttendanceNote(existingAttendance?.note, {
                                manualNote: att.note,
                                meta: {
                                    method: options?.method || 'MANUAL',
                                    markedAt: new Date().toISOString(),
                                    isLocationVerified: false,
                                },
                            }),
                            sessionId: session?.id || null,
                        },
                        create: {
                            enrollmentId: att.enrollmentId,
                            date: attendanceDate,
                            status: att.status,
                            note: this.buildAttendanceNote(existingAttendance?.note, {
                                manualNote: att.note,
                                meta: {
                                    method: options?.method || 'MANUAL',
                                    markedAt: new Date().toISOString(),
                                    isLocationVerified: false,
                                },
                            }),
                            sessionId: session?.id || null,
                        },
                    });
                }),
            );

            const enrollmentIds = [...new Set(attendances.map((att) => att.enrollmentId))];
            if (!enrollmentIds.length) {
                return results;
            }

            await this.syncAttendanceDerivedGradesForEnrollments(tx, enrollmentIds);

            return results;
        });
    }

    private async resolveLinkedStudentIds(studentIdOrUserId: string) {
        const student = await this.resolveStudent(studentIdOrUserId);
        if (!student) {
            return [studentIdOrUserId];
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
            orderBy: { code: 'asc' },
            select: { id: true },
        });

        if (!mirrorAdminClass) {
            return linkedStudentIds;
        }

        const mirrorStudent = await this.prisma.student.findFirst({
            where: {
                adminClassId: mirrorAdminClass.id,
                fullName: student.fullName,
                status: 'STUDYING',
            },
            select: { id: true },
        });

        if (mirrorStudent?.id) {
            linkedStudentIds.push(mirrorStudent.id);
        }

        return [...new Set(linkedStudentIds)];
    }
}
