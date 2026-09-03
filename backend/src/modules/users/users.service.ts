/**
 * Servicio de usuarios: lógica CRUD (crear, leer, actualizar, borrar).
 * Regla de oro: NUNCA devolvemos la contraseña ni el refreshToken.
 */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

// Campos seguros para devolver al frontend (sin password ni refreshToken)
const safeSelect = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  rol: true,
  imagenPerfil: true,
  estado: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('El correo ya está registrado');

    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { ...dto, password },
      select: safeSelect,
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: safeSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: safeSelect,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id); // valida existencia
    const data: Record<string, unknown> = { ...dto };
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.update({
      where: { id },
      data,
      select: safeSelect,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    // Borrado "suave": lo deshabilitamos en vez de eliminarlo (mantiene historial)
    return this.prisma.user.update({
      where: { id },
      data: { estado: false },
      select: safeSelect,
    });
  }
}
