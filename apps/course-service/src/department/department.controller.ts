import { Controller, Get, Post, Put, Delete, Body, Param } from "@nestjs/common";
import { DepartmentService } from "./department.service";

@Controller("departments")
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) { }

    @Get()
    findAll() {
        return this.departmentService.findAll();
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.departmentService.findOne(id);
    }

    @Post()
    create(@Body() data: any) {
        return this.departmentService.create(data);
    }

    @Put(":id")
    update(@Param("id") id: string, @Body() data: any) {
        return this.departmentService.update(id, data);
    }

    @Delete(":id")
    delete(@Param("id") id: string) {
        return this.departmentService.delete(id);
    }
}
