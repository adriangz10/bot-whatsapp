import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ChatsService, ChatFilters, PaginationParams } from './chats.service';
import { UpdateChatDto, CreateChatDto } from './dto/chat.dto';
import { ChatStatus, ChatPriority } from './entities/chat.entity';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  // Listar chats con filtros y paginación
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('sortBy') sortBy: string = 'updatedAt',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
    @Query('status') status?: ChatStatus,
    @Query('priority') priority?: ChatPriority,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
  ) {
    const pagination: PaginationParams = {
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 20, 100),
      sortBy,
      sortOrder,
    };

    const filters: ChatFilters = {
      status,
      priority,
      search,
      tags: tags ? tags.split(',') : undefined,
    };

    return this.chatsService.findAll(filters, pagination);
  }

  // Estadísticas generales
  @Get('stats')
  async getStats() {
    return this.chatsService.getStats();
  }

  // Obtener un chat por ID
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.chatsService.findOne(id);
  }

  // Obtener un chat con todos sus mensajes
  @Get(':id/messages')
  async getChatWithMessages(@Param('id', ParseIntPipe) id: number) {
    return this.chatsService.getChatWithMessages(id);
  }

  // Crear nuevo chat
  @Post()
  async create(@Body() createChatDto: CreateChatDto) {
    return this.chatsService.create(createChatDto);
  }

  // Actualizar chat (estado, prioridad, tags, notas)
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateChatDto: UpdateChatDto) {
    return this.chatsService.update(id, updateChatDto);
  }

  // Marcar como leído
  @Put(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    await this.chatsService.markAsRead(id);
    return { message: 'Chat marked as read' };
  }

  // Cambiar estado
  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ChatStatus,
  ) {
    return this.chatsService.update(id, { status });
  }

  // Cambiar prioridad
  @Put(':id/priority')
  async updatePriority(
    @Param('id', ParseIntPipe) id: number,
    @Body('priority') priority: ChatPriority,
  ) {
    return this.chatsService.update(id, { priority });
  }

  // Agregar tags
  @Put(':id/tags')
  async updateTags(@Param('id', ParseIntPipe) id: number, @Body('tags') tags: string[]) {
    return this.chatsService.update(id, { tags });
  }

  // Actualizar notas
  @Put(':id/notes')
  async updateNotes(@Param('id', ParseIntPipe) id: number, @Body('notes') notes: string) {
    return this.chatsService.update(id, { notes });
  }

  // Eliminar chat
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.chatsService.delete(id);
    return { message: 'Chat deleted' };
  }
}