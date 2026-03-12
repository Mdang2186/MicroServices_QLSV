import { Controller, Get, Post, Body, Param, Put, Delete } from "@nestjs/common";
import { ApiBody } from "@nestjs/swagger";
import { StudentService } from "./student.service";
import { CreateStudentDto, UpdateStudentDto } from "@repo/shared-dto";

@Controller("students")
export class StudentController {
  constructor(private readonly studentService: StudentService) { }

  @Post()
  @ApiBody({
      schema: {
          type: "object",
          properties: {
              studentCode: { type: "string", example: "SV2026_001" },
              fullName: { type: "string", example: "Tên Sinh Viên" },
              email: { type: "string", example: "sv_moi@uneti.edu.vn" },
              intake: { type: "string", example: "K16" },
              majorId: { type: "string", example: "MAJ_KTPM" },
              dob: { type: "string", example: "2004-01-01T00:00:00.000Z" },
              status: { type: "string", example: "ACTIVE" }
          }
      }
  })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentService.create(createStudentDto);
  }

  @Get()
  findAll() {
    return this.studentService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.studentService.findOne(id);
  }

  @Get("user/:userId")
  findByUserId(@Param("userId") userId: string) {
    return this.studentService.findByUserId(userId);
  }

  @Put(":id")
  @ApiBody({
      schema: {
          type: "object",
          properties: {
              studentCode: { type: "string", example: "SV001" },
              fullName: { type: "string", example: "Tên Chỉnh Sửa" },
              intake: { type: "string", example: "K14" },
              status: { type: "string", example: "ACTIVE" },
              majorId: { type: "string", example: "Mã Major ID mới" },
              dob: { type: "string", example: "2000-01-01T00:00:00.000Z" }
          }
      }
  })
  update(@Param("id") id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentService.update(id, updateStudentDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.studentService.remove(id);
  }
}
