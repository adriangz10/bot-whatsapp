import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { Chat } from '../chats/entities/chat.entity';
import { Appointment } from '../google-calendar/entities/appointment.entity';
export declare class ClientsService {
    private readonly clientRepository;
    private readonly chatRepository;
    private readonly appointmentRepository;
    constructor(clientRepository: Repository<Client>, chatRepository: Repository<Chat>, appointmentRepository: Repository<Appointment>);
    findAll(): Promise<Client[]>;
    findOne(id: number): Promise<Client>;
    findByUserId(userId: string): Promise<Client | null>;
    create(createClientDto: CreateClientDto): Promise<Client>;
    update(id: number, updateClientDto: UpdateClientDto): Promise<Client>;
    upsertByUserId(userId: string, payload?: UpdateClientDto): Promise<Client>;
    delete(id: number): Promise<void>;
    private syncRelations;
    private normalizeClientPayload;
    private normalizeString;
}
