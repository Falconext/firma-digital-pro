/**
 * Servicio de autenticación.
 * Contiene la lógica de: validar credenciales, generar tokens y refrescarlos.
 */
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /** Verifica email + contraseña y devuelve tokens + datos del usuario. */
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Mensaje genérico para no revelar si el correo existe (buena práctica)
    if (!user || !user.estado) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.rol);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol,
        imagenPerfil: user.imagenPerfil,
      },
    };
  }

  /** Renueva el access token usando un refresh token válido. */
  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Sesión inválida');
      }
      const matches = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!matches) throw new UnauthorizedException('Sesión inválida');

      const tokens = await this.generateTokens(user.id, user.email, user.rol);
      await this.saveRefreshToken(user.id, tokens.refreshToken);
      return tokens;
    } catch {
      throw new UnauthorizedException('No se pudo refrescar la sesión');
    }
  }

  /** Cierra sesión: borra el refresh token guardado. */
  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Sesión cerrada' };
  }

  // ---- helpers privados ----

  private async generateTokens(id: number, email: string, rol: string) {
    const payload: JwtPayload = { sub: id, email, rol };
    const [token, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);
    return { token, refreshToken };
  }

  private async saveRefreshToken(userId: number, refreshToken: string) {
    // Guardamos el refresh token "hasheado" (no en texto plano)
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hash },
    });
  }
}
