import { SetMetadata } from '@nestjs/common';

export enum Role {
  ORGANIZER = 'organizer',
  ATTENDEE = 'attendee',
  SPONSOR = 'sponsor',
  ADMIN = 'admin',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
