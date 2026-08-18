import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/features/student/archive_students_screen.dart';

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
      home: ArchiveStudentsScreen(
        classroomRepository: FakeClassroomRepository(),
        schoolRepository: schoolRepository,
        user: _teacher,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Only school admins can archive students.'), findsOneWidget);
  });

  testWidgets('excludes an already-archived-only classroom from the grouping', (tester) async {
    final schoolRepository = FakeSchoolRepository();
    final schoolId = await _foundSchool(schoolRepository, _admin);
    final classroomRepository = FakeClassroomRepository();
    final classroomA = await classroomRepository.createClassroom(name: '4th Grade', ownerUid: _admin.uid, schoolId: schoolId);
    final active = await classroomRepository.addStudent(
      contextId: classroomA.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_admin.uid],
      schoolId: schoolId,
    );
    final classroomB = await classroomRepository.createClassroom(name: 'Grad Room', ownerUid: _admin.uid, schoolId: schoolId);
    final alreadyArchived = await classroomRepository.addStudent(
      contextId: classroomB.id,
      firstName: 'Jamie',
      lastName: 'Chen',
      ownerUids: [_admin.uid],
      schoolId: schoolId,
    );
    await classroomRepository.bulkArchiveStudents([alreadyArchived.id]);

    await tester.pumpWidget(MaterialApp(
      home: ArchiveStudentsScreen(classroomRepository: classroomRepository, schoolRepository: schoolRepository, user: _admin),
    ));
    await tester.pumpAndSettle();

    expect(active.archivedAt, isNull);
    expect(find.byKey(Key('archiveRow-${classroomA.id}')), findsOneWidget);
    // Archive's grouping EXCLUDES already-archived students (opposite of
    // Promote) — a classroom with only an archived student gets no row.
    expect(find.byKey(Key('archiveRow-${classroomB.id}')), findsNothing);
  });

  testWidgets('archives every student in the checked classrooms via one combined call', (tester) async {
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
      home: ArchiveStudentsScreen(classroomRepository: classroomRepository, schoolRepository: schoolRepository, user: _admin),
    ));
    await tester.pumpAndSettle();

    tester.widget<CheckboxListTile>(find.byKey(Key('archiveRow-${classroom.id}'))).onChanged!(true);
    await tester.pump();

    tester.widget<ElevatedButton>(find.byKey(const Key('archiveAllButton'))).onPressed!();
    await tester.pumpAndSettle();

    final result = (await classroomRepository.studentsInSchool(schoolId).first).firstWhere((s) => s.id == student.id);
    expect(result.archivedAt, isNotNull);
    expect(find.text('Archiving complete.'), findsOneWidget);
  });

  testWidgets('disables Archive All when nothing is checked', (tester) async {
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

    await tester.pumpWidget(MaterialApp(
      home: ArchiveStudentsScreen(classroomRepository: classroomRepository, schoolRepository: schoolRepository, user: _admin),
    ));
    await tester.pumpAndSettle();

    expect(tester.widget<ElevatedButton>(find.byKey(const Key('archiveAllButton'))).onPressed, isNull);
  });
}
