import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/auth/fake_auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/features/classroom/landing_screen.dart';

const _owner = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');
const _studentUser = AppUser(uid: 'student-1-uid', displayName: 'Alex Rivera', email: 'alex@example.com');

void main() {
  testWidgets('shows the balance view for a linked student with no staff access', (tester) async {
    final classroomRepository = FakeClassroomRepository();
    final schoolRepository = FakeSchoolRepository();
    final classroom = await classroomRepository.createClassroom(name: '4th Grade', ownerUid: _owner.uid);
    final student = await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_owner.uid],
      contextName: classroom.name,
    );
    await classroomRepository.linkStudentAccount(
      studentId: student.id,
      email: _studentUser.email!,
      invitedByUid: _owner.uid,
    );
    await classroomRepository.claimPendingStudentLinkIfAny(uid: _studentUser.uid, email: _studentUser.email!);

    await tester.pumpWidget(MaterialApp(
      home: LandingScreen(
        authService: FakeAuthService(),
        classroomRepository: classroomRepository,
        schoolRepository: schoolRepository,
        user: _studentUser,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('4th Grade'), findsOneWidget);
    expect(find.text('My Classrooms'), findsNothing);
  });

  testWidgets('shows the collapsed early-reader Today for a linked student in Pre-K-2', (tester) async {
    final classroomRepository = FakeClassroomRepository();
    final schoolRepository = FakeSchoolRepository();
    final classroom = await classroomRepository.createClassroom(name: 'Room 4', ownerUid: _owner.uid);
    final student = await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Sam',
      lastName: 'Lee',
      ownerUids: [_owner.uid],
      gradeLevel: 'K',
    );
    await classroomRepository.linkStudentAccount(
      studentId: student.id,
      email: _studentUser.email!,
      invitedByUid: _owner.uid,
    );
    await classroomRepository.claimPendingStudentLinkIfAny(uid: _studentUser.uid, email: _studentUser.email!);

    await tester.pumpWidget(MaterialApp(
      home: LandingScreen(
        authService: FakeAuthService(),
        classroomRepository: classroomRepository,
        schoolRepository: schoolRepository,
        user: _studentUser,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Pause · Choose · Grow'), findsOneWidget);
  });

  testWidgets('shows the staff classrooms view for an unlinked user', (tester) async {
    final classroomRepository = FakeClassroomRepository();
    final schoolRepository = FakeSchoolRepository();

    await tester.pumpWidget(MaterialApp(
      home: LandingScreen(
        authService: FakeAuthService(),
        classroomRepository: classroomRepository,
        schoolRepository: schoolRepository,
        user: _owner,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('My Classrooms'), findsOneWidget);
  });

  testWidgets('defaults to the staff view for a dual-role user (linked student who also has staff access)',
      (tester) async {
    final classroomRepository = FakeClassroomRepository();
    final schoolRepository = FakeSchoolRepository();
    final classroom = await classroomRepository.createClassroom(name: '4th Grade', ownerUid: _owner.uid);
    final student = await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_owner.uid],
    );
    await classroomRepository.linkStudentAccount(
      studentId: student.id,
      email: _studentUser.email!,
      invitedByUid: _owner.uid,
    );
    await classroomRepository.claimPendingStudentLinkIfAny(uid: _studentUser.uid, email: _studentUser.email!);
    // The same person also owns a classroom of their own (the rare
    // dual-role case) — should still land on the staff experience.
    await classroomRepository.createClassroom(name: 'Dual-role Room', ownerUid: _studentUser.uid);

    await tester.pumpWidget(MaterialApp(
      home: LandingScreen(
        authService: FakeAuthService(),
        classroomRepository: classroomRepository,
        schoolRepository: schoolRepository,
        user: _studentUser,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('My Classrooms'), findsOneWidget);
  });
}
