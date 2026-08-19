import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { GradesOfferedPage } from './GradesOfferedPage';
import * as schoolLib from '../../lib/school';

vi.mock('wouter', () => ({
  useLocation: () => ['/app/school/grades', vi.fn()],
}));

vi.mock('../../lib/school', () => ({
  getSchool: vi.fn(),
  updateSchool: vi.fn(),
  useSchoolIdsForUser: vi.fn(),
  useMyMembership: vi.fn(),
}));

const superAdmin = { uid: 'super-admin-1', displayName: 'Principal Lee', email: 'lee@example.com' } as User;
const delegate = { uid: 'delegate-1', displayName: 'Office Manager', email: 'om@example.com' } as User;

describe('GradesOfferedPage', () => {
  it('shows "All grades" for an admin, but only a super admin can Edit', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });

    render(<GradesOfferedPage user={delegate} />);
    await waitFor(() => expect(screen.getByText('All grades')).toBeTruthy());

    // firestore.rules gates schools/{schoolId} updates to isSuperAdmin, not
    // isAtLeastAdmin — a plain admin must not see an Edit control that
    // would fail server-side.
    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('lets a super admin disable grades and saves the enabled subset', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      createdAt: new Date(),
      enabledGrades: ['PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    });
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'super-admin-1',
      role: 'super_admin',
      displayName: 'Principal Lee',
      email: 'lee@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.updateSchool).mockResolvedValue(undefined);

    render(<GradesOfferedPage user={superAdmin} />);
    await waitFor(() => expect(screen.getByText('All grades')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('9'));
    fireEvent.click(screen.getByText('10'));
    fireEvent.click(screen.getByText('11'));
    fireEvent.click(screen.getByText('12'));
    fireEvent.click(screen.getByText('Save'));

    expect(schoolLib.updateSchool).toHaveBeenCalledWith('school-1', {
      enabledGrades: ['PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8'],
    });
    await waitFor(() => expect(screen.getByText('PK, K, 1, 2, 3, 4, 5, 6, 7, 8')).toBeTruthy());
  });
});
