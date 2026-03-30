import { Controller, Get, Post, Body, Param, Patch, Delete, Req } from "@nestjs/common";
import { NotificationService } from "./notification.service";

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(@Body() body: { userId: string, title: string, content: string, type?: string }) {
    return this.notificationService.createNotification(body);
  }

  @Get('user/:userId')
  getByUser(@Param('userId') userId: string) {
    return this.notificationService.getUserNotifications(userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Post('user/:userId/read-all')
  markAllAsRead(@Param('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationService.deleteNotification(id);
  }

  @Post('broadcast')
  broadcast(
    @Body() body: { role: string; title: string; content: string; type?: string }
  ) {
    return this.notificationService.broadcastToRole(
      body.role,
      body.title,
      body.content,
      body.type
    );
  }
}
