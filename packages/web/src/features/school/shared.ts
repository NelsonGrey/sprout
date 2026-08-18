import type { MemberRole, MemberScope } from '@sprout/shared';

export const GRADE_OPTIONS = ['PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export function scopeSummary(scope: MemberScope | undefined): string {
  if (!scope || scope.type === 'own') return 'Own classrooms only';
  if (scope.type === 'school') return 'Whole school';
  return `Grades: ${scope.grades.join(', ') || '(none selected)'}`;
}

export function roleLabel(role: MemberRole): string {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  return 'Teacher';
}
