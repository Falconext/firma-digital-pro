/**
 * Servicio de firmantes (las personas que firman los documentos).
 * En el proyecto original estos datos estaban "quemados" en el código.
 * Aquí son datos reales de base de datos que el admin puede administrar.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateSignatoryDto,
  UpdateSignatoryDto,
} from './dto/signatory.dto';

@Injectable()
export class SignatoriesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateSignatoryDto) {
    return this.prisma.signatory.create({ data: dto });
  }

  findAll() {
    return this.prisma.signatory.findMany({
      where: { estado: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.signatory.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Firmante no encontrado');
    return item;
  }

  async update(id: number, dto: UpdateSignatoryDto) {
    await this.findOne(id);
    return this.prisma.signatory.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.signatory.update({
      where: { id },
      data: { estado: false },
    });
  }
}
