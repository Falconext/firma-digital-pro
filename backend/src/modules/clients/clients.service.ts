/**
 * Servicio de clientes.
 * Un cliente es la persona o empresa a la que se remiten los documentos
 * firmados y a la que se le emiten cotizaciones. Los clientes se "borran"
 * de forma suave (estado = false) para conservar su historial.
 */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoDocumento } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/clients.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un cliente. Si ya existe uno con el mismo documento:
   *  - activo   -> error 409 (duplicado).
   *  - inactivo -> se reactiva con los datos nuevos (en vez de bloquear).
   */
  async create(dto: CreateClientDto) {
    const existente = await this.findByDocumento(
      dto.tipoDocumento,
      dto.numeroDocumento,
    );

    if (existente?.estado) {
      throw new ConflictException(
        `Ya existe un cliente con ${dto.tipoDocumento} ${dto.numeroDocumento}`,
      );
    }

    if (existente) {
      return this.prisma.client.update({
        where: { id: existente.id },
        data: { ...dto, estado: true },
      });
    }

    return this.prisma.client.create({ data: dto });
  }

  /**
   * Lista clientes activos, ordenados por nombre.
   * @param buscar  filtra por nombre, número de documento o correo.
   * @param todos   true = incluye también los inactivos.
   */
  findAll(buscar?: string, todos = false) {
    const where: Prisma.ClientWhereInput = {};
    if (!todos) where.estado = true;
    if (buscar?.trim()) {
      const q = buscar.trim();
      where.OR = [
        { nombre: { contains: q } },
        { numeroDocumento: { contains: q } },
        { correo: { contains: q } },
      ];
    }
    return this.prisma.client.findMany({ where, orderBy: { nombre: 'asc' } });
  }

  async findOne(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { documents: true } } },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  async update(id: number, dto: UpdateClientDto) {
    const actual = await this.findOne(id);

    // Si cambia el documento, no debe chocar con el de otro cliente.
    const tipo = dto.tipoDocumento ?? actual.tipoDocumento;
    const numero = dto.numeroDocumento ?? actual.numeroDocumento;
    if (tipo !== actual.tipoDocumento || numero !== actual.numeroDocumento) {
      const otro = await this.findByDocumento(tipo, numero);
      if (otro && otro.id !== id) {
        throw new ConflictException(
          `Ya existe otro cliente con ${tipo} ${numero}`,
        );
      }
    }

    return this.prisma.client.update({ where: { id }, data: dto });
  }

  /** Borrado suave: deshabilita el cliente, conservando su historial. */
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.client.update({
      where: { id },
      data: { estado: false },
    });
  }

  private findByDocumento(tipoDocumento: TipoDocumento, numeroDocumento: string) {
    return this.prisma.client.findUnique({
      where: { tipoDocumento_numeroDocumento: { tipoDocumento, numeroDocumento } },
    });
  }
}
