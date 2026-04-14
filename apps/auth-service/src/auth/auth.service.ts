import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { MailerService } from "@nestjs-modules/mailer";
import * as bcrypt from "bcryptjs";
import {
  LoginDto,
  RegisterDto,
  UserResponse,
  Role,
  ChangePasswordDto,
  ResetPasswordDto,
  ForgotPasswordDto,
} from "@repo/shared-dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {
    console.log(
      `[AuthService] Database URL: ${process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ":****@")}`,
    );
  }

  async validateUser(email: string, pass: string): Promise<any> {
    try {
      console.log(`[AuthService] Validating user: "${email}"`);
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: email }, { username: email }],
        },
      });

      if (!user) {
        console.log(`[AuthService] User not found: ${email}`);
        throw new UnauthorizedException(`User not found: ${email}`);
      }

      console.log(
        `[AuthService] User found, comparing password for: ${user.id}`,
      );
      const isMatch = await bcrypt.compare(pass, user.passwordHash);

      if (!isMatch) {
        console.log(`[AuthService] Password mismatch for user: ${email}`);
        throw new UnauthorizedException(`Password mismatch.`);
      }

      const { passwordHash: _password, ...result } = user;
      return result;
    } catch (error: any) {
      console.error(
        `[AuthService] Error in validateUser: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<UserResponse> {
    try {
      console.log(`[AuthService] Login attempt: ${loginDto.email}`);
      const user = await this.validateUser(loginDto.email, loginDto.password);

      let profileId = undefined;
      let fullName = user.username; // Default to username
      let degree = undefined;

      if (user.role === Role.STUDENT) {
        let student = await this.prisma.student.findUnique({
          where: { userId: user.id },
          select: { id: true, fullName: true, studentCode: true },
        });

        // Auto-recovery: If no profile found by userId, try to find by studentCode (username)
        if (!student && user.username) {
          const existingStudent = await this.prisma.student.findUnique({
            where: { studentCode: user.username },
          });

          if (existingStudent) {
            // Link them
            student = await this.prisma.student.update({
              where: { id: existingStudent.id },
              data: { userId: user.id },
              select: { id: true, fullName: true, studentCode: true },
            });
          } else {
            // Determine a fallback major for auto-created profile
            const firstMajor = await this.prisma.major.findFirst();
            // Create a fallback profile
            student = await this.prisma.student.create({
              data: {
                userId: user.id,
                studentCode: user.username,
                fullName: user.username,
                intake: "K19",
                dob: new Date("2000-01-01"),
                status: "ACTIVE",
                majorId: firstMajor ? firstMajor.id : "CNTT",
              },
              select: { id: true, fullName: true, studentCode: true },
            });
          }
        }

        if (student) {
          profileId = student.id;
          fullName = student.fullName || student.studentCode;
        }
      } else if (user.role === Role.LECTURER) {
        const lecturer = await this.prisma.lecturer.findUnique({
          where: { userId: user.id },
          select: { id: true, fullName: true, degree: true },
        });
        if (lecturer) {
          profileId = lecturer.id;
          fullName = lecturer.fullName;
          degree = lecturer.degree;
        } else {
          degree = "Giảng viên";
        }
      } else if (user.role === "SUPER_ADMIN") {
        fullName = "Quản trị viên";
      } else if (user.role === "ACADEMIC_STAFF") {
        fullName = "Cán bộ Đào tạo";
      }

      const payload = {
        username: user.username,
        sub: user.id,
        role: user.role,
        profileId,
      };
      const response: UserResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileId,
        fullName,
        degree,
        accessToken: this.jwtService.sign(payload),
      };
      console.log(
        `[AuthService] Login successful for: ${user.id}, role: ${user.role}, name: ${fullName}, degree: ${degree}`,
      );
      return response;
    } catch (error: any) {
      console.error(
        `[AuthService] Error in login: ${error.message}`,
        error.stack,
      );
      if (error instanceof UnauthorizedException) throw error;
      throw new BadRequestException(`Login failed: ${error.message}`);
    }
  }

  async register(registerDto: RegisterDto): Promise<UserResponse> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          username: registerDto.username,
          email: registerDto.email,
          passwordHash: hashedPassword,
          role: registerDto.role || Role.STUDENT,
        },
      });
      const { passwordHash: _passwordHash, ...result } = user;
      return {
        ...result,
        role: result.role.toString(),
      };
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new ConflictException("Email or Username already exists");
      }
      throw error;
    }
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const isMatch = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.passwordHash,
    );
    if (!isMatch)
      throw new BadRequestException("Current password is incorrect");

    const newHashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHashedPassword },
    });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });
    if (!user) {
      // Don't reveal if user exists for security, but for now we follow dev request
      throw new NotFoundException("Email not found");
    }

    // Generate a reset token (simple JWT for MVP)
    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: "reset" },
      { expiresIn: "15m" },
    );

    // In a real app, we'd store this token or a hash of it in DB with expiry
    // For now, we send the token via email
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: "Reset Your Password",
      html: `
        <h3>Reset Password Request</h3>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
    console.log(`[AuthService] Password reset email sent to: ${user.email}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    try {
      const payload = this.jwtService.verify(resetPasswordDto.token);
      if (payload.type !== "reset")
        throw new BadRequestException("Invalid token type");

      const hashedPassword = await bcrypt.hash(
        resetPasswordDto.newPassword,
        10,
      );
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { passwordHash: hashedPassword },
      });
      console.log(
        `[AuthService] Password reset successful for user: ${payload.sub}`,
      );
    } catch (error) {
      throw new BadRequestException("Invalid or expired reset token");
    }
  }

  // --- Admin User Management ---

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateUser(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        username: data.username,
        role: data.role,
      },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  // --- Admin Lecturer Management ---

  async getAllLecturers() {
    return this.prisma.lecturer.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { fullName: "asc" },
    });
  }

  async createLecturer(data: any) {
    // Check if lecturer code already exists
    const existingLecturer = await this.prisma.lecturer.findUnique({
      where: { lectureCode: data.lectureCode },
    });
    if (existingLecturer) {
      throw new ConflictException(
        `Mã giảng viên ${data.lectureCode} đã tồn tại trong hệ thống`,
      );
    }

    // [MODIFIED] Create Lecturer Profile ONLY (No account yet)
    return this.prisma.lecturer.create({
      data: {
        lectureCode: data.lectureCode,
        fullName: data.fullName,
        facultyId: data.facultyId,
        degree: data.degree,
        phone: data.phone,
        // userId: null // Defaults to null in schema
      },
    });
  }

  async grantAccount(id: string, data: any) {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!lecturer) throw new NotFoundException("Giảng viên không tồn tại");
    if (lecturer.userId)
      throw new ConflictException("Giảng viên này đã có tài khoản");

    // Default password to 123456 or from data
    const password = data.password || "123456";
    const hashedPassword = await bcrypt.hash(password, 10);
    const email =
      data.email || `${lecturer.lectureCode.toLowerCase()}@uneti.edu.vn`;
    const username = data.username || lecturer.lectureCode;

    // 1. Create User
    const user = await this.prisma.user.create({
      data: {
        username: username,
        email: email,
        passwordHash: hashedPassword,
        role: Role.LECTURER,
      },
    });

    // 2. Link User to Lecturer
    return this.prisma.lecturer.update({
      where: { id },
      data: { userId: user.id },
    });
  }

  async updateLecturer(id: string, data: any) {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!lecturer) throw new NotFoundException("Lecturer not found");

    // Check if new code is taken by someone else
    if (data.lectureCode && data.lectureCode !== lecturer.lectureCode) {
      const existing = await this.prisma.lecturer.findUnique({
        where: { lectureCode: data.lectureCode },
      });
      if (existing)
        throw new ConflictException(
          `Mã giảng viên ${data.lectureCode} đã được sử dụng`,
        );
    }

    // Update User if it exists
    if (lecturer.userId) {
      await this.prisma.user.update({
        where: { id: lecturer.userId },
        data: {
          email: data.email,
          username:
            data.username ||
            (data.email ? data.email.split("@")[0] : undefined),
        },
      });
    }

    return this.prisma.lecturer.update({
      where: { id },
      data: {
        lectureCode: data.lectureCode,
        fullName: data.fullName,
        facultyId: data.facultyId,
        degree: data.degree,
        phone: data.phone,
      },
    });
  }

  async deleteLecturer(id: string) {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { id } });
    if (!lecturer) throw new NotFoundException("Lecturer not found");

    // If lecturer has a user, delete the user (cascades to lecturer profile)
    if (lecturer.userId) {
      return this.prisma.user.delete({ where: { id: lecturer.userId } });
    }

    // If no user, delete the lecturer profile directly
    return this.prisma.lecturer.delete({ where: { id } });
  }

  // --- Admin Student Management (Proxying to maintain IAM consistency) ---

  async createStudent(data: any) {
    // 1. Check if student profile already exists by studentCode
    const existingStudent = await this.prisma.student.findUnique({
      where: { studentCode: data.studentCode },
    });

    // 2. If student has an account already, throw error
    if (existingStudent && existingStudent.userId) {
      throw new ConflictException(
        `Mã sinh viên ${data.studentCode} đã có tài khoản trong hệ thống`,
      );
    }

    // 3. Create User with STUDENT role
    const hashedPassword = await bcrypt.hash("123456", 10);
    const user = await this.prisma.user.create({
      data: {
        username: data.username || data.studentCode || data.email.split("@")[0],
        email: data.email,
        passwordHash: hashedPassword,
        role: Role.STUDENT,
      },
    });

    // 4. Update or Create Student Profile
    if (existingStudent) {
      // Link existing profile to new account
      return this.prisma.student.update({
        where: { id: existingStudent.id },
        data: {
          userId: user.id,
          // Update other fields if provided
          fullName: data.fullName || existingStudent.fullName,
          intake: data.intake || existingStudent.intake,
          majorId: data.majorId || existingStudent.majorId,
          dob: data.dob ? new Date(data.dob) : existingStudent.dob,
        },
      });
    } else {
      // Create new profile linked to new account
      const major = await this.prisma.major.findFirst();
      return this.prisma.student.create({
        data: {
          userId: user.id,
          studentCode: data.studentCode,
          fullName: data.fullName,
          intake: data.intake,
          status: data.status || "ACTIVE",
          majorId: data.majorId || major?.id,
          dob: data.dob ? new Date(data.dob) : new Date("2000-01-01"),
        },
      });
    }
  }
}
