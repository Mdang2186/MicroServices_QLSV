import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { LoginDto, RegisterDto, UserResponse, Role } from "@repo/shared-dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  async validateUser(email: string, pass: string): Promise<any> {
    console.log(`[AuthService] Validating user: ${email}`); // 'email' var might contain username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: email }
        ]
      }
    });

    if (!user) {
      console.log(`[AuthService] User not found: ${email}`);
      // Throwing generic to avoid user enumeration security risk in prod, but specific for dev
      throw new UnauthorizedException(
        `Debug: User not found in DB: ${email}. Check DB connection.`,
      );
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);

    if (!isMatch) {
      console.log(`[AuthService] Password mismatch for user: ${email}`);
      throw new UnauthorizedException(
        `Debug: Password mismatch. Stored hash vs provided password.`,
      );
    }

    const { passwordHash: _password, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto): Promise<UserResponse> {
    // validateUser now throws if failed
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      ...user,
      accessToken: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto): Promise<UserResponse> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          username: registerDto.username,
          email: registerDto.email,
          passwordHash: hashedPassword,
          // Default role is STUDENT if not provided
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
        // Prisma unique constraint code
        throw new ConflictException("Email or Username already exists");
      }
      throw error;
    }
  }
}
