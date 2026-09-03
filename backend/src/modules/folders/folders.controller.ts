/**
 * Rutas de Carpetas. Base: /api/carpeta
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
import { FoldersService } from './folders.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('carpeta')
export class FoldersController {
  constructor(private readonly service: FoldersService) {}

  /** Crea una carpeta (en la raíz o dentro de otra). */
  @Post()
  create(@Body() dto: CreateFolderDto) {
    return this.service.create(dto);
  }

  /** Árbol completo de carpetas (para el panel lateral). */
  @Get('arbol')
  tree() {
    return this.service.tree();
  }

  /**
   * Contenido de una carpeta (subcarpetas + documentos + migas de pan).
   * Usa ?padre=<id> para entrar a una carpeta; sin parámetro = raíz.
   */
  @Get('contenido')
  contents(@Query('padre') padre?: string) {
    const parentId = padre ? Number(padre) : null;
    return this.service.contents(parentId);
  }

  /** Renombra y/o mueve una carpeta. */
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFolderDto) {
    return this.service.update(id, dto);
  }

  /** Elimina una carpeta (y subcarpetas). Los documentos se mueven a la raíz. */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
