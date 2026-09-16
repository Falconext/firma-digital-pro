/**
 * Servicio del catálogo: los servicios (ensayos, inspecciones, consultoría…)
 * y eventualmente productos que la empresa cotiza a sus clientes.
 * Se "borran" de forma suave (estado = false) para no romper cotizaciones.
 */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriaServicio, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/services.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un ítem del catálogo. Si el código ya existe:
   *  - activo   -> 409 (duplicado)
   *  - inactivo -> se reactiva con los datos nuevos
   */
  async create(dto: CreateServiceDto) {
    const codigo = dto.codigo.trim().toUpperCase();
    const existente = await this.prisma.service.findUnique({ where: { codigo } });

    if (existente?.estado) {
      throw new ConflictException(`Ya existe un servicio con el código ${codigo}`);
    }
    if (existente) {
      return this.prisma.service.update({
        where: { id: existente.id },
        data: { ...dto, codigo, estado: true },
      });
    }
    return this.prisma.service.create({ data: { ...dto, codigo } });
  }

  /**
   * Lista el catálogo (activos por defecto), ordenado por código.
   * @param buscar    filtra por código, nombre o método.
   * @param categoria limita a una categoría.
   * @param todos     true = incluye inactivos.
   */
  findAll(buscar?: string, categoria?: string, todos = false) {
    const where: Prisma.ServiceWhereInput = {};
    if (!todos) where.estado = true;
    if (categoria && categoria in CategoriaServicio) {
      where.categoria = categoria as CategoriaServicio;
    }
    if (buscar?.trim()) {
      const q = buscar.trim();
      where.OR = [
        { codigo: { contains: q } },
        { nombre: { contains: q } },
        { metodo: { contains: q } },
      ];
    }
    return this.prisma.service.findMany({ where, orderBy: { codigo: 'asc' } });
  }

  async findOne(id: number) {
    const item = await this.prisma.service.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Servicio no encontrado');
    return item;
  }

  async update(id: number, dto: UpdateServiceDto) {
    const actual = await this.findOne(id);
    const data: Prisma.ServiceUpdateInput = { ...dto };

    if (dto.codigo) {
      const codigo = dto.codigo.trim().toUpperCase();
      if (codigo !== actual.codigo) {
        const otro = await this.prisma.service.findUnique({ where: { codigo } });
        if (otro && otro.id !== id) {
          throw new ConflictException(`Ya existe otro servicio con el código ${codigo}`);
        }
      }
      data.codigo = codigo;
    }

    return this.prisma.service.update({ where: { id }, data });
  }

  /** Borrado suave: el ítem deja de ofrecerse, pero se conserva. */
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.service.update({
      where: { id },
      data: { estado: false },
    });
  }
}
