/**
 * Decorador @CurrentUser()
 * Atajo para obtener el usuario autenticado dentro de un controlador,
 * sin tener que leer manualmente el request.
 *
 * Uso:  miMetodo(@CurrentUser() user: JwtUser) { ... }
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  id: number;
  email: string;
  rol: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
