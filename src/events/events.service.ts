import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsDto } from './dto/list-events.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async createEvent(dto: CreateEventDto, organizerId: string): Promise<Event> {
    const event = this.eventRepository.create({
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      organizerId,
    });
    return this.eventRepository.save(event);
  }

  async updateEvent(id: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.getEventById(id);

    const updates: Partial<Event> = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.ticketPrice !== undefined && { ticketPrice: dto.ticketPrice }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.startDate !== undefined && {
        startDate: new Date(dto.startDate),
      }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
    };

    Object.assign(event, updates);
    return this.eventRepository.save(event);
  }

  async deleteEvent(id: string): Promise<void> {
    const event = await this.getEventById(id);
    await this.eventRepository.remove(event);
  }

  async getEventById(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event with id "${id}" not found`);
    }
    return event;
  }

  async listEvents(filterDto: ListEventsDto): Promise<PaginatedResult<Event>> {
    const { status, organizerId, search, page = 1, limit = 10 } = filterDto;

    const where: FindOptionsWhere<Event> = {
      ...(status && { status }),
      ...(organizerId && { organizerId }),
      ...(search && { title: Like(`%${search}%`) }),
    };

    const [data, total] = await this.eventRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
