import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogEntry {
  action: string;
  userId: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(entry: AuditLogEntry): Promise<AuditLog> {
    const record = this.auditLogRepository.create({
      action: entry.action,
      userId: entry.userId,
      resourceId: entry.resourceId ?? null,
      metadata: entry.meta ?? null,
    });

    const saved = await this.auditLogRepository.save(record);

    this.logger.log(
      `[AUDIT] action=${saved.action} userId=${saved.userId} resourceId=${saved.resourceId ?? 'n/a'}`,
    );

    return saved;
  }
}
