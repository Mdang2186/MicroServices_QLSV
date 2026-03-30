import { Controller, Post, Body, UseGuards, Req, Get, Put, Delete, Param } from "@nestjs/common";
import { ApiBody } from "@nestjs/swagger";
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
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string", example: "admin@uneti.edu.vn" },
        password: { type: "string", example: "newpassword123" },
        role: { type: "string", example: "ADMIN" },
      }
    }
  })
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
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        lectureCode: { type: "string", example: "GV001" },
        fullName: { type: "string", example: "Nguyễn Văn Giảng Viên" },
        email: { type: "string", example: "gv@uneti.edu.vn" },
        facultyId: { type: "string", example: "Khoa CNTT" },
        degree: { type: "string", example: "Thạc sĩ" },
        phone: { type: "string", example: "0123456789" }
      }
    }
  })
  async createLecturer(@Body() data: any) {
    return this.authService.createLecturer(data);
  }

  @Put("lecturers/:id")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        lectureCode: { type: "string", example: "GV001" },
        fullName: { type: "string", example: "Nguyễn Văn Giảng Viên Edit" },
        email: { type: "string", example: "gvsms@uneti.edu.vn" },
        facultyId: { type: "string", example: "Khoa CNTT" },
        degree: { type: "string", example: "Tiến sĩ" },
        phone: { type: "string", example: "0987654321" }
      }
    }
  })
  async updateLecturer(@Param("id") id: string, @Body() data: any) {
    return this.authService.updateLecturer(id, data);
  }

  @Delete("lecturers/:id")
  async deleteLecturer(@Param("id") id: string) {
    return this.authService.deleteLecturer(id);
  }

  @Post("lecturers/:id/grant-account")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        username: { type: "string" },
        email: { type: "string" },
        password: { type: "string" }
      }
    }
  })
  async grantAccount(@Param("id") id: string, @Body() data: any) {
    return this.authService.grantAccount(id, data);
  }

  // --- Admin Student Management ---
  @Post("students")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string", example: "Nguyễn Văn Sinh Viên" },
        email: { type: "string", example: "sv@uneti.edu.vn" },
        major: { type: "string", example: "Công nghệ thông tin" },
        dob: { type: "string", example: "2000-01-01" }
      }
    }
  })
  async createStudent(@Body() data: any) {
    return this.authService.createStudent(data);
  }
}
