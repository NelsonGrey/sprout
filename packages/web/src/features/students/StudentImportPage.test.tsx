import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { StudentImportPage } from './StudentImportPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useClassroomsInSchool: vi.fn(),
  useStudentsInSchool: vi.fn(),
  commitStudentImport: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useSchoolIdsForUser: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/students/import', vi.fn()],
}));

const user = { uid: 'admin-1', displayName: 'Office Manager', email: 'admin@example.com' } as User;

const classroom = {
  id: 'ctx-1',
  type: 'classroom' as const,
  name: '4th Grade',
  ownerUids: ['teacher-1'],
  schoolId: 'school-1',
  gradeLevel: '4',
  createdAt: new Date(),
};

const existingStudent = {
  id: 'existing-1',
  firstName: 'Jamie',
  lastName: 'Chen',
  displayName: 'Jamie Chen',
  studentId: 'STU-2',
  balanceCents: 0,
  contexts: {},
  contextIds: ['ctx-1'],
  ownerUids: ['teacher-1'],
  schoolId: 'school-1',
  createdAt: new Date(),
};

function csvFile(content: string, name = 'roster.csv') {
  return new File([content], name, { type: 'text/csv' });
}

function setup() {
  vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
  vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([classroom]);
  vi.mocked(firestoreLib.useStudentsInSchool).mockReturnValue([existingStudent]);
}

describe('StudentImportPage', () => {
  it('previews new, updated, and error rows from a parsed CSV', async () => {
    setup();
    render(<StudentImportPage user={user} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ctx-1' } });

    const csv = 'firstName,lastName,studentId,gradeLevel\nAlex,Rivera,STU-1,4\nJamie,Chen,STU-2,4\n,NoFirstName,STU-3,4\n';
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [csvFile(csv)] } });

    await waitFor(() => expect(screen.getByText('New')).toBeTruthy());
    expect(screen.getByText('Will update')).toBeTruthy();
    expect(screen.getByText(/Error: Missing first or last name/)).toBeTruthy();
    expect(screen.getByText('2 of 3 rows will be imported (1 skipped).')).toBeTruthy();
  });

  it('flags rows with a blank student ID', async () => {
    setup();
    render(<StudentImportPage user={user} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ctx-1' } });

    const csv = 'firstName,lastName,studentId,gradeLevel\nAlex,Rivera,,4\n';
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [csvFile(csv)] } });

    await waitFor(() =>
      expect(
        screen.getByText(/Some rows have no student ID — those will always create a new student/),
      ).toBeTruthy(),
    );
  });

  it('commits the valid rows with the chosen classroom as target', async () => {
    setup();
    vi.mocked(firestoreLib.commitStudentImport).mockResolvedValue(undefined);
    render(<StudentImportPage user={user} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ctx-1' } });

    const csv = 'firstName,lastName,studentId,gradeLevel\nAlex,Rivera,STU-1,4\nJamie,Chen,STU-2,4\n';
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [csvFile(csv)] } });

    await waitFor(() => expect(screen.getByText('New')).toBeTruthy());
    fireEvent.click(screen.getByText('Import 2 students'));

    await waitFor(() =>
      expect(firestoreLib.commitStudentImport).toHaveBeenCalledWith(
        [
          { firstName: 'Alex', lastName: 'Rivera', studentId: 'STU-1', gradeLevel: '4', existingId: undefined, rawStudentId: 'STU-1', status: 'new' },
          { firstName: 'Jamie', lastName: 'Chen', studentId: 'STU-2', gradeLevel: '4', existingId: 'existing-1', rawStudentId: 'STU-2', status: 'update' },
        ],
        { contextId: 'ctx-1', ownerUids: ['teacher-1'], schoolId: 'school-1', gradeLevel: '4', contextName: '4th Grade' },
      ),
    );
    await waitFor(() => expect(screen.getByText('Imported 2 students.')).toBeTruthy());
  });
});
