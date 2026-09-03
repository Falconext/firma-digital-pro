/**
 * Guard de autenticación JWT.
 * Un "guard" decide si una petición puede pasar o no.
 * Este verifica que venga un token válido en el header Authorization.
 *
 * Uso:  @UseGuards(JwtAuthGuard)
 */
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
