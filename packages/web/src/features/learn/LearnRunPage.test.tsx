import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { User } from 'firebase/auth';
import { LearnRunPage } from './LearnRunPage';
import * as roleContext from '../../app/roleContext';

vi.mock('../../app/roleContext', () => ({
  useCapabilities: vi.fn(),
  useIsLinkedStudent: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/learn/goal-trail/run', navigateMock] };
});

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

beforeEach(() => {
  window.history.pushState({}, '', '/app/learn/goal-trail/run');
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
});

describe('LearnRunPage', () => {
  it('starts on the warm-up step by default', () => {
    render(<LearnRunPage user={user} lessonSlug="goal-trail" />);
    screen.getByRole('heading', { name: 'Warm-up' });
  });

  it('restores directly to a step given in the URL', () => {
    window.history.pushState({}, '', '/app/learn/goal-trail/run?step=1');
    render(<LearnRunPage user={user} lessonSlug="goal-trail" />);
    screen.getByRole('heading', { name: 'Choose the finish' });
  });

  it('offers an "Open activity" deep link on a mission step for a lesson with a real product connection', () => {
    window.history.pushState({}, '', '/app/learn/goal-trail/run?step=1');
    render(<LearnRunPage user={user} lessonSlug="goal-trail" />);
    const link = screen.getByText('Try creating or checking a savings goal', { exact: false }).closest('a');
    expect(link?.getAttribute('href')).toBe('/app?fromLesson=goal-trail&fromStep=1');
  });

  it('never shows an "Open activity" deep link for a lesson whose product connection is not yet built', () => {
    window.history.pushState({}, '', '/app/learn/interest-joins-the-team/run?step=1');
    render(<LearnRunPage user={user} lessonSlug="interest-joins-the-team" />);
    expect(screen.queryByRole('link', { name: /Try/ })).toBeNull();
  });

  it('deep-links a student-only account back to /app/me, not the adult /app', () => {
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
    window.history.pushState({}, '', '/app/learn/goal-trail/run?step=1');
    render(<LearnRunPage user={user} lessonSlug="goal-trail" />);
    const link = screen.getByText('Try creating or checking a savings goal', { exact: false }).closest('a');
    expect(link?.getAttribute('href')).toBe('/app/me?fromLesson=goal-trail&fromStep=1');
  });

  it('disables Back on the first step', () => {
    render(<LearnRunPage user={user} lessonSlug="goal-trail" />);
    const backButtons = screen.getAllByRole('button', { name: /Back/ });
    expect(backButtons.some(button => (button as HTMLButtonElement).disabled)).toBe(true);
  });
});
