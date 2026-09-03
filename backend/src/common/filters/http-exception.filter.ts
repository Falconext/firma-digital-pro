/**
 * Filtro de excepciones.
 * Cuando algo falla, en vez de un error feo, devolvemos un formato uniforme:
 *   { code: 2, data: null, message: "<motivo>", status: <código HTTP> }
 * Así el frontend siempre sabe cómo leer los errores.
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsHandler');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Si NO es un HttpException (login rechazado, validación, etc.) es un error
    // inesperado (bug, base de datos, etc.): lo imprimimos completo en consola
    // para poder depurarlo. Antes se silenciaba y no quedaba rastro.
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        exception instanceof Error ? exception.message : exception,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    let message = 'Ocurrió un error inesperado';
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : ((res as Record<string, unknown>).message as string) ?? message;
      if (Array.isArray(message)) message = message.join(', ');
    }

    response.status(status).json({
      code: 2, // código de "error de negocio" que el frontend ya reconoce
      data: null,
      message,
      status,
    });
  }
}
