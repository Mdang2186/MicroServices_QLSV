import { Controller, Post, Body, UseGuards, Req, Get, Put, Delete, Param } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from "@repo/shared-dto";
import { AuthGuard } from "@nestjs/passport";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post("login")
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post("change-password")
  async changePassword(@Req() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, changePasswordDto);
  }

  @Post("forgot-password")
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post("reset-password")
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // --- Admin User Management ---
  @Get("users")
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Put("users/:id")
  async updateUser(@Param("id") id: string, @Body() data: any) {
    return this.authService.updateUser(id, data);
  }

  @Delete("users/:id")
  async deleteUser(@Param("id") id: string) {
    return this.authService.deleteUser(id);
  }

  // --- Admin Lecturer Management ---
  @Get("lecturers")
  async getAllLecturers() {
    return this.authService.getAllLecturers();
  }

  @Post("lecturers")
  async createLecturer(@Body() data: any) {
    return this.authService.createLecturer(data);
  }

  @Put("lecturers/:id")
  async updateLecturer(@Param("id") id: string, @Body() data: any) {
    return this.authService.updateLecturer(id, data);
  }

  @Delete("lecturers/:id")
  async deleteLecturer(@Param("id") id: string) {
    return this.authService.deleteLecturer(id);
  }

  // --- Admin Student Management ---
  @Post("students")
  async createStudent(@Body() data: any) {
    return this.authService.createStudent(data);
  }
}
