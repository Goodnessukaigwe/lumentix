// // ─── Example: Events Service ──────────────────────────────────────────────
// // This file shows how to consume the global pagination helper in any NestJS module.

// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// // import { Event } from './entities/event.entity';

// @Injectable()
// export class EventsService {
//   constructor(
//     // @InjectRepository(Event)
//     private readonly eventsRepository: Repository<any>,
//   ) {}

//   async findAll(dto: PaginationDto): Promise<PaginatedResult<any>> {
//     const qb = this.eventsRepository.createQueryBuilder('event');

//     // Any custom joins / pre-filters go here BEFORE calling paginate()
//     // e.g. qb.leftJoinAndSelect('event.venue', 'venue');

//     return paginate(qb, dto, 'event');
//   }
// }

// // ─── Example: Events Controller ──────────────────────────────────────────────

// import { Controller, Get, Query } from '@nestjs/common';
// import { ApiTags, ApiOperation } from '@nestjs/swagger';
// import { PaginatedResult } from 'src/events/events.service';
// import { PaginationDto } from './dto/pagination.dto';
// import { paginate } from './pagination.helper';

// @ApiTags('Events')
// @Controller('events')
// export class EventsController {
//   constructor(private readonly eventsService: EventsService) {}

//   @Get()
//   @ApiOperation({ summary: 'List events with pagination and filtering' })
//   findAll(@Query() paginationDto: PaginationDto) {
//     // paginationDto is automatically validated via ValidationPipe (set globally)
//     return this.eventsService.findAll(paginationDto);
//   }
// }

// // ─── main.ts — Enable global ValidationPipe ──────────────────────────────────
// //
// // import { ValidationPipe } from '@nestjs/common';
// //
// // async function bootstrap() {
// //   const app = await NestFactory.create(AppModule);
// //   app.useGlobalPipes(
// //     new ValidationPipe({
// //       transform: true,        // enables @Type(() => Number) transforms
// //       whitelist: true,
// //       forbidNonWhitelisted: false,
// //     }),
// //   );
// //   await app.listen(3000);
// // }
// // bootstrap();
