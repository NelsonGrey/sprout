import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { LearnListPage } from './LearnListPage';
import * as roleContext from '../../app/roleContext';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../app/roleContext', () => ({
  useCapabilities: vi.fn(),
  useIsLinkedStudent: vi.fn(),
}));

vi.mock('../../lib/firestore', () => ({
  useLinkedStudent: vi.fn(() => null),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/learn', navigateMock] };
});

const user = { uid: 'user-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

describe('LearnListPage', () => {
  it('gives an adult "Prepare lesson" links, never a direct student mission start', () => {
    vi.mocked(roleContext.useCapabilities).mockReturnValue({
      hasAnyStaffAccess: true,
      canManageStaff: false,
      canManageGrades: false,
      canViewAllSchoolStudents: false,
      canManageRoster: false,
      canResolveAccessRequests: false,
      schoolId: 'school-1',
    });
    vi.mocked(roleContext.useIsLinkedStudent).mockReturnValue(false);

    render(<LearnListPage user={user} />);

    expect(screen.getAllByText('Prepare lesson').length).toBeGreaterThan(0);
    expect(screen.queryByText('Start mission')).toBeNull();
  });

  it('lets a student-only account start a mission only within their own grade band', () => {
    vi.mocked(roleContext.useCapabilities).mockReturnValue({
      hasAnyStaffAccess: false,
      canManageStaff: false,
      canManageGrades: false,
      canViewAllSchoolStudents: false,
      canManageRoster: false,
      canResolveAccessRequests: false,
      schoolId: undefined,
    });
    vi.mocked(roleContext.useIsLinkedStudent).mockReturnValue(true);
    vi.mocked(firestoreLib.useLinkedStudent).mockReturnValue({
      id: 'student-1',
      firstName: 'Alex',
      lastName: 'Rivera',
      displayName: 'Alex Rivera',
      balanceCents: 0,
      contexts: {},
      contextId: 'ctx-1',
      ownerUids: [],
      gradeLevel: '3',
      createdAt: new Date(),
    });

    render(<LearnListPage user={user} />);

    // "Build a Goal Trail" and "The Classroom Store Budget" are Grades 3-4.
    expect(screen.getAllByText('Start mission').length).toBe(2);
    expect(screen.getAllByText('Ask an adult to guide this lesson.').length).toBe(6);
  });

  it('filters lessons by grade band', () => {
    vi.mocked(roleContext.useCapabilities).mockReturnValue({
      hasAnyStaffAccess: true,
      canManageStaff: false,
      canManageGrades: false,
      canViewAllSchoolStudents: false,
      canManageRoster: false,
      canResolveAccessRequests: false,
      schoolId: 'school-1',
    });
    vi.mocked(roleContext.useIsLinkedStudent).mockReturnValue(false);

    render(<LearnListPage user={user} />);
    screen.getByText('8 lessons shown');

    fireEvent.click(screen.getByRole('button', { name: 'Pre-K–K' }));
    screen.getByText('1 lesson shown');
    screen.getByText('The Waiting Garden');
  });
});
