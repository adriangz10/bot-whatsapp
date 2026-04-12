import { Server } from 'ws';
export declare class EventsService {
    private server;
    setServer(server: Server): void;
    emit(event: string, payload: any): void;
}
