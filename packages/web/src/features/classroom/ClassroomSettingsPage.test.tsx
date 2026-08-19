import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { ClassroomSettingsPage } from './ClassroomSettingsPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useClassroom: vi.fn(),
  useStudents: vi.fn(),
  updateClassroom: vi.fn(),
  deleteClassroom: vi.fn(),
  // Transitively used by StoreManager, which renders unconditionally for
  // anyone who reaches this (already canManage-gated) page.
  useStoreItems: vi.fn(),
  createStoreItem: vi.fn(),
  updateStoreItem: vi.fn(),
  deleteStoreItem: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useMyMembership: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/classrooms/ctx-1/settings', navigateMock] };
});

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;
// Schoolless classroom (no schoolId) — the owner remains its only
// possible manager, unaffected by the school-staff-only restriction.
const classroom = { id: 'ctx-1', type: 'classroom' as const, name: '4th Grade', ownerUids: ['teacher-1'], createdAt: new Date() };
const student = {
  id: 'student-1',
  firstName: 'Alex',
  lastName: '',
  displayName: 'Alex',
  balanceCents: 500,
  contexts: {},
  contextId: 'ctx-1',
  ownerUids: ['teacher-1'],
  createdAt: new Date(),
};

function mockSchoollessOwner() {
  vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
  vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
  vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
}

describe('ClassroomSettingsPage', () => {
  it('has no back-arrow button — the breadcrumb trail is the way back', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    mockSchoollessOwner();
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    expect(screen.queryByLabelText('Back')).toBeNull();
    expect(screen.getByRole('link', { name: '4th Grade' }).getAttribute('href')).toBe('/app/classrooms/ctx-1');
  });

  it('denies a school-affiliated classroom owner who is not an admin — ownership alone no longer suffices', () => {
    const scopedClassroom = { ...classroom, ownerUids: ['teacher-1'], schoolId: 'school-1', gradeLevel: '4' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'own' },
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    expect(screen.getByText('Only school staff can manage this classroom.')).toBeTruthy();
    expect(screen.queryByLabelText('Rename classroom')).toBeNull();
    expect(screen.queryByText('Classroom Store')).toBeNull();
  });

  it('allows the owner of a schoolless classroom to rename it, since they are its only possible manager', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.updateClassroom).mockResolvedValue(undefined);
    mockSchoollessOwner();
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Rename classroom'));
    const input = screen.getByDisplayValue('4th Grade');
    fireEvent.change(input, { target: { value: '5th Grade' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(firestoreLib.updateClassroom).toHaveBeenCalledWith('ctx-1', { name: '5th Grade' }));
  });

  it('allows an admin to rename a school-affiliated classroom they do not own', async () => {
    const scopedClassroom = { ...classroom, ownerUids: ['other-teacher'], schoolId: 'school-1' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(firestoreLib.updateClassroom).mockResolvedValue(undefined);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'admin',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Rename classroom'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(firestoreLib.updateClassroom).toHaveBeenCalledWith('ctx-1', { name: '4th Grade' }));
  });

  it('requires confirming before deleting an empty classroom', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.deleteClassroom).mockResolvedValue(undefined);
    mockSchoollessOwner();
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Delete classroom'));
    expect(firestoreLib.deleteClassroom).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(firestoreLib.deleteClassroom).toHaveBeenCalledWith('ctx-1'));
    expect(navigateMock).toHaveBeenCalledWith('/app');
  });

  it('disables deleting a classroom that still has active (non-archived) students', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    expect((screen.getByLabelText('Delete classroom') as HTMLButtonElement).disabled).toBe(true);
  });

  it('re-enables deleting once every student is archived', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([{ ...student, archivedAt: new Date() }]);
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    expect((screen.getByLabelText('Delete classroom') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows the store catalog for whoever can reach this page', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    mockSchoollessOwner();
    render(<ClassroomSettingsPage user={user} contextId="ctx-1" />);

    expect(screen.getByText('Classroom Store')).toBeTruthy();
  });
});
