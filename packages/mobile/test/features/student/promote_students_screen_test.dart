import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/features/student/promote_students_screen.dart';

const _admin = AppUser(uid: 'admin-1', displayName: 'Office Manager', email: 'admin@example.com');
const _teacher = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');

Future<String> _foundSchool(FakeSchoolRepository repository, AppUser founder) async {
  final school = await repository.createSchool(
    name: 'Riverside Elementary',
    founderUid: founder.uid,
    founderDisplayName: founder.displayName,
    founderEmail: founder.email,
  );
  return school.id;
}

void main() {
  testWidgets('denies a plain teacher', (tester) async {
    final schoolRepository = FakeSchoolRepository();
    final schoolId = await _foundSchool(schoolRepository, _admin);
    await schoolRepository.inviteMember(
      schoolId: schoolId,
      email: _teacher.email!,
      role: MemberRole.teacher,
      invitedByUid: _admin.uid,
    );
    await schoolRepository.claimPendingInviteIfAny(uid: _teacher.uid, email: _teacher.email!);

    await tester.pumpWidget(MaterialApp(
      home: PromoteStudentsScreen(
        classroomRepository: FakeClassroomRepository(),
        schoolRepository: schoolRepository,
        user: _teacher,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Only school admins can promote students.'), findsOneWidget);
  });

  testWidgets('renders one row per occupied classroom, including an archived-only one', (tester) async {
    final schoolRepository = FakeSchoolRepository();
    final schoolId = await _foundSchool(schoolRepository, _admin);
    final classroomRepository = FakeClassroomRepository();
    final classroomA = await classroomRepository.createClassroom(name: '4th Grade', ownerUid: _admin.uid, schoolId: schoolId);
    final classroomB = await classroomRepository.createClassroom(name: 'Empty Room', ownerUid: _admin.uid, schoolId: schoolId);
    final archivedStudent = await classroomRepository.addStudent(
      contextId: classroomA.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_admin.uid],
      schoolId: schoolId,
    );
    await classroomRepository.bulkArchiveStudents([archivedStudent.id]);

    await tester.pumpWidget(MaterialApp(
      home: PromoteStudentsScreen(classroomRepository: classroomRepository, schoolRepository: schoolRepository, user: _admin),
    ));
    await tester.pumpAndSettle();

    // Promote's grouping includes already-archived students (parity with web) — the
    // classroom with only an archived student still gets a row.
    expect(find.byKey(Key('promoteRow-${classroomA.id}')), findsOneWidget);
    expect(find.byKey(Key('promoteRow-${classroomB.id}')), findsNothing);
  });

  testWidgets('promotes a mapped classroom via bulkMoveStudents', (tester) async {
    final schoolRepository = FakeSchoolRepository();
    final schoolId = await _foundSchool(schoolRepository, _admin);
    final classroomRepository = FakeClassroomRepository();
    final source = await classroomRepository.createClassroom(name: '4th Grade', ownerUid: _admin.uid, schoolId: schoolId);
    final target = await classroomRepository.createClassroom(name: '5th Grade', ownerUid: _admin.uid, schoolId: schoolId);
    final student = await classroomRepository.addStudent(
      contextId: source.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_admin.uid],
      schoolId: schoolId,
    );

    await tester.pumpWidget(MaterialApp(
      home: PromoteStudentsScreen(classroomRepository: classroomRepository, schoolRepository: schoolRepository, user: _admin),
    ));
    await tester.pumpAndSettle();

    tester
        .widget<DropdownButton<String?>>(find.byKey(Key('promoteTargetDropdown-${source.id}')))
        .onChanged!(target.id);
    await tester.pump();

    tester.widget<ElevatedButton>(find.byKey(const Key('promoteAllButton'))).onPressed!();
    await tester.pumpAndSettle();

    final moved = (await classroomRepository.studentsInSchool(schoolId).first).firstWhere((s) => s.id == student.id);
    expect(moved.contextId, target.id);
    expect(find.text('Promotion complete.'), findsOneWidget);
  });

  testWidgets('disables Promote All when nothing is mapped', (tester) async {
    final schoolRepository = FakeSchoolRepository();
    final schoolId = await _foundSchool(schoolRepository, _admin);
    final classroomRepository = FakeClassroomRepository();
    final source = await classroomRepository.createClassroom(name: '4th Grade', ownerUid: _admin.uid, schoolId: schoolId);
    await classroomRepository.addStudent(
      contextId: source.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_admin.uid],
      schoolId: schoolId,
    );

    await tester.pumpWidget(MaterialApp(
      home: PromoteStudentsScreen(classroomRepository: classroomRepository, schoolRepository: schoolRepository, user: _admin),
    ));
    await tester.pumpAndSettle();

    expect(tester.widget<ElevatedButton>(find.byKey(const Key('promoteAllButton'))).onPressed, isNull);
  });
}
