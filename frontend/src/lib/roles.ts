import type { Role } from './types';

export function getRoleLabel(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrateur';
    case 'ASSOCIATION':
      return 'Association';
    case 'DONOR':
      return 'Donateur';
    default:
      return role;
  }
}
