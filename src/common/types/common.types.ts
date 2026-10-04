import { UserRole } from '../../generated/prisma/enums.js';

export type AuthenticatedRequest = {
  user: {
    id: string;
    name: string;
    image: string | null;
    email: string;
    role: UserRole;
    isEmailVerified: boolean;
  };
};

export interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat: number;
  exp: number;
}
