/**
 * Decorador @Roles('ADMIN')
 * Marca qué roles pueden usar una ruta. Lo lee el RolesGuard.
 */
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
