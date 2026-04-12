import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { EventsService } from './events.service';
export declare class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly eventsService;
    server: Server;
    private logger;
    constructor(eventsService: EventsService);
    afterInit(server: Server): void;
    handleConnection(client: WebSocket): void;
    handleDisconnect(client: WebSocket): void;
}
