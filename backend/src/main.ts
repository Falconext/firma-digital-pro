/**
 * Punto de entrada del backend.
 * Aquí "arranca" el servidor NestJS y configuramos cosas globales:
 * validación de datos, CORS, prefijo de rutas y el formato de respuesta.
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // Desactivamos el body-parser por defecto para configurar el límite de tamaño.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);

  // Los PDF en base64 pueden pesar varios MB: subimos el límite (default: 100kb).
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

  // Prefijo global: todas las rutas empiezan con /api
  app.setGlobalPrefix(config.get<string>('apiPrefix') ?? 'api');

  // CORS: permite que el frontend (otro origen) llame a esta API
  app.enableCors({
    origin: config.get<string[]>('corsOrigin'),
    credentials: true,
  });

  // Validación automática de los datos que entran (DTOs con class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina campos que no estén en el DTO
      transform: true, // convierte tipos (ej: string "3" -> number 3)
      forbidNonWhitelisted: false,
    }),
  );

  // Formato de respuesta uniforme: { code, data, message, status }
  app.useGlobalInterceptors(new ResponseInterceptor());
  // Manejo uniforme de errores
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.get<number>('port') ?? 3000;
  // Host explícito: evita que en algunos Windows/Node 18+ el server quede
  // escuchando solo en IPv6 y las conexiones por IPv4 (127.0.0.1) fallen.
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API Firma Digital Pro corriendo en http://localhost:${port}`);
}
bootstrap();
