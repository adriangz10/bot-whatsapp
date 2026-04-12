import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, WebSocket } from 'ws';
import { EventsService } from './events.service';

@WebSocketGateway()
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');

  constructor(private readonly eventsService: EventsService) {}

  afterInit(server: Server) {
    this.eventsService.setServer(server);
    this.logger.log('WebSocket server initialized');
  }

  handleConnection(client: WebSocket) {
    this.logger.log('Client connected');
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log('Client disconnected');
  }
}