import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { SchoolMember, Student } from '@sprout/shared';
import { ArchiveStudentsPage } from './ArchiveStudentsPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useStudentsInSchool: vi.fn(),
  useClassroomsInSchool: vi.fn(),
  bulkArchiveStudents: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useSchoolIdsForUser: vi.fn(),
  useMyMembership: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/students/archive', navigateMock],
}));

const user = { uid: 'admin-1', displayName: 'Office Manager', email: 'admin@example.com' } as User;

const adminMembership: SchoolMember = {
  uid: 'admin-1',
  role: 'admin',
  displayName: 'Office Manager',
  email: 'admin@example.com',
  addedByUid: 'super-1',
  createdAt: new Date(),
};

const classroom3 = {
  id: 'ctx-3',
  type: 'classroom' as const,
  name: '3rd Grade - Room 12',
  ownerUids: ['teacher-3'],
  schoolId: 'school-1',
  gradeLevel: '3',
  createdAt: new Date(),
};

const classroom6 = {
  id: 'ctx-6',
  type: 'classroom' as const,
  name: '6th Grade - Room 20',
  ownerUids: ['teacher-6'],
  schoolId: 'school-1',
  gradeLevel: '6',
  createdAt: new Date(),
};

function student(overrides: Partial<Student>): Student {
  return {
    id: 'student-1',
    firstName: 'Alex',
    lastName: 'Rivera',
    displayName: 'Alex Rivera',
    balanceCents: 0,
    contexts: {},
    contextIds: ['ctx-6'],
    ownerUids: ['teacher-6'],
    schoolId: 'school-1',
    gradeLevel: '6',
    contextName: '6th Grade - Room 20',
    createdAt: new Date(),
    ...overrides,
  };
}

function setup(overrides: { students?: Student[]; classrooms?: typeof classroom3[]; membership?: SchoolMember | null } = {}) {
  vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
  vi.mocked(schoolLib.useMyMembership).mockReturnValue(
    overrides.membership === undefined ? adminMembership : overrides.membership,
  );
  vi.mocked(firestoreLib.useStudentsInSchool).mockReturnValue(
    overrides.students ?? [student({ id: 'student-1' })],
  );
  vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue(
    overrides.classrooms ?? [classroom3, classroom6],
  );
}

describe('ArchiveStudentsPage', () => {
  it('denies a plain teacher (not admin/super_admin)', () => {
    setup({ membership: { ...adminMembership, role: 'teacher' } });
    render(<ArchiveStudentsPage user={user} />);

    expect(screen.getByText('Only school admins can archive students.')).toBeTruthy();
    expect(screen.queryByText('6th Grade - Room 20')).toBeNull();
  });

  it('renders one row per occupied non-archived classroom', () => {
    setup({
      students: [
        student({ id: 'student-1', contextIds: ['ctx-6'] }),
        student({
          id: 'student-2',
          contextIds: ['ctx-3'],
          gradeLevel: '3',
          contextName: '3rd Grade - Room 12',
          archivedAt: new Date(),
        }),
      ],
    });
    render(<ArchiveStudentsPage user={user} />);

    expect(screen.getByText('6th Grade - Room 20')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('updates the summary when a row is checked', () => {
    setup({ students: [student({ id: 'student-1', contextIds: ['ctx-6'] })] });
    render(<ArchiveStudentsPage user={user} />);

    expect(screen.getByText(/0 students across 0 classrooms will be archived/)).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox'));

    expect(screen.getByText(/1 student across 1 classroom will be archived/)).toBeTruthy();
  });

  it('archives the checked classroom via bulkArchiveStudents', async () => {
    setup({
      students: [
        student({ id: 'student-1', contextIds: ['ctx-6'] }),
        student({ id: 'student-2', contextIds: ['ctx-6'], displayName: 'Jamie Chen' }),
      ],
    });
    vi.mocked(firestoreLib.bulkArchiveStudents).mockResolvedValue(undefined);
    render(<ArchiveStudentsPage user={user} />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Archive All'));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));

    await waitFor(() =>
      expect(firestoreLib.bulkArchiveStudents).toHaveBeenCalledWith(['student-1', 'student-2']),
    );
    await waitFor(() => expect(screen.getByText('Archiving complete.')).toBeTruthy());
  });

  it('disables Archive All when nothing is checked', () => {
    setup({ students: [student({ id: 'student-1', contextIds: ['ctx-6'] })] });
    render(<ArchiveStudentsPage user={user} />);

    expect((screen.getByText('Archive All').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('navigates back to Students after a successful archive', async () => {
    setup({ students: [student({ id: 'student-1', contextIds: ['ctx-6'] })] });
    vi.mocked(firestoreLib.bulkArchiveStudents).mockResolvedValue(undefined);
    render(<ArchiveStudentsPage user={user} />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Archive All'));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));

    await waitFor(() => screen.getByText('Back to Students'));
    fireEvent.click(screen.getByText('Back to Students'));
    expect(navigateMock).toHaveBeenCalledWith('/students');
  });
});
