import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseIntPipe,
  Delete,
} from "@nestjs/common";
import { ClientsService } from "./clients.service";
import { CreateClientDto, UpdateClientDto } from "./dto/clients.dto";

@Controller("clientes")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}
  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }
  @Get()
  findAll() {
    return this.clientsService.findAll();
  }
   @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.clientsService.findOne(id);
  }
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }
   @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.clientsService.remove(id);
  }
}
