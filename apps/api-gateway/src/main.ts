import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:4000,http://localhost:4005")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Gateway runs on 3000
  app.enableCors({
    origin: corsOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle("UNETI Microservices API")
    .setDescription("The UNETI Student Management System API description")
    .setVersion("1.0")
    .addTag("uneti")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document, {
    explorer: true,
    swaggerOptions: {
      urls: [
        { url: "/api/auth/docs-json", name: "Auth Service" },
        { url: "/api/students/docs-json", name: "Student Service" },
        { url: "/api/courses/docs-json", name: "Course Service" },
        { url: "/api/enrollments/docs-json", name: "Enrollment Service" },
        { url: "/api/grades/docs-json", name: "Grade Service" },
      ],
    },
  });

  await app.listen(3000, "0.0.0.0");
  console.log(`API Gateway is running on: ${await app.getUrl()}`);
  console.log(`Swagger UI is available at: ${await app.getUrl()}/api-docs`);
}
bootstrap();

// Forced reload: 2026-04-18 02:45
