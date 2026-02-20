import { Request } from 'express';
import { Role } from 'src/common/decorators/roles.decorator';

export interface AuthenticatedUser {
  id: string;
  role: Role;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
