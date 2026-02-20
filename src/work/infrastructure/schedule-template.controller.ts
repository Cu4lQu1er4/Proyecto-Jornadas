import { 
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  UseGuards, 
} from "@nestjs/common";
import { ScheduleTemplateService } from "../application/schedule-template.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { Role } from "src/auth/roles.enum";

@Controller("work/schedule-templates")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ScheduleTemplateController {
  constructor(
    private readonly service: ScheduleTemplateService,
  ) {}

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get()
  list() {
    return this.service.list();
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.service.update(id, body);
  }
}