import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Whitelist public endpoints
    const publicEndpoints = ["/api/auth/login", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password"];
    const isPublic = publicEndpoints.some(endpoint => request.originalUrl.startsWith(endpoint));

    if (
      isPublic ||
      request.originalUrl.includes("/api/semesters") ||
      request.originalUrl.includes("/api/courses/faculties") ||
      request.originalUrl.includes("/api/courses/majors") ||
      request.originalUrl.includes("/api/rooms") ||
      request.originalUrl.includes("/api/courses/subjects")
    ) {
      return true;
    }

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || "supersecretkey",
      });
      request["user"] = payload;
      // Forward to microservices via headers
      request.headers['x-user-id'] = payload.sub;
      request.headers['x-user-role'] = payload.role;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
