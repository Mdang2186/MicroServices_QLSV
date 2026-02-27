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
    // Proxy auth requests
    consumer
      .apply(
        createProxyMiddleware({
          target: "http://127.0.0.1:3001", // Auth Service
          changeOrigin: true,
          pathRewrite: {
            "^/api/auth": "/auth",
          },
        }),
      )
      .forRoutes({ path: "api/auth/*", method: RequestMethod.ALL });

    // Proxy student requests
    consumer
      .apply(
        createProxyMiddleware({
          target: "http://127.0.0.1:3002", // Student Service
          changeOrigin: true,
          pathRewrite: {
            "^/api/students": "/students",
          },
        }),
      )
      .forRoutes({ path: "api/students*", method: RequestMethod.ALL });

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
      .forRoutes({ path: "api/enrollments*", method: RequestMethod.ALL });

    // Proxy course requests
    consumer
      .apply(
        createProxyMiddleware({
          target: "http://127.0.0.1:3003", // Course Service
          changeOrigin: true,
          pathRewrite: {
            "^/api/courses": "/courses",
            "^/api/majors": "/majors",
            "^/api/subjects": "/subjects",
          },
        }),
      )
      .forRoutes(
        { path: "api/courses*", method: RequestMethod.ALL },
        { path: "api/majors*", method: RequestMethod.ALL },
        { path: "api/subjects*", method: RequestMethod.ALL }
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
      .forRoutes({ path: "api/grades*", method: RequestMethod.ALL });
  }
}
