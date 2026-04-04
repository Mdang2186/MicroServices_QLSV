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
    // Proxy auth requests
    consumer
      .apply(
        createProxyMiddleware({
          target: "http://127.0.0.1:3001", // Auth Service
          changeOrigin: true,
          pathRewrite: {
            "^/api/auth": "/auth",
            "^/api/notifications": "/notifications",
          },
        }),
      )
      .forRoutes(
        { path: "/api/auth", method: RequestMethod.ALL },
        { path: "/api/auth/(.*)", method: RequestMethod.ALL },
        { path: "/api/notifications", method: RequestMethod.ALL },
        { path: "/api/notifications/(.*)", method: RequestMethod.ALL }
      );

    // Proxy student requests
    consumer
      .apply(
        createProxyMiddleware({
          target: "http://127.0.0.1:3002", // Student Service
          changeOrigin: true,
          pathRewrite: {
            "^/api/students": "/students",
            "^/api/student-fees": "/student-fees",
          },
        }),
      )
      .forRoutes(
        { path: "/api/students", method: RequestMethod.ALL },
        { path: "/api/students/(.*)", method: RequestMethod.ALL },
        { path: "/api/student-fees", method: RequestMethod.ALL },
        { path: "/api/student-fees/(.*)", method: RequestMethod.ALL }
      );

    // Proxy enrollment requests
    consumer
      .apply(
        createProxyMiddleware({
          target: "http://127.0.0.1:3004", // Enrollment Service
          changeOrigin: true,
          pathRewrite: {
            "^/api/enrollments": "/enrollments",
          },
        }),
      )
      .forRoutes(
        { path: "/api/enrollments", method: RequestMethod.ALL },
        { path: "/api/enrollments/(.*)", method: RequestMethod.ALL }
      );

    // Proxy course requests
    consumer
      .apply(
        createProxyMiddleware({
          target: "http://127.0.0.1:3003", // Course Service
          changeOrigin: true,
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
          },
        }),
      )
      .forRoutes(
        { path: "/api/courses", method: RequestMethod.ALL },
        { path: "/api/courses/(.*)", method: RequestMethod.ALL },
        { path: "/api/faculties", method: RequestMethod.ALL },
        { path: "/api/faculties/(.*)", method: RequestMethod.ALL },
        { path: "/api/majors", method: RequestMethod.ALL },
        { path: "/api/majors/(.*)", method: RequestMethod.ALL },
        { path: "/api/subjects", method: RequestMethod.ALL },
        { path: "/api/subjects/(.*)", method: RequestMethod.ALL },
        { path: "/api/admin-classes", method: RequestMethod.ALL },
        { path: "/api/admin-classes/(.*)", method: RequestMethod.ALL },
        { path: "/api/semesters", method: RequestMethod.ALL },
        { path: "/api/semesters/(.*)", method: RequestMethod.ALL },
        { path: "/api/lecturers", method: RequestMethod.ALL },
        { path: "/api/lecturers/(.*)", method: RequestMethod.ALL },
        { path: "/api/rooms", method: RequestMethod.ALL },
        { path: "/api/rooms/(.*)", method: RequestMethod.ALL },
        { path: "/api/departments", method: RequestMethod.ALL },
        { path: "/api/departments/(.*)", method: RequestMethod.ALL }
      );

    // Proxy grade requests
    consumer
      .apply(
        createProxyMiddleware({
          target: "http://127.0.0.1:3005", // Grade Service
          changeOrigin: true,
          pathRewrite: {
            "^/api/grades": "/grades",
          },
        }),
      )
      .forRoutes(
        { path: "/api/grades", method: RequestMethod.ALL },
        { path: "/api/grades/(.*)", method: RequestMethod.ALL }
      );
  }
}
