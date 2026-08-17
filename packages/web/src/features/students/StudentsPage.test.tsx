import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { SchoolMember, Student } from '@sprout/shared';
import { StudentsPage } from './StudentsPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useStudentsInSchool: vi.fn(),
  useClassroomsInSchool: vi.fn(),
  updateStudent: vi.fn(),
  bulkMoveStudents: vi.fn(),
  bulkDeleteStudents: vi.fn(),
  bulkArchiveStudents: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useSchoolIdsForUser: vi.fn(),
  useMyMembership: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/students', navigateMock],
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

const student = {
  id: 'student-1',
  firstName: 'Alex',
  lastName: 'Rivera',
  displayName: 'Alex Rivera',
  studentId: 'STU-1',
  balanceCents: 500,
  contexts: {},
  contextIds: ['ctx-1'],
  ownerUids: ['teacher-1'],
  schoolId: 'school-1',
  gradeLevel: '4',
  contextName: '4th Grade',
  createdAt: new Date(),
};

const classroom = {
  id: 'ctx-2',
  type: 'classroom' as const,
  name: '5th Grade',
  ownerUids: ['teacher-2'],
  schoolId: 'school-1',
  gradeLevel: '5',
  createdAt: new Date(),
};

function setup(overrides: { students?: Student[]; membership?: SchoolMember | null } = {}) {
  vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
  vi.mocked(schoolLib.useMyMembership).mockReturnValue(
    overrides.membership === undefined ? adminMembership : overrides.membership,
  );
  vi.mocked(firestoreLib.useStudentsInSchool).mockReturnValue(overrides.students ?? [student]);
  vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([classroom]);
}

describe('StudentsPage', () => {
  it('denies a plain teacher (not admin/super_admin)', () => {
    setup({ membership: { ...adminMembership, role: 'teacher' } });
    render(<StudentsPage user={user} />);

    expect(screen.getByText('Only school admins can manage the full student roster.')).toBeTruthy();
    expect(screen.queryByText('Alex Rivera')).toBeNull();
  });

  it('shows the school-wide roster for an admin', () => {
    setup();
    render(<StudentsPage user={user} />);

    expect(screen.getByText('Alex Rivera')).toBeTruthy();
    expect(screen.getByText('4th Grade')).toBeTruthy();
  });

  it('filters by search term', () => {
    setup({ students: [student, { ...student, id: 'student-2', firstName: 'Jamie', lastName: 'Chen', displayName: 'Jamie Chen', studentId: 'STU-2' }] });
    render(<StudentsPage user={user} />);

    fireEvent.change(screen.getByPlaceholderText('Search by name or student ID'), {
      target: { value: 'Jamie' },
    });

    expect(screen.getByText('Jamie Chen')).toBeTruthy();
    expect(screen.queryByText('Alex Rivera')).toBeNull();
  });

  it('saves an inline edit via updateStudent', async () => {
    setup();
    vi.mocked(firestoreLib.updateStudent).mockResolvedValue(undefined);
    render(<StudentsPage user={user} />);

    fireEvent.click(screen.getByText('Alex Rivera'));
    const firstNameField = screen.getByPlaceholderText('First name');
    fireEvent.change(firstNameField, { target: { value: 'Alexis' } });
    fireEvent.click(screen.getByText('Save'));

    expect(firestoreLib.updateStudent).toHaveBeenCalledWith('student-1', {
      firstName: 'Alexis',
      lastName: 'Rivera',
      studentId: 'STU-1',
      gradeLevel: '4',
    });
  });

  it('bulk-moves selected students to a chosen classroom', async () => {
    setup();
    vi.mocked(firestoreLib.bulkMoveStudents).mockResolvedValue(undefined);
    render(<StudentsPage user={user} />);

    fireEvent.click(screen.getByLabelText('Select Alex Rivera'));
    fireEvent.click(screen.getByText('Move to classroom…'));

    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'ctx-2' } });
    fireEvent.click(screen.getByText('Move'));

    expect(firestoreLib.bulkMoveStudents).toHaveBeenCalledWith(['student-1'], {
      contextId: 'ctx-2',
      ownerUids: ['teacher-2'],
      schoolId: 'school-1',
      gradeLevel: '5',
      contextName: '5th Grade',
    });
  });

  it('navigates to Promote Students, Archive Students, and Import CSV', () => {
    setup();
    render(<StudentsPage user={user} />);

    fireEvent.click(screen.getByText('Promote Students'));
    expect(navigateMock).toHaveBeenCalledWith('/students/promote');

    fireEvent.click(screen.getByText('Archive Students'));
    expect(navigateMock).toHaveBeenCalledWith('/students/archive');

    fireEvent.click(screen.getByText('Import CSV'));
    expect(navigateMock).toHaveBeenCalledWith('/students/import');
  });

  it('hides an archived student by default and reveals it via "Show archived"', () => {
    setup({
      students: [
        student,
        { ...student, id: 'student-2', firstName: 'Jamie', lastName: 'Chen', displayName: 'Jamie Chen', studentId: 'STU-2', archivedAt: new Date() },
      ],
    });
    render(<StudentsPage user={user} />);

    expect(screen.getByText('Alex Rivera')).toBeTruthy();
    expect(screen.queryByText('Jamie Chen')).toBeNull();

    fireEvent.click(screen.getByLabelText('Show archived'));

    expect(screen.getByText('Jamie Chen')).toBeTruthy();
  });

  it('bulk-archives selected students after confirming', async () => {
    setup();
    vi.mocked(firestoreLib.bulkArchiveStudents).mockResolvedValue(undefined);
    render(<StudentsPage user={user} />);

    fireEvent.click(screen.getByLabelText('Select Alex Rivera'));
    fireEvent.click(screen.getByText('Archive'));
    fireEvent.click(screen.getAllByText('Archive')[1]);

    expect(firestoreLib.bulkArchiveStudents).toHaveBeenCalledWith(['student-1']);
  });

  it('bulk-deletes selected students after confirming', async () => {
    setup();
    vi.mocked(firestoreLib.bulkDeleteStudents).mockResolvedValue(undefined);
    render(<StudentsPage user={user} />);

    fireEvent.click(screen.getByLabelText('Select Alex Rivera'));
    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getAllByText('Delete')[1]);

    expect(firestoreLib.bulkDeleteStudents).toHaveBeenCalledWith(['student-1']);
  });
});
