import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/clients.dto';

const clientSelect = {
  id: true,
  tipoDocumento: true,
  numeroDocumento: true,
  correo: true,
  telefono: true,
  estado: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClientDto) {
    const exists = await this.prisma.client.findUnique({
      where: {
        tipoDocumento_numeroDocumento: {
          tipoDocumento: dto.tipoDocumento,
          numeroDocumento: dto.numeroDocumento,
        },
      },
    });
    if (exists) {
      throw new ConflictException('El cliente ya está registrado');
    }

    return this.prisma.client.create({
      data: dto,
      select: clientSelect,
    });
  }

  findAll() {
    return this.prisma.client.findMany({
      select: clientSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      select: clientSelect,
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  async update(id: number, dto: UpdateClientDto) {
    await this.findOne(id); // valida existencia
    return this.prisma.client.update({
      where: { id },
      data: dto,
      select: clientSelect,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    // Borrado "suave": lo deshabilitamos en vez de eliminarlo (mantiene historial)
    return this.prisma.client.update({
      where: { id },
      data: { estado: false },
      select: clientSelect,
    });
  }
}
