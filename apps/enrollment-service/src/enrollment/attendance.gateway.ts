import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
    cors: { origin: '*' }
})
export class AttendanceGateway {
    @WebSocketServer()
    server: Server;

    private otpCache = new Map<string, { otp: string; expires: number }>();

    constructor(private readonly prisma: PrismaService) {}

    @SubscribeMessage('generate_otp')
    handleGenerateOtp(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket
    ) {
        client.join(`session_${data.sessionId}`);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        this.otpCache.set(data.sessionId, { otp, expires: Date.now() + 15000 });
        return { event: 'otp_generated', data: { otp, sessionId: data.sessionId } };
    }

    @SubscribeMessage('scan_qr')
    async handleScanQr(
        @MessageBody() data: { sessionId: string; otp: string; studentId: string },
        @ConnectedSocket() client: Socket
    ) {
        const cached = this.otpCache.get(data.sessionId);

        if (!cached) return { event: 'scan_result', data: { success: false, message: 'QR Code đã hết hạn hoặc không hợp lệ.' } };
        if (Date.now() > cached.expires) return { event: 'scan_result', data: { success: false, message: 'QR Code đã quá hạn.' } };
        if (cached.otp !== data.otp) return { event: 'scan_result', data: { success: false, message: 'Mã OTP không khớp.' } };

        try {
            const session = await this.prisma.classSession.findUnique({
                where: { id: data.sessionId },
                include: { courseClass: true }
            });

            if (!session) return { event: 'scan_result', data: { success: false, message: 'Không tìm thấy buổi học.' } };

            const enrollment = await this.prisma.enrollment.findUnique({
                where: {
                    studentId_courseClassId: {
                        studentId: data.studentId,
                        courseClassId: session.courseClassId
                    }
                }
            });

            if (!enrollment) return { event: 'scan_result', data: { success: false, message: 'Bạn không có trong danh sách lớp này.' } };

            await this.prisma.attendance.upsert({
                where: {
                    enrollmentId_date: {
                        enrollmentId: enrollment.id,
                        date: session.date
                    }
                },
                update: { status: 'PRESENT', sessionId: session.id },
                create: { enrollmentId: enrollment.id, date: session.date, status: 'PRESENT', sessionId: session.id }
            });

            this.server.to(`session_${data.sessionId}`).emit('student_scanned', {
                enrollmentId: enrollment.id,
                studentId: data.studentId,
                status: 'PRESENT'
            });

            return { event: 'scan_result', data: { success: true, message: 'Điểm danh thành công!' } };
        } catch (error) {
            console.error('QR Scan error', error);
            return { event: 'scan_result', data: { success: false, message: 'Lỗi máy chủ.' } };
        }
    }
}
