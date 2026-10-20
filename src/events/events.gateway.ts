import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { EventsService } from './events.service';
import { extractApiKey, safeEqual } from '../common/guards/api-key.guard';

@WebSocketGateway()
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');

  constructor(
    private readonly eventsService: EventsService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.eventsService.setServer(server);
    this.logger.log('WebSocket server initialized');
  }

  handleConnection(client: WebSocket, request: IncomingMessage) {
    // La clave puede venir en ?token=... (los navegadores no permiten cabeceras en WebSocket)
    const expected = this.configService.get<string>('ADMIN_API_KEY');
    const url = new URL(request.url ?? '/', 'http://localhost');
    const provided =
      url.searchParams.get('token') ?? extractApiKey(request.headers);

    if (!expected || !provided || !safeEqual(provided, expected)) {
      this.logger.warn('WebSocket connection rejected: invalid token');
      client.close(4401, 'Unauthorized');
      return;
    }

    this.logger.log('Client connected');
  }

  handleDisconnect() {
    this.logger.log('Client disconnected');
  }
}
