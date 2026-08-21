import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { Sidebar } from './Sidebar';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useClassrooms: vi.fn(),
}));

vi.mock('../../lib/family', () => ({
  useMyFamilyContexts: vi.fn(() => []),
}));

vi.mock('../../lib/school', () => ({
  useSchoolIdsForUser: vi.fn(),
  useMyMembership: vi.fn(),
}));

vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app', vi.fn()] };
});

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

describe('Sidebar', () => {
  it('renders nothing for a linked-student-only account (no classrooms, no school membership)', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);

    const { container } = render(<Sidebar user={user} mobileOpen={false} onCloseMobile={vi.fn()} />);

    expect(container.innerHTML).toBe('');
  });

  it('shows only Home for a plain teacher with an owned classroom', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([
      { id: 'ctx-1', type: 'classroom', name: '3rd Grade', ownerUids: ['teacher-1'], createdAt: new Date() },
    ]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);

    render(<Sidebar user={user} mobileOpen={false} onCloseMobile={vi.fn()} />);

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.queryByText('Students')).toBeNull();
    expect(screen.queryByText('School')).toBeNull();
  });

  it('shows Home, Students, and School for an admin', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'admin',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      addedByUid: 'super-1',
      createdAt: new Date(),
    });

    render(<Sidebar user={user} mobileOpen={false} onCloseMobile={vi.fn()} />);

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Students')).toBeTruthy();
    expect(screen.getByText('School')).toBeTruthy();
  });

  it('hides Students/School for a plain teacher with school access but no admin role', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'own' },
      addedByUid: 'super-1',
      createdAt: new Date(),
    });

    render(<Sidebar user={user} mobileOpen={false} onCloseMobile={vi.fn()} />);

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.queryByText('Students')).toBeNull();
    expect(screen.queryByText('School')).toBeNull();
  });

  it('closes the mobile drawer when the overlay is clicked', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([
      { id: 'ctx-1', type: 'classroom', name: '3rd Grade', ownerUids: ['teacher-1'], createdAt: new Date() },
    ]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    const onCloseMobile = vi.fn();

    render(<Sidebar user={user} mobileOpen={true} onCloseMobile={onCloseMobile} />);

    fireEvent.click(screen.getByLabelText('Close navigation'));
    expect(onCloseMobile).toHaveBeenCalled();
  });
});
