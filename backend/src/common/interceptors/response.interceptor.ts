/**
 * Interceptor de respuesta.
 * Envuelve TODA respuesta exitosa en un formato uniforme:
 *   { code: 1, data: <lo que devuelve el controlador>, message, status }
 *
 * Mantenemos "code" para ser compatibles con la lógica del frontend original
 * (donde code === 1 significa éxito y code === 2 significa error de negocio).
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
  status: number;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data) => {
        // Si el controlador ya envió la respuesta por su cuenta (ej: HTML,
        // descarga de PDF con @Res()), no la envolvemos en JSON.
        if (response.headersSent || data === undefined) {
          return data;
        }
        return {
          code: 1,
          data,
          message: 'OK',
          status: response.statusCode,
        };
      }),
    );
  }
}
