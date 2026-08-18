import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/features/student/students_screen.dart';

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
      home: StudentsScreen(
        classroomRepository: FakeClassroomRepository(),
        schoolRepository: schoolRepository,
        user: _teacher,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Only school admins can manage the full student roster.'), findsOneWidget);
  });

  testWidgets('shows the school-wide roster for an admin and filters by search', (tester) async {
    final schoolRepository = FakeSchoolRepository();
    final schoolId = await _foundSchool(schoolRepository, _admin);
    final classroomRepository = FakeClassroomRepository();
    final classroom = await classroomRepository.createClassroom(name: '4th Grade', ownerUid: _admin.uid, schoolId: schoolId);
    await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_admin.uid],
      schoolId: schoolId,
    );
    await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Jamie',
      lastName: 'Chen',
      ownerUids: [_admin.uid],
      schoolId: schoolId,
    );

    await tester.pumpWidget(MaterialApp(
      home: StudentsScreen(classroomRepository: classroomRepository, schoolRepository: schoolRepository, user: _admin),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Alex Rivera'), findsOneWidget);
    expect(find.text('Jamie Chen'), findsOneWidget);

    tester.widget<TextField>(find.byKey(const Key('studentSearchField'))).onChanged!('alex');
    await tester.pump();

    expect(find.text('Alex Rivera'), findsOneWidget);
    expect(find.text('Jamie Chen'), findsNothing);
  });

  testWidgets('bulk-archives selected students, hides them by default, reveals via Show archived', (tester) async {
    final schoolRepository = FakeSchoolRepository();
    final schoolId = await _foundSchool(schoolRepository, _admin);
    final classroomRepository = FakeClassroomRepository();
    final classroom = await classroomRepository.createClassroom(name: '4th Grade', ownerUid: _admin.uid, schoolId: schoolId);
    final student = await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_admin.uid],
      schoolId: schoolId,
    );

    await tester.pumpWidget(MaterialApp(
      home: StudentsScreen(classroomRepository: classroomRepository, schoolRepository: schoolRepository, user: _admin),
    ));
    await tester.pumpAndSettle();

    tester
        .widget<CheckboxListTile>(find.byKey(Key('studentRow-${student.id}')))
        .onChanged!(true);
    await tester.pump();

    tester.widget<ElevatedButton>(find.byKey(const Key('bulkArchiveButton'))).onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Alex Rivera'), findsNothing);

    tester.widget<Switch>(find.byKey(const Key('showArchivedSwitch'))).onChanged!(true);
    await tester.pump();

    expect(find.text('Alex Rivera'), findsOneWidget);
  });

  testWidgets('bulk-deletes selected students after confirming', (tester) async {
    final schoolRepository = FakeSchoolRepository();
    final schoolId = await _foundSchool(schoolRepository, _admin);
    final classroomRepository = FakeClassroomRepository();
    final classroom = await classroomRepository.createClassroom(name: '4th Grade', ownerUid: _admin.uid, schoolId: schoolId);
    final student = await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_admin.uid],
      schoolId: schoolId,
    );

    await tester.pumpWidget(MaterialApp(
      home: StudentsScreen(classroomRepository: classroomRepository, schoolRepository: schoolRepository, user: _admin),
    ));
    await tester.pumpAndSettle();

    tester.widget<CheckboxListTile>(find.byKey(Key('studentRow-${student.id}'))).onChanged!(true);
    await tester.pump();

    tester.widget<ElevatedButton>(find.byKey(const Key('bulkDeleteButton'))).onPressed!();
    await tester.pumpAndSettle();

    tester.widget<TextButton>(find.byKey(const Key('confirmDeleteButton'))).onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Alex Rivera'), findsNothing);
  });

  testWidgets('Restore is disabled unless every selected student is archived', (tester) async {
    final schoolRepository = FakeSchoolRepository();
    final schoolId = await _foundSchool(schoolRepository, _admin);
    final classroomRepository = FakeClassroomRepository();
    final classroom = await classroomRepository.createClassroom(name: '4th Grade', ownerUid: _admin.uid, schoolId: schoolId);
    final active = await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_admin.uid],
      schoolId: schoolId,
    );
    final archived = await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Jamie',
      lastName: 'Chen',
      ownerUids: [_admin.uid],
      schoolId: schoolId,
    );
    await classroomRepository.bulkArchiveStudents([archived.id]);

    await tester.pumpWidget(MaterialApp(
      home: StudentsScreen(classroomRepository: classroomRepository, schoolRepository: schoolRepository, user: _admin),
    ));
    await tester.pumpAndSettle();

    tester.widget<Switch>(find.byKey(const Key('showArchivedSwitch'))).onChanged!(true);
    await tester.pump();

    // Select only the archived student -> Restore enabled.
    tester.widget<CheckboxListTile>(find.byKey(Key('studentRow-${archived.id}'))).onChanged!(true);
    await tester.pump();
    expect(tester.widget<ElevatedButton>(find.byKey(const Key('bulkRestoreButton'))).onPressed, isNotNull);

    // Also select the active student -> Restore disabled (mixed selection).
    tester.widget<CheckboxListTile>(find.byKey(Key('studentRow-${active.id}'))).onChanged!(true);
    await tester.pump();
    expect(tester.widget<ElevatedButton>(find.byKey(const Key('bulkRestoreButton'))).onPressed, isNull);
  });

  testWidgets('moves selected students to a chosen classroom', (tester) async {
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
      home: StudentsScreen(classroomRepository: classroomRepository, schoolRepository: schoolRepository, user: _admin),
    ));
    await tester.pumpAndSettle();

    tester.widget<CheckboxListTile>(find.byKey(Key('studentRow-${student.id}'))).onChanged!(true);
    await tester.pump();

    tester.widget<ElevatedButton>(find.byKey(const Key('bulkMoveButton'))).onPressed!();
    await tester.pumpAndSettle();

    tester.widget<DropdownButton<String>>(find.byKey(const Key('classroomTargetDropdown'))).onChanged!(target.id);
    await tester.pump();

    tester.widget<TextButton>(find.byKey(const Key('confirmClassroomTargetButton'))).onPressed!();
    await tester.pumpAndSettle();

    final moved = (await classroomRepository.studentsInSchool(schoolId).first).firstWhere((s) => s.id == student.id);
    expect(moved.contextId, target.id);
  });
}
