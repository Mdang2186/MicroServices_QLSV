import { Controller, Get, Post, Body } from "@nestjs/common";
import { MajorService } from "./major.service";

@Controller("majors")
export class MajorController {
    constructor(private readonly majorService: MajorService) { }

    @Get()
    findAll() {
        return this.majorService.findAll();
    }

    @Post()
    create(@Body() data: any) {
        return this.majorService.create(data);
    }
}
