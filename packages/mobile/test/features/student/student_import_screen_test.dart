import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/features/student/student_import_preview.dart';
import 'package:sprout/features/student/student_import_screen.dart';

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
  group('parseCsvRows + buildImportPreview (pure, no file picker needed)', () {
    test('classifies new, updated, and error rows from parsed CSV, matching web exactly', () {
      const csv = 'firstName,lastName,studentId,gradeLevel\n'
          'Alex,Rivera,STU-1,3\n'
          'Jamie,Chen,STU-2,4\n'
          ',Smith,STU-3,5\n';
      final rawRows = parseCsvRows(csv);
      expect(rawRows, hasLength(3));

      final preview = buildImportPreview(rawRows, {'STU-2': 'existing-doc-id'});

      expect(preview[0].status, ImportRowStatus.newStudent);
      expect(preview[1].status, ImportRowStatus.update);
      expect(preview[1].existingId, 'existing-doc-id');
      expect(preview[2].status, ImportRowStatus.error);
      expect(preview[2].error, 'Missing first or last name');
    });

    test('a blank studentId never matches, even against an existing record', () {
      final preview = buildImportPreview(
        [
          {'firstName': 'Alex', 'lastName': 'Rivera', 'studentId': ''},
        ],
        {'': 'should-never-match'},
      );
      expect(preview.single.status, ImportRowStatus.newStudent);
      expect(preview.single.existingId, isNull);
    });

    test('does not coerce a numeric-looking studentId to a number', () {
      final rawRows = parseCsvRows('firstName,lastName,studentId\nAlex,Rivera,007\n');
      expect(rawRows.single['studentId'], '007');
    });

    test('skips blank lines like papaparse skipEmptyLines', () {
      final rawRows = parseCsvRows('firstName,lastName,studentId\nAlex,Rivera,STU-1\n\n\nJamie,Chen,STU-2\n');
      expect(rawRows, hasLength(2));
    });
  });

  group('StudentImportScreen', () {
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
        home: StudentImportScreen(
          classroomRepository: FakeClassroomRepository(),
          schoolRepository: schoolRepository,
          user: _teacher,
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Only school admins can import students.'), findsOneWidget);
    });

    testWidgets('disables file picking until a destination classroom is chosen', (tester) async {
      final schoolRepository = FakeSchoolRepository();
      final schoolId = await _foundSchool(schoolRepository, _admin);
      final classroomRepository = FakeClassroomRepository();
      final classroom = await classroomRepository.createClassroom(name: '4th Grade', ownerUid: _admin.uid, schoolId: schoolId);

      await tester.pumpWidget(MaterialApp(
        home: StudentImportScreen(classroomRepository: classroomRepository, schoolRepository: schoolRepository, user: _admin),
      ));
      await tester.pumpAndSettle();

      expect(tester.widget<ElevatedButton>(find.byKey(const Key('pickCsvFileButton'))).onPressed, isNull);

      tester.widget<DropdownButton<String>>(find.byKey(const Key('importTargetDropdown'))).onChanged!(classroom.id);
      await tester.pump();

      expect(tester.widget<ElevatedButton>(find.byKey(const Key('pickCsvFileButton'))).onPressed, isNotNull);
    });
  });
}
