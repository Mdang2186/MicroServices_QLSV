import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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

const DEFAULT_SUPER_ADMIN_USERNAME = "admin";
const DEFAULT_SUPER_ADMIN_EMAIL = "admin@uneti.edu.vn";

function normalizeRole(role?: string | null): string {
  switch (role?.trim().toUpperCase()) {
    case "ADMIN":
    case "SUPER_ADMIN":
      return "SUPER_ADMIN";
    case "ADMIN_STAFF":
    case "ACADEMIC_STAFF":
      return "ACADEMIC_STAFF";
    case "LECTURER":
      return "LECTURER";
    case "STUDENT":
      return "STUDENT";
    default:
      return role?.trim() || Role.STUDENT;
  }
}

function isDefaultSuperAdminAccount(user: {
  username?: string | null;
  email?: string | null;
}) {
  return (
    user.username?.trim().toLowerCase() === DEFAULT_SUPER_ADMIN_USERNAME ||
    user.email?.trim().toLowerCase() === DEFAULT_SUPER_ADMIN_EMAIL
  );
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {
    console.log(
      `[AuthService] Database URL: ${process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ":****@")}`,
    );
  }

  private resolveResetPasswordBaseUrl(clientBaseUrl?: string): string {
    const candidates = [
      clientBaseUrl,
      this.configService.get<string>("RESET_PASSWORD_BASE_URL"),
      "http://localhost:4005",
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;

      try {
        const url = new URL(candidate);
        if (url.protocol === "http:" || url.protocol === "https:") {
          return url.origin;
        }
      } catch {
        continue;
      }
    }

    return "http://localhost:4005";
  }

  private normalizeFamilyMembers(members?: any[] | null) {
    if (!Array.isArray(members)) {
      return [];
    }

    return members
      .map((member) => ({
        relationship: `${member?.relationship || ""}`.trim(),
        fullName: `${member?.fullName || ""}`.trim(),
        birthYear:
          member?.birthYear === undefined || member?.birthYear === null
            ? undefined
            : Number(member.birthYear),
        job: `${member?.job || ""}`.trim() || undefined,
        phone: `${member?.phone || ""}`.trim() || undefined,
        ethnicity: `${member?.ethnicity || ""}`.trim() || undefined,
        religion: `${member?.religion || ""}`.trim() || undefined,
        nationality: `${member?.nationality || ""}`.trim() || undefined,
        workplace: `${member?.workplace || ""}`.trim() || undefined,
        position: `${member?.position || ""}`.trim() || undefined,
        address: `${member?.address || ""}`.trim() || undefined,
      }))
      .filter((member) => member.relationship && member.fullName)
      .map((member) => ({
        ...member,
        birthYear:
          member.birthYear && Number.isFinite(member.birthYear)
            ? Math.trunc(member.birthYear)
            : undefined,
      }));
  }

  private async reconcileUserRole<
    T extends { id: string; username?: string; email?: string; role?: string },
  >(user: T): Promise<T & { role: string }> {
    const normalizedRole = normalizeRole(user.role);
    const expectedRole = isDefaultSuperAdminAccount(user)
      ? "SUPER_ADMIN"
      : normalizedRole;

    if (expectedRole === user.role) {
      return user as T & { role: string };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { role: expectedRole },
    });

    return { ...user, role: expectedRole };
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
      const validatedUser = await this.validateUser(
        loginDto.email,
        loginDto.password,
      );
      const user = await this.reconcileUserRole(validatedUser);

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
    const normalizedRole = isDefaultSuperAdminAccount(registerDto)
      ? "SUPER_ADMIN"
      : normalizeRole(registerDto.role || Role.STUDENT);

    try {
      const user = await this.prisma.user.create({
        data: {
          username: registerDto.username,
          email: registerDto.email,
          passwordHash: hashedPassword,
          role: normalizedRole,
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

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ sessionToken: string; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });
    if (!user) {
      // Don't reveal if user exists for security, but for now we follow dev request
      throw new NotFoundException("Email not found");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    // Generate a reset token with OTP hash inside payload
    const sessionToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: "reset", otpHash },
      { expiresIn: "15m" },
    );

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: "Mã xác nhận khôi phục mật khẩu",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #2563eb;">Yêu cầu lấy lại mật khẩu</h2>
            <p>Chào bạn,</p>
            <p>Hệ thống đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã xác nhận gồm 6 chữ số dưới đây:</p>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e3a8a;">${otp}</span>
            </div>
            <p><strong>Lưu ý:</strong> Mã xác nhận này sẽ hết hạn sau 15 phút.</p>
            <p>Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
          </div>
        `,
      });
      console.log(`[AuthService] Password reset OTP sent to: ${user.email}`);
      console.log(`[AuthService] Reset OTP (Debug): ${otp}`);
      return {
        message: "Mã xác nhận đã được gửi đến email của bạn.",
        sessionToken,
      };
    } catch (error: any) {
      console.error(`[AuthService] Failed to send reset email:`, error.message);
      console.log(`[AuthService] Reset Session Token: ${sessionToken}`);
      console.log(`[AuthService] Reset OTP (Debug): ${otp}`);
      throw new InternalServerErrorException("Không thể gửi email đặt lại mật khẩu do lỗi cấu hình SMTP. Vui lòng liên hệ quản trị viên.");
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    try {
      const token = resetPasswordDto.sessionToken || resetPasswordDto.token;
      if (!token) throw new BadRequestException("Thiếu token xác thực");
        
      const payload = this.jwtService.verify(token);
      if (payload.type !== "reset")
        throw new BadRequestException("Loại token không hợp lệ");

      if (payload.otpHash) {
        if (!resetPasswordDto.otp) {
           throw new BadRequestException("Vui lòng nhập mã xác nhận (OTP)");
        }
        const isMatch = await bcrypt.compare(resetPasswordDto.otp, payload.otpHash);
        if (!isMatch) throw new BadRequestException("Mã xác nhận không chính xác");
      }

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
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException("Mã xác nhận không hợp lệ hoặc đã hết hạn.");
    }
  }

  // --- Admin User Management ---

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((user) => ({
      ...user,
      role: isDefaultSuperAdminAccount(user)
        ? "SUPER_ADMIN"
        : normalizeRole(user.role),
    }));
  }

  async updateUser(id: string, data: any) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id },
      select: { username: true, email: true, role: true },
    });

    if (!currentUser) {
      throw new NotFoundException("User not found");
    }

    const nextIdentity = {
      username: data.username ?? currentUser.username,
      email: data.email ?? currentUser.email,
    };
    const nextRole = isDefaultSuperAdminAccount(nextIdentity)
      ? "SUPER_ADMIN"
      : normalizeRole(data.role ?? currentUser.role);

    return this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        username: data.username,
        role: nextRole,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
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
    const normalizedFamilyMembers = this.normalizeFamilyMembers(
      data.familyMembers,
    );

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
          ...(data.familyMembers !== undefined
            ? {
                familyMembers: {
                  deleteMany: {},
                  ...(normalizedFamilyMembers.length > 0
                    ? {
                        create: normalizedFamilyMembers,
                      }
                    : {}),
                },
              }
            : {}),
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
          ...(normalizedFamilyMembers.length > 0
            ? {
                familyMembers: {
                  create: normalizedFamilyMembers,
                },
              }
            : {}),
        },
      });
    }
  }
}
