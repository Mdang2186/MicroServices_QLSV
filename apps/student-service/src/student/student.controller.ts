import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Delete,
  Res,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { StudentService } from "./student.service";
import { CreateStudentDto, UpdateStudentDto } from "@repo/shared-dto";

@Controller("students")
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

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
        adminClassId: { type: "string", example: "CL_01" },
        specializationId: { type: "string", example: "SPEC_01" },
        dob: { type: "string", example: "2004-01-01T00:00:00.000Z" },
        status: { type: "string", example: "ACTIVE" },
      },
    },
  })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentService.create(createStudentDto);
  }

  @Get()
  findAll(
    @Query('adminClassId') adminClassId?: string,
    @Query('majorId') majorId?: string,
    @Query('cohort') cohort?: string
  ) {
    return this.studentService.findAll({ adminClassId, majorId, cohort });
  }

  @Get("admin-class/:adminClassId")
  findByAdminClass(@Param("adminClassId") adminClassId: string) {
    return this.studentService.findByAdminClass(adminClassId);
  }

  @Get("resolve/:id")
  resolveStudent(@Param("id") id: string) {
    return this.studentService.findSummary(id);
  }

  @Get("user/:userId/summary")
  findUserSummary(@Param("userId") userId: string) {
    return this.studentService.findSummary(userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.studentService.findOne(id);
  }

  @Get("user/:userId")
  findByUserId(@Param("userId") userId: string) {
    return this.studentService.findByUserId(userId);
  }

  @Get(":id/curriculum-progress")
  getCurriculumProgress(@Param("id") id: string) {
    return this.studentService.getCurriculumProgress(id);
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
        adminClassId: { type: "string", example: "Mã AdminClass mới" },
        specializationId: { type: "string", example: "Mã Specialization mới" },
        dob: { type: "string", example: "2000-01-01T00:00:00.000Z" },
      },
    },
  })
  update(@Param("id") id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentService.update(id, updateStudentDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.studentService.remove(id);
  }
  @Get("template")
  async downloadTemplate() {
    try {
      const content = await this.studentService.getTemplate();
      return {
        filename: "Template_SinhVien.xlsx",
        content,
      };
    } catch (err) {
      return {
        error: true,
        message: err.message || "Failed to generate template",
      };
    }
  }

  @Get("export")
  async exportExcel() {
    try {
      const content = await this.studentService.exportExcel();
      return {
        filename: `DanhSachSinhVien_${new Date().getTime()}.xlsx`,
        content,
      };
    } catch (err) {
      return {
        error: true,
        message: err.message || "Failed to export excel",
      };
    }
  }

  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  async importExcel(@UploadedFile() file: any) {
    return this.studentService.importExcel(file.buffer);
  }
}
