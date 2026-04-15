import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
export declare class ClientsController {
    private readonly clientsService;
    constructor(clientsService: ClientsService);
    findAll(): Promise<import("./entities/client.entity").Client[]>;
    findOne(id: number): Promise<import("./entities/client.entity").Client>;
    create(body: CreateClientDto): Promise<import("./entities/client.entity").Client>;
    update(id: number, body: UpdateClientDto): Promise<import("./entities/client.entity").Client>;
    delete(id: number): Promise<{
        message: string;
    }>;
}
