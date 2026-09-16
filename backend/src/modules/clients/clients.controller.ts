/**
 * Rutas de clientes. Base: /api/clientes
 * Cualquier usuario autenticado puede consultarlos; solo ADMIN los administra
 * (mismo criterio que los firmantes).
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ClientsService } from './clients.service';
import { ReniecService } from '../../common/reniec/reniec.service';
import { CreateClientDto, UpdateClientDto } from './dto/clients.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('clientes')
export class ClientsController {
  constructor(
    private readonly service: ClientsService,
    private readonly reniec: ReniecService,
  ) {}

  /** Lista clientes activos. ?buscar=texto filtra; ?todos=true incluye inactivos. */
  @Get()
  findAll(@Query('buscar') buscar?: string, @Query('todos') todos?: string) {
    return this.service.findAll(buscar, todos === 'true');
  }

  /**
   * Consulta RENIEC (DNI) o SUNAT (RUC) para autocompletar el registro.
   * Ej: GET /api/clientes/consultar/DNI/41729763
   * Va ANTES de ':id' para que "consultar" no se interprete como un id.
   */
  @Get('consultar/:tipo/:numero')
  consultar(@Param('tipo') tipo: string, @Param('numero') numero: string) {
    return this.reniec.consultar(tipo, numero);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.service.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
