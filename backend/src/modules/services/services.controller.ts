/**
 * Rutas del catálogo de servicios / productos. Base: /api/servicios
 * Cualquier usuario autenticado puede consultarlo; solo ADMIN lo administra.
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
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/services.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('servicios')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  /**
   * Lista el catálogo. Filtros opcionales:
   *   ?buscar=texto  ?categoria=ENSAYO_MICROBIOLOGICO  ?todos=true (incluye inactivos)
   */
  @Get()
  findAll(
    @Query('buscar') buscar?: string,
    @Query('categoria') categoria?: string,
    @Query('todos') todos?: string,
  ) {
    return this.service.findAll(buscar, categoria, todos === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateServiceDto) {
    return this.service.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateServiceDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
