import { Module, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { createProxyMiddleware } from "http-proxy-middleware";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "./auth.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "supersecretkey",
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    console.log("Configuring API Gateway Middlewares...");
    const authTarget = process.env.AUTH_SERVICE_URL || "http://127.0.0.1:3001";
    const studentTarget =
      process.env.STUDENT_SERVICE_URL || "http://127.0.0.1:3002";
    const courseTarget =
      process.env.COURSE_SERVICE_URL || "http://127.0.0.1:3003";
    const enrollmentTarget =
      process.env.ENROLLMENT_SERVICE_URL || "http://127.0.0.1:3004";
    const gradeTarget = process.env.GRADE_SERVICE_URL || "http://127.0.0.1:3005";

    // Proxy auth requests
    consumer
      .apply(
        createProxyMiddleware({
          target: authTarget,
          changeOrigin: true,
          pathRewrite: {
            "^/api/auth": "/auth",
            "^/api/notifications": "/notifications",
          },
        }),
      )
      .forRoutes(
        { path: "/api/auth", method: RequestMethod.ALL },
        { path: "/api/auth/*", method: RequestMethod.ALL },
        { path: "/api/notifications", method: RequestMethod.ALL },
        { path: "/api/notifications/*", method: RequestMethod.ALL },
      );

    // Proxy student requests
    consumer
      .apply(
        createProxyMiddleware({
          target: studentTarget,
          changeOrigin: true,
          proxyTimeout: 60000,
          timeout: 60000,
          pathRewrite: {
            "^/api/students": "/students",
            "^/api/student-fees": "/student-fees",
            "^/api/training-results": "/training-results",
          },
        }),
      )
      .forRoutes(
        { path: "/api/students", method: RequestMethod.ALL },
        { path: "/api/students/*", method: RequestMethod.ALL },
        { path: "/api/student-fees", method: RequestMethod.ALL },
        { path: "/api/student-fees/*", method: RequestMethod.ALL },
        { path: "/api/training-results", method: RequestMethod.ALL },
        { path: "/api/training-results/*", method: RequestMethod.ALL },
      );

    // Proxy enrollment requests
    consumer
      .apply(
        createProxyMiddleware({
          target: enrollmentTarget,
          changeOrigin: true,
          proxyTimeout: 60000,
          timeout: 60000,
          pathRewrite: {
            "^/api/enrollments": "/enrollments",
          },
        }),
      )
      .forRoutes(
        { path: "/api/enrollments", method: RequestMethod.ALL },
        { path: "/api/enrollments/*", method: RequestMethod.ALL },
      );

    // Proxy course requests
    consumer
      .apply(
        createProxyMiddleware({
          target: courseTarget,
          changeOrigin: true,
          proxyTimeout: 60000,
          timeout: 60000,
          pathRewrite: {
            "^/api/courses": "/courses",
            "^/api/faculties": "/faculties",
            "^/api/majors": "/majors",
            "^/api/subjects": "/subjects",
            "^/api/admin-classes": "/admin-classes",
            "^/api/semesters": "/semesters",
            "^/api/lecturers": "/lecturers",
            "^/api/rooms": "/rooms",
            "^/api/departments": "/departments",
            "^/api/cohorts": "/cohorts",
            "^/api/semester-plan": "/semester-plan",
          },
          onProxyReq: (proxyReq, req: any, res) => {
            console.log(`[Proxy] ${req.method} ${req.url} -> ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
          },
        }),
      )
      .forRoutes(
        { path: "/api/courses", method: RequestMethod.ALL },
        { path: "/api/courses/*", method: RequestMethod.ALL },
        { path: "/api/faculties", method: RequestMethod.ALL },
        { path: "/api/faculties/*", method: RequestMethod.ALL },
        { path: "/api/majors", method: RequestMethod.ALL },
        { path: "/api/majors/*", method: RequestMethod.ALL },
        { path: "/api/subjects", method: RequestMethod.ALL },
        { path: "/api/subjects/*", method: RequestMethod.ALL },
        { path: "/api/admin-classes", method: RequestMethod.ALL },
        { path: "/api/admin-classes/*", method: RequestMethod.ALL },
        { path: "/api/semesters", method: RequestMethod.ALL },
        { path: "/api/semesters/*", method: RequestMethod.ALL },
        { path: "/api/lecturers", method: RequestMethod.ALL },
        { path: "/api/lecturers/*", method: RequestMethod.ALL },
        { path: "/api/rooms", method: RequestMethod.ALL },
        { path: "/api/rooms/*", method: RequestMethod.ALL },
        { path: "/api/departments", method: RequestMethod.ALL },
        { path: "/api/departments/*", method: RequestMethod.ALL },
        { path: "/api/cohorts", method: RequestMethod.ALL },
        { path: "/api/cohorts/*", method: RequestMethod.ALL },
        { path: "/api/semester-plan", method: RequestMethod.ALL },
        { path: "/api/semester-plan/*", method: RequestMethod.ALL },
      );

    // Proxy grade requests
    consumer
      .apply(
        createProxyMiddleware({
          target: gradeTarget,
          changeOrigin: true,
          proxyTimeout: 60000,
          timeout: 60000,
          pathRewrite: {
            "^/api/grades": "/grades",
          },
        }),
      )
      .forRoutes(
        { path: "/api/grades", method: RequestMethod.ALL },
        { path: "/api/grades/*", method: RequestMethod.ALL },
      );
  }
}
