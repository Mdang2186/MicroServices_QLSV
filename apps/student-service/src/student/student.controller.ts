import { Controller, Get, Post, Body, Param, Put } from "@nestjs/common";
import { StudentService } from "./student.service";
import { CreateStudentDto, UpdateStudentDto } from "@repo/shared-dto";

@Controller("students")
export class StudentController {
  constructor(private readonly studentService: StudentService) { }

  @Post()
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
  update(@Param("id") id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentService.update(id, updateStudentDto);
  }
}
