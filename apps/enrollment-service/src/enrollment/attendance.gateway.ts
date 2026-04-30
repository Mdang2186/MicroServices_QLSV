import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentService } from './enrollment.service';

type AttendanceQrCacheEntry = {
    currentOtp: string;
    previousOtp: string | null;
    expires: number;
    latitude: number | null;
    longitude: number | null;
    accuracyMeters: number | null;
    radiusMeters: number;
};

@WebSocketGateway({
    cors: { origin: '*' }
})
export class AttendanceGateway {
    @WebSocketServer()
    server: Server;

    private otpCache = new Map<string, AttendanceQrCacheEntry>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly enrollmentService: EnrollmentService,
    ) {}

    private parseCoordinate(value: unknown) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    private haversineDistanceMeters(
        latitudeA: number,
        longitudeA: number,
        latitudeB: number,
        longitudeB: number,
    ) {
        const toRadians = (value: number) => (value * Math.PI) / 180;
        const earthRadius = 6371000;
        const dLat = toRadians(latitudeB - latitudeA);
        const dLng = toRadians(longitudeB - longitudeA);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(latitudeA)) *
                Math.cos(toRadians(latitudeB)) *
                Math.sin(dLng / 2) ** 2;
        return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
            // Legacy plain text note
        }

        return { manualNote: `${note}`, meta: {} as any };
    }

    private buildAttendanceNote(note: string | null | undefined, meta: Record<string, any>) {
        const current = this.parseAttendanceNote(note);
        return JSON.stringify({
            manualNote: current.manualNote || '',
            meta: {
                ...current.meta,
                ...meta,
            },
        });
    }

    @SubscribeMessage('generate_otp')
    handleGenerateOtp(
        @MessageBody()
        data: {
            sessionId: string;
            latitude?: number;
            longitude?: number;
            accuracyMeters?: number;
            radiusMeters?: number;
        },
        @ConnectedSocket() client: Socket
    ) {
        client.join(`session_${data.sessionId}`);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const latitude = this.parseCoordinate(data.latitude);
        const longitude = this.parseCoordinate(data.longitude);
        const accuracyMeters = this.parseCoordinate(data.accuracyMeters);
        const radiusMeters = Math.max(Number(data.radiusMeters || 150), 50);

        const existing = this.otpCache.get(data.sessionId);
        
        this.otpCache.set(data.sessionId, {
            currentOtp: otp,
            previousOtp: existing?.currentOtp || null,
            expires: Date.now() + 15000,
            latitude,
            longitude,
            accuracyMeters,
            radiusMeters,
        });

        client.emit('otp_generated', {
            data: {
                otp,
                sessionId: data.sessionId,
                radiusMeters,
                hasLocationAnchor: latitude !== null && longitude !== null,
            },
        });
    }

    @SubscribeMessage('scan_qr')
    async handleScanQr(
        @MessageBody()
        data: {
            sessionId: string;
            otp: string;
            studentId: string;
            latitude?: number;
            longitude?: number;
            accuracyMeters?: number;
            deviceInfo?: string;
        },
        @ConnectedSocket() client: Socket
    ) {
        const cached = this.otpCache.get(data.sessionId);

        if (!cached) return { event: 'scan_result', data: { success: false, message: 'QR Code đã hết hạn hoặc không hợp lệ.' } };
        if (Date.now() > cached.expires) return { event: 'scan_result', data: { success: false, message: 'QR Code đã quá hạn.' } };
        
        const isOtpMatch = cached.currentOtp === data.otp || cached.previousOtp === data.otp;
        if (!isOtpMatch) return { event: 'scan_result', data: { success: false, message: 'Mã OTP không khớp.' } };

        try {
            const session = await this.prisma.classSession.findUnique({
                where: { id: data.sessionId },
                include: {
                    courseClass: true,
                    room: true,
                },
            });

            if (!session) return { event: 'scan_result', data: { success: false, message: 'Không tìm thấy buổi học.' } };

            const studentLatitude = this.parseCoordinate(data.latitude);
            const studentLongitude = this.parseCoordinate(data.longitude);
            const accuracyMeters = this.parseCoordinate(data.accuracyMeters);

            let distanceMeters: number | null = null;
            let isLocationVerified = false;
            const hasLocationAnchor =
                cached.latitude !== null && cached.longitude !== null;

            if (hasLocationAnchor) {
                if (studentLatitude === null || studentLongitude === null) {
                    return {
                        event: 'scan_result',
                        data: {
                            success: false,
                            message: 'Thiết bị chưa cung cấp vị trí. Hãy bật GPS và thử lại.',
                        },
                    };
                }

                distanceMeters = this.haversineDistanceMeters(
                    cached.latitude as number,
                    cached.longitude as number,
                    studentLatitude,
                    studentLongitude,
                );
                const allowedDistance =
                    cached.radiusMeters +
                    Math.max(accuracyMeters || 0, cached.accuracyMeters || 0);

                if (distanceMeters > allowedDistance) {
                    return {
                        event: 'scan_result',
                        data: {
                            success: false,
                            message: `Bạn đang ở ngoài phạm vi điểm danh (${Math.round(distanceMeters)}m).`,
                        },
                    };
                }

                isLocationVerified = true;
            }

            let enrollment = await this.prisma.enrollment.findUnique({
                where: {
                    studentId_courseClassId: {
                        studentId: data.studentId,
                        courseClassId: session.courseClassId
                    }
                }
            });

            // If not found directly, try to find through mirror student (legacy <-> modern code linking)
            if (!enrollment) {
                const primaryStudent = await this.prisma.student.findUnique({
                    where: { id: data.studentId },
                    include: { adminClass: true },
                });

                if (primaryStudent?.adminClass?.code) {
                    const legacyMatch = primaryStudent.adminClass.code.match(/^(\d{2})A([12])-([A-Z0-9]+)$/);
                    if (legacyMatch) {
                        const cohort = `K${legacyMatch[1]}`;
                        const section = legacyMatch[2].padStart(2, '0');
                        const majorCode = legacyMatch[3];

                        const mirrorAdminClass = await this.prisma.adminClass.findFirst({
                            where: {
                                cohort,
                                code: { startsWith: `${cohort}-`, contains: `-${majorCode}`, endsWith: `-${section}` },
                            },
                            select: { id: true },
                        });

                        if (mirrorAdminClass) {
                            const mirrorStudent = await this.prisma.student.findFirst({
                                where: { adminClassId: mirrorAdminClass.id, fullName: primaryStudent.fullName, status: 'STUDYING' },
                                select: { id: true },
                            });

                            if (mirrorStudent) {
                                enrollment = await this.prisma.enrollment.findUnique({
                                    where: {
                                        studentId_courseClassId: {
                                            studentId: mirrorStudent.id,
                                            courseClassId: session.courseClassId,
                                        }
                                    }
                                });
                            }
                        }
                    }
                }
            }

            if (!enrollment) return { event: 'scan_result', data: { success: false, message: 'Bạn không có trong danh sách lớp này.' } };

            const existingAttendance = await this.prisma.attendance.findUnique({
                where: {
                    enrollmentId_date: {
                        enrollmentId: enrollment.id,
                        date: session.date,
                    },
                },
                select: { note: true },
            });

            await this.prisma.attendance.upsert({
                where: {
                    enrollmentId_date: {
                        enrollmentId: enrollment.id,
                        date: session.date
                    }
                },
                update: {
                    status: 'PRESENT',
                    sessionId: session.id,
                    note: this.buildAttendanceNote(existingAttendance?.note, {
                        method: isLocationVerified ? 'QR_GEO' : 'QR',
                        markedAt: new Date().toISOString(),
                        isLocationVerified,
                        distanceMeters: typeof distanceMeters === 'number' ? Math.round(distanceMeters) : null,
                    }),
                },
                create: {
                    enrollmentId: enrollment.id,
                    date: session.date,
                    status: 'PRESENT',
                    sessionId: session.id,
                    note: this.buildAttendanceNote(null, {
                        method: isLocationVerified ? 'QR_GEO' : 'QR',
                        markedAt: new Date().toISOString(),
                        isLocationVerified,
                        distanceMeters: typeof distanceMeters === 'number' ? Math.round(distanceMeters) : null,
                    }),
                }
            });

            await this.enrollmentService.syncAttendanceDerivedGrades([enrollment.id]);

            const student = await this.prisma.student.findUnique({
                where: { id: data.studentId },
                select: {
                    fullName: true,
                    studentCode: true,
                },
            });

            this.server.to(`session_${data.sessionId}`).emit('student_scanned', {
                enrollmentId: enrollment.id,
                studentId: data.studentId,
                status: 'PRESENT'
                ,
                studentName: student?.fullName || null,
                studentCode: student?.studentCode || null,
                markedAt: new Date().toISOString(),
                distanceMeters: typeof distanceMeters === 'number' ? Math.round(distanceMeters) : null,
                isLocationVerified,
                method: isLocationVerified ? 'QR_GEO' : 'QR',
            });

            return {
                event: 'scan_result',
                data: {
                    success: true,
                    message: isLocationVerified
                        ? `Điểm danh thành công (${Math.round(distanceMeters as number)}m).`
                        : 'Điểm danh thành công!',
                },
            };
        } catch (error) {
            console.error('QR Scan error', error);
            return { event: 'scan_result', data: { success: false, message: 'Lỗi máy chủ.' } };
        }
    }
}
