import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async createNotification(data: { userId: string, title: string, content: string, type?: string }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        content: data.content,
        type: data.type || "INFO",
      }
    });
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }

  async broadcastToRole(role: string, title: string, content: string, type?: string) {
    const users = await this.prisma.user.findMany({
      where: { role },
      select: { id: true }
    });

    if (users.length === 0) return { count: 0 };

    const notifications = users.map(user => ({
      userId: user.id,
      title,
      content,
      type: type || "INFO",
    }));

    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  async deleteNotification(notificationId: string) {
    return this.prisma.notification.delete({
      where: { id: notificationId }
    });
  }
}
