import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { LandingRouter } from './LandingRouter';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useLinkedStudent: vi.fn(),
  useClassrooms: vi.fn(),
  useClassroomsInSchool: vi.fn(),
  useTransactions: vi.fn(),
  createClassroom: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useSchoolIdsForUser: vi.fn(),
  useMyMembership: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({
  firebaseClient: { auth: { signOut: vi.fn() } },
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
}));

const user = { uid: 'user-1', displayName: 'Alex Rivera', email: 'alex@example.com' } as User;
const linkedStudent = {
  id: 'student-1',
  firstName: 'Alex',
  lastName: 'Rivera',
  displayName: 'Alex Rivera',
  balanceCents: 500,
  contexts: {},
  contextIds: ['ctx-1'],
  ownerUids: ['teacher-1'],
  contextName: '4th Grade',
  linkedUid: 'user-1',
  createdAt: new Date(),
};

describe('LandingRouter', () => {
  it('shows the balance view for a linked student with no staff access', () => {
    vi.mocked(firestoreLib.useLinkedStudent).mockReturnValue(linkedStudent);
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);

    render(<LandingRouter user={user} />);

    expect(screen.getByText('4th Grade')).toBeTruthy();
    expect(screen.getByText('$5.00')).toBeTruthy();
  });

  it('shows the staff classrooms view for an unlinked user', () => {
    vi.mocked(firestoreLib.useLinkedStudent).mockReturnValue(null);
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);

    render(<LandingRouter user={user} />);

    expect(screen.getByText('My Classrooms')).toBeTruthy();
  });

  it('defaults to the staff view for a dual-role user (linked student who also has staff access)', () => {
    vi.mocked(firestoreLib.useLinkedStudent).mockReturnValue(linkedStudent);
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);

    render(<LandingRouter user={user} />);

    expect(screen.getByText('My Classrooms')).toBeTruthy();
  });

  it('renders nothing while the linked-student lookup is still loading', () => {
    vi.mocked(firestoreLib.useLinkedStudent).mockReturnValue(undefined);
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);

    const { container } = render(<LandingRouter user={user} />);

    expect(container.innerHTML).toBe('');
  });
});
