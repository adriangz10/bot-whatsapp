import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  // rawBody: necesario para validar la firma HMAC del webhook de WhatsApp
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // CORS_ORIGINS: lista separada por comas. Sin definir, no se permite ningún origen
  // (el webhook de Meta es servidor a servidor y no necesita CORS).
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useWebSocketAdapter(new WsAdapter(app));

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
