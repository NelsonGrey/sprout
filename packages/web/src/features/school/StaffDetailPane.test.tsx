import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ClassroomContext, SchoolMember } from '@sprout/shared';
import { StaffDetailPane } from './StaffDetailPane';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  assignClassroomOwner: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  removeMember: vi.fn(),
  revokeClassroomGrant: vi.fn(),
  updateMemberScope: vi.fn(),
}));

const teacher: SchoolMember = {
  uid: 'teacher-1',
  role: 'teacher',
  displayName: 'Ms. Lord',
  email: 'lord@example.com',
  scope: { type: 'own' },
  addedByUid: 'delegate-1',
  createdAt: new Date(),
};

const otherTeacher: SchoolMember = {
  uid: 'teacher-2',
  role: 'teacher',
  displayName: 'Mr. Kim',
  email: 'kim@example.com',
  scope: { type: 'own' },
  addedByUid: 'delegate-1',
  createdAt: new Date(),
};

const ownedClassroom: ClassroomContext = {
  id: 'ctx-1',
  type: 'classroom',
  name: '3rd Grade',
  ownerUids: ['teacher-1'],
  schoolId: 'school-1',
  createdAt: new Date(),
};

const unassignedClassroom: ClassroomContext = {
  id: 'ctx-2',
  type: 'classroom',
  name: 'Room 4',
  ownerUids: [],
  schoolId: 'school-1',
  createdAt: new Date(),
};

const otherOwnedClassroom: ClassroomContext = {
  id: 'ctx-3',
  type: 'classroom',
  name: 'Room 5',
  ownerUids: ['teacher-2'],
  schoolId: 'school-1',
  createdAt: new Date(),
};

const baseProps = {
  schoolId: 'school-1',
  gradeOptions: ['K', '1', '2', '3'],
  canRemove: false,
  onRemoved: vi.fn(),
};

describe('StaffDetailPane', () => {
  it("lists a teacher's assigned classrooms with an unassign control", () => {
    render(
      <StaffDetailPane
        {...baseProps}
        member={teacher}
        canEditScope
        schoolClassrooms={[ownedClassroom, unassignedClassroom]}
        allMembers={[teacher]}
      />,
    );

    expect(screen.getByText('3rd Grade')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Unassign 3rd Grade'));
    expect(firestoreLib.assignClassroomOwner).toHaveBeenCalledWith('ctx-1', null);
  });

  it('assigns an unassigned classroom to a teacher', () => {
    render(
      <StaffDetailPane
        {...baseProps}
        member={teacher}
        canEditScope
        schoolClassrooms={[unassignedClassroom]}
        allMembers={[teacher]}
      />,
    );

    expect(screen.getByText('No classrooms assigned.')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ctx-2' } });

    expect(firestoreLib.assignClassroomOwner).toHaveBeenCalledWith('ctx-2', 'teacher-1');
  });

  it("reassigns another teacher's classroom without a separate unassign step", () => {
    render(
      <StaffDetailPane
        {...baseProps}
        member={teacher}
        canEditScope
        schoolClassrooms={[otherOwnedClassroom]}
        allMembers={[teacher, otherTeacher]}
      />,
    );

    expect(screen.getByText('Room 5 — currently Mr. Kim')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ctx-3' } });

    expect(firestoreLib.assignClassroomOwner).toHaveBeenCalledWith('ctx-3', 'teacher-1');
  });

  it('resolves classroom names for classroom grants instead of showing raw ids', () => {
    render(
      <StaffDetailPane
        {...baseProps}
        member={{ ...teacher, classroomGrants: { 'ctx-3': 'award' } }}
        canEditScope
        schoolClassrooms={[otherOwnedClassroom]}
        allMembers={[teacher, otherTeacher]}
      />,
    );

    expect(screen.getByText('Room 5 — award')).toBeTruthy();
    expect(screen.queryByText(/Classroom ctx-3/)).toBeNull();
  });

  it('hides the Assigned Classrooms section when canEditScope is false', () => {
    render(
      <StaffDetailPane
        {...baseProps}
        member={teacher}
        canEditScope={false}
        schoolClassrooms={[ownedClassroom]}
        allMembers={[teacher]}
      />,
    );

    expect(screen.queryByText('Assigned Classrooms')).toBeNull();
  });
});
