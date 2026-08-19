import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { ClassroomSettingsPage } from './ClassroomSettingsPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useClassroom: vi.fn(),
  updateClassroom: vi.fn(),
  deleteClassroom: vi.fn(),
  // Transitively used by StoreManager, which renders unconditionally.
  useStoreItems: vi.fn(),
  createStoreItem: vi.fn(),
  updateStoreItem: vi.fn(),
  deleteStoreItem: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useMyMembership: vi.fn(),
  useMembersOfSchool: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/classrooms/ctx-1/settings', navigateMock] };
});

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;
const classroom = { id: 'ctx-1', type: 'classroom' as const, name: '4th Grade', ownerUids: ['teacher-1'], createdAt: new Date() };

function mockOwnerDefaults() {
  vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
  vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
  vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
}

describe('ClassroomSettingsPage', () => {
  it('has no back-arrow button — the breadcrumb trail is the way back', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    mockOwnerDefaults();
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    expect(screen.queryByLabelText('Back')).toBeNull();
    expect(screen.getByRole('link', { name: '4th Grade' }).getAttribute('href')).toBe('/app/classrooms/ctx-1');
  });

  it('renames the classroom', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.updateClassroom).mockResolvedValue(undefined);
    mockOwnerDefaults();
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Rename classroom'));
    const input = screen.getByDisplayValue('4th Grade');
    fireEvent.change(input, { target: { value: '5th Grade' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(firestoreLib.updateClassroom).toHaveBeenCalledWith('ctx-1', { name: '5th Grade' }));
  });

  it('requires confirming before deleting the classroom', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.deleteClassroom).mockResolvedValue(undefined);
    mockOwnerDefaults();
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Delete classroom'));
    expect(firestoreLib.deleteClassroom).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(firestoreLib.deleteClassroom).toHaveBeenCalledWith('ctx-1'));
    expect(navigateMock).toHaveBeenCalledWith('/app');
  });

  it('hides rename/delete for a viewer with only award-level access, but still shows the store (no manage gate)', () => {
    const scopedClassroom = { ...classroom, ownerUids: ['other-teacher'], schoolId: 'school-1', gradeLevel: '4' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'school' },
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    expect(screen.queryByLabelText('Rename classroom')).toBeNull();
    expect(screen.queryByLabelText('Delete classroom')).toBeNull();
    expect(screen.getByText('Classroom Store')).toBeTruthy();
  });

  it("the owner sees a 'Request access for a colleague' button that navigates to the request-access page", () => {
    const schoolClassroom = { ...classroom, schoolId: 'school-1' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(schoolClassroom);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([
      {
        uid: 'colleague-1',
        role: 'teacher',
        displayName: 'Mr. Colleague',
        email: 'colleague@example.com',
        addedByUid: 'super-1',
        createdAt: new Date(),
      },
    ]);
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByText('Request access for a colleague'));
    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1/request-access');
  });

  it('hides the request-access button when the school has no other teachers', () => {
    const schoolClassroom = { ...classroom, schoolId: 'school-1' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(schoolClassroom);
    mockOwnerDefaults();
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    expect(screen.queryByText('Request access for a colleague')).toBeNull();
  });
});
