import { Injectable } from '@nestjs/common';
import { Server } from 'ws';

@Injectable()
export class EventsService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emit(event: string, payload: any) {
    if (!this.server) return;

    const data = JSON.stringify({ event, payload });
    this.server.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }
}