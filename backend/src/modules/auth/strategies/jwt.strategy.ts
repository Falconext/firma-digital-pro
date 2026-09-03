/**
 * Estrategia JWT.
 * Extrae el token del header "Authorization: Bearer <token>", lo verifica
 * con el secreto y, si es válido, coloca los datos del usuario en request.user.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number; // id del usuario
  email: string;
  rol: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  // Lo que retorna aquí es lo que estará disponible como request.user
  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, rol: payload.rol };
  }
}
