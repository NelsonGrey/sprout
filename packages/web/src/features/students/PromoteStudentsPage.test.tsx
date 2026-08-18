import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { SchoolMember, Student } from '@sprout/shared';
import { PromoteStudentsPage } from './PromoteStudentsPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useStudentsInSchool: vi.fn(),
  useClassroomsInSchool: vi.fn(),
  bulkMoveStudents: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useSchoolIdsForUser: vi.fn(),
  useMyMembership: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/students/promote', navigateMock],
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

const classroom4 = {
  id: 'ctx-4',
  type: 'classroom' as const,
  name: '4th Grade - Room 8',
  ownerUids: ['teacher-4'],
  schoolId: 'school-1',
  gradeLevel: '4',
  createdAt: new Date(),
};

const classroom5 = {
  id: 'ctx-5',
  type: 'classroom' as const,
  name: '5th Grade - Room 14',
  ownerUids: ['teacher-5'],
  schoolId: 'school-1',
  gradeLevel: '5',
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
    contextId: 'ctx-3',
    ownerUids: ['teacher-3'],
    schoolId: 'school-1',
    gradeLevel: '3',
    contextName: '3rd Grade - Room 12',
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
    overrides.classrooms ?? [classroom3, classroom4, classroom5],
  );
}

describe('PromoteStudentsPage', () => {
  it('denies a plain teacher (not admin/super_admin)', () => {
    setup({ membership: { ...adminMembership, role: 'teacher' } });
    render(<PromoteStudentsPage user={user} />);

    expect(screen.getByText('Only school admins can promote students.')).toBeTruthy();
    expect(screen.queryByText('3rd Grade - Room 12')).toBeNull();
  });

  it('renders one row per occupied classroom, skipping empty ones', () => {
    setup({
      students: [student({ id: 'student-1', contextId: 'ctx-3' })],
    });
    render(<PromoteStudentsPage user={user} />);

    expect(screen.getByText('3rd Grade - Room 12')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('updates the summary when a destination is selected', () => {
    setup({ students: [student({ id: 'student-1', contextId: 'ctx-3' })] });
    render(<PromoteStudentsPage user={user} />);

    expect(screen.getByText(/0 students across 0 classrooms will move/)).toBeTruthy();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ctx-4' } });

    expect(screen.getByText(/1 student across 1 classroom will move/)).toBeTruthy();
  });

  it('promotes mapped classrooms via bulkMoveStudents using the source classroom students', async () => {
    setup({ students: [student({ id: 'student-1', contextId: 'ctx-3' })] });
    vi.mocked(firestoreLib.bulkMoveStudents).mockResolvedValue(undefined);
    render(<PromoteStudentsPage user={user} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ctx-4' } });
    fireEvent.click(screen.getByText('Promote All'));
    fireEvent.click(screen.getByText('Promote'));

    await waitFor(() =>
      expect(firestoreLib.bulkMoveStudents).toHaveBeenCalledWith(['student-1'], {
        contextId: 'ctx-4',
        ownerUids: ['teacher-4'],
        schoolId: 'school-1',
        gradeLevel: '4',
        contextName: '4th Grade - Room 8',
      }),
    );
    await waitFor(() => expect(screen.getByText('Promotion complete.')).toBeTruthy());
  });

  it('supports two source classrooms mapped to the same destination', async () => {
    setup({
      students: [
        student({ id: 'student-1', contextId: 'ctx-3' }),
        student({ id: 'student-2', contextId: 'ctx-4', displayName: 'Jamie Chen' }),
      ],
    });
    vi.mocked(firestoreLib.bulkMoveStudents).mockResolvedValue(undefined);
    render(<PromoteStudentsPage user={user} />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'ctx-5' } });
    fireEvent.change(selects[1], { target: { value: 'ctx-5' } });
    fireEvent.click(screen.getByText('Promote All'));
    fireEvent.click(screen.getByText('Promote'));

    await waitFor(() => expect(firestoreLib.bulkMoveStudents).toHaveBeenCalledTimes(2));
    expect(firestoreLib.bulkMoveStudents).toHaveBeenCalledWith(['student-1'], expect.objectContaining({ contextId: 'ctx-5' }));
    expect(firestoreLib.bulkMoveStudents).toHaveBeenCalledWith(['student-2'], expect.objectContaining({ contextId: 'ctx-5' }));
  });

  it('disables Promote All when nothing is mapped', () => {
    setup({ students: [student({ id: 'student-1', contextId: 'ctx-3' })] });
    render(<PromoteStudentsPage user={user} />);

    expect((screen.getByText('Promote All').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('navigates back to Students after a successful promotion', async () => {
    setup({ students: [student({ id: 'student-1', contextId: 'ctx-3' })] });
    vi.mocked(firestoreLib.bulkMoveStudents).mockResolvedValue(undefined);
    render(<PromoteStudentsPage user={user} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ctx-4' } });
    fireEvent.click(screen.getByText('Promote All'));
    fireEvent.click(screen.getByText('Promote'));

    await waitFor(() => screen.getByText('Back to Students'));
    fireEvent.click(screen.getByText('Back to Students'));
    expect(navigateMock).toHaveBeenCalledWith('/students');
  });
});
