import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { RequestAccessPage } from './RequestAccessPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useClassroom: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useMembersOfSchool: vi.fn(),
  useAccessRequestsForContext: vi.fn(),
  createAccessRequest: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/classrooms/ctx-1/request-access', navigateMock] };
});

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;
const classroom = {
  id: 'ctx-1',
  type: 'classroom' as const,
  name: '4th Grade',
  ownerUids: ['teacher-1'],
  schoolId: 'school-1',
  createdAt: new Date(),
};
const colleague = {
  uid: 'colleague-1',
  role: 'teacher' as const,
  displayName: 'Mr. Colleague',
  email: 'colleague@example.com',
  addedByUid: 'super-1',
  createdAt: new Date(),
};

describe('RequestAccessPage', () => {
  it('submits a request-access form for a colleague', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([colleague]);
    vi.mocked(schoolLib.useAccessRequestsForContext).mockReturnValue([]);
    vi.mocked(schoolLib.createAccessRequest).mockResolvedValue(undefined);
    render(<RequestAccessPage user={user} contextId="ctx-1" />);

    fireEvent.change(screen.getByDisplayValue('Choose a teacher…'), { target: { value: 'colleague-1' } });
    fireEvent.click(screen.getByText('Full manage (rename/delete/roster)'));
    fireEvent.click(screen.getByRole('button', { name: 'Request Access' }));

    await waitFor(() =>
      expect(schoolLib.createAccessRequest).toHaveBeenCalledWith({
        schoolId: 'school-1',
        contextId: 'ctx-1',
        contextName: '4th Grade',
        requestedByUid: 'teacher-1',
        requestedByDisplayName: 'Ms. Lord',
        targetUid: 'colleague-1',
        targetDisplayName: 'Mr. Colleague',
        level: 'manage',
      }),
    );
  });

  it('lists pending/resolved requests for this classroom', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([colleague]);
    vi.mocked(schoolLib.useAccessRequestsForContext).mockReturnValue([
      {
        id: 'req-1',
        schoolId: 'school-1',
        contextId: 'ctx-1',
        contextName: '4th Grade',
        requestedByUid: 'teacher-1',
        requestedByDisplayName: 'Ms. Lord',
        targetUid: 'colleague-1',
        targetDisplayName: 'Mr. Colleague',
        level: 'award',
        status: 'pending',
        createdAt: new Date(),
      },
    ]);
    render(<RequestAccessPage user={user} contextId="ctx-1" />);

    expect(screen.getByText('Mr. Colleague — award — pending')).toBeTruthy();
  });

  it('has no back-arrow button — the breadcrumb trail (Home > classroom > Settings) is the way back', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([colleague]);
    vi.mocked(schoolLib.useAccessRequestsForContext).mockReturnValue([]);
    render(<RequestAccessPage user={user} contextId="ctx-1" />);

    expect(screen.queryByLabelText('Back')).toBeNull();
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('/app/classrooms/ctx-1/settings');
  });
});
