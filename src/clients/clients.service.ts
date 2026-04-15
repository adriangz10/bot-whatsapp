import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { Chat } from '../chats/entities/chat.entity';
import { Appointment } from '../google-calendar/entities/appointment.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  async findAll(): Promise<Client[]> {
    return this.clientRepository.find({
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: {
        chats: true,
        appointments: true,
      },
    });

    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    return client;
  }

  async findByUserId(userId: string): Promise<Client | null> {
    return this.clientRepository.findOne({
      where: { userId },
    });
  }

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const client = this.clientRepository.create(
      this.normalizeClientPayload(createClientDto),
    );
    const savedClient = await this.clientRepository.save(client);
    await this.syncRelations(savedClient);
    return this.findOne(savedClient.id);
  }

  async update(id: number, updateClientDto: UpdateClientDto): Promise<Client> {
    const existing = await this.clientRepository.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    const merged = this.clientRepository.merge(
      existing,
      this.normalizeClientPayload(updateClientDto),
    );
    const savedClient = await this.clientRepository.save(merged);
    await this.syncRelations(savedClient);
    return this.findOne(savedClient.id);
  }

  async upsertByUserId(
    userId: string,
    payload: UpdateClientDto = {},
  ): Promise<Client> {
    const existing = await this.findByUserId(userId);
    const normalizedPayload = this.normalizeClientPayload({
      ...payload,
      userId,
    });

    if (!existing) {
      const created = this.clientRepository.create(normalizedPayload);
      const saved = await this.clientRepository.save(created);
      await this.syncRelations(saved);
      return this.findOne(saved.id);
    }

    const merged = this.clientRepository.merge(existing, {
      ...normalizedPayload,
      firstName: normalizedPayload.firstName ?? existing.firstName,
      lastName: normalizedPayload.lastName ?? existing.lastName,
      fullName: normalizedPayload.fullName ?? existing.fullName,
      email: normalizedPayload.email ?? existing.email,
      phone: normalizedPayload.phone ?? existing.phone,
      documentId: normalizedPayload.documentId ?? existing.documentId,
      address: normalizedPayload.address ?? existing.address,
      city: normalizedPayload.city ?? existing.city,
      province: normalizedPayload.province ?? existing.province,
      country: normalizedPayload.country ?? existing.country,
      postalCode: normalizedPayload.postalCode ?? existing.postalCode,
      notes: normalizedPayload.notes ?? existing.notes,
    });
    const saved = await this.clientRepository.save(merged);
    await this.syncRelations(saved);
    return this.findOne(saved.id);
  }

  async delete(id: number): Promise<void> {
    await this.chatRepository
      .createQueryBuilder()
      .update(Chat)
      .set({ clientId: null })
      .where('clientId = :id', { id })
      .execute();

    await this.appointmentRepository
      .createQueryBuilder()
      .update(Appointment)
      .set({ clientId: null })
      .where('clientId = :id', { id })
      .execute();

    await this.clientRepository.delete(id);
  }

  private async syncRelations(client: Client): Promise<void> {
    if (!client.userId) {
      return;
    }

    await this.chatRepository
      .createQueryBuilder()
      .update(Chat)
      .set({ clientId: client.id })
      .where('userId = :userId', { userId: client.userId })
      .execute();

    await this.appointmentRepository
      .createQueryBuilder()
      .update(Appointment)
      .set({ clientId: client.id })
      .where('userId = :userId', { userId: client.userId })
      .execute();
  }

  private normalizeClientPayload(
    payload: CreateClientDto | UpdateClientDto,
  ): Partial<Client> {
    const normalized: Partial<Client> = {
      userId: this.normalizeString(payload.userId),
      firstName: this.normalizeString(payload.firstName),
      lastName: this.normalizeString(payload.lastName),
      fullName: this.normalizeString(payload.fullName),
      email: this.normalizeString(payload.email),
      phone: this.normalizeString(payload.phone),
      documentId: this.normalizeString(payload.documentId),
      address: this.normalizeString(payload.address),
      city: this.normalizeString(payload.city),
      province: this.normalizeString(payload.province),
      country: this.normalizeString(payload.country),
      postalCode: this.normalizeString(payload.postalCode),
      notes: this.normalizeString(payload.notes),
    };

    if (!normalized.fullName) {
      const nameParts = [normalized.firstName, normalized.lastName].filter(
        Boolean,
      );
      normalized.fullName = nameParts.length > 0 ? nameParts.join(' ') : null;
    }

    if (
      normalized.fullName &&
      (!normalized.firstName || !normalized.lastName)
    ) {
      const [firstName, ...rest] = normalized.fullName.split(/\s+/);
      normalized.firstName = normalized.firstName || firstName || null;
      normalized.lastName =
        normalized.lastName || (rest.length > 0 ? rest.join(' ') : null);
    }

    return normalized;
  }

  private normalizeString(value?: string | null): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
