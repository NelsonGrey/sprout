import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/auth/fake_auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/features/classroom/classrooms_screen.dart';

const _user = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');
const _specialist = AppUser(uid: 'specialist-1', displayName: 'Coach Kim', email: 'kim@example.com');

void main() {
  testWidgets('shows empty state with no classrooms', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: ClassroomsScreen(
        authService: FakeAuthService(),
        classroomRepository: FakeClassroomRepository(),
        schoolRepository: FakeSchoolRepository(),
        user: _user,
      ),
    ));
    await tester.pump();

    expect(find.text('No classrooms yet — add one below.'), findsOneWidget);
  });

  testWidgets('creating a classroom adds it to the list', (tester) async {
    final repository = FakeClassroomRepository();
    await tester.pumpWidget(MaterialApp(
      home: ClassroomsScreen(
        authService: FakeAuthService(),
        classroomRepository: repository,
        schoolRepository: FakeSchoolRepository(),
        user: _user,
      ),
    ));

    final field = tester.widget<TextField>(find.byKey(const Key('classroomNameField')));
    field.controller!.text = "Mrs. Lord's 4th Grade";

    final button = tester.widget<ElevatedButton>(find.byKey(const Key('createClassroomButton')));
    button.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text("Mrs. Lord's 4th Grade"), findsOneWidget);
  });

  testWidgets('a grade-scoped teacher sees classrooms they do not own', (tester) async {
    final classroomRepository = FakeClassroomRepository();
    final schoolRepository = FakeSchoolRepository();
    final school = await schoolRepository.createSchool(
      name: 'Riverside Elementary',
      founderUid: 'principal-1',
    );
    await classroomRepository.createClassroom(
      name: "Mrs. Lord's 4th Grade",
      ownerUid: _user.uid,
      schoolId: school.id,
      gradeLevel: '4',
    );
    await schoolRepository.inviteMember(
      schoolId: school.id,
      email: _specialist.email!,
      role: MemberRole.teacher,
      scope: const MemberScope.grades(['4']),
      invitedByUid: 'principal-1',
    );
    await schoolRepository.claimPendingInviteIfAny(
      uid: _specialist.uid,
      email: _specialist.email!,
      displayName: _specialist.displayName,
    );

    await tester.pumpWidget(MaterialApp(
      home: ClassroomsScreen(
        authService: FakeAuthService(),
        classroomRepository: classroomRepository,
        schoolRepository: schoolRepository,
        user: _specialist,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text("Mrs. Lord's 4th Grade"), findsOneWidget);
  });

  testWidgets('a whole-school-scoped teacher sees every classroom in the school', (tester) async {
    final classroomRepository = FakeClassroomRepository();
    final schoolRepository = FakeSchoolRepository();
    final school = await schoolRepository.createSchool(
      name: 'Riverside Elementary',
      founderUid: 'principal-1',
    );
    await classroomRepository.createClassroom(
      name: 'Kindergarten Room',
      ownerUid: _user.uid,
      schoolId: school.id,
      gradeLevel: 'K',
    );
    await classroomRepository.createClassroom(
      name: '5th Grade Room',
      ownerUid: _user.uid,
      schoolId: school.id,
      gradeLevel: '5',
    );
    await schoolRepository.inviteMember(
      schoolId: school.id,
      email: _specialist.email!,
      role: MemberRole.teacher,
      scope: const MemberScope.school(),
      invitedByUid: 'principal-1',
    );
    await schoolRepository.claimPendingInviteIfAny(
      uid: _specialist.uid,
      email: _specialist.email!,
      displayName: _specialist.displayName,
    );

    await tester.pumpWidget(MaterialApp(
      home: ClassroomsScreen(
        authService: FakeAuthService(),
        classroomRepository: classroomRepository,
        schoolRepository: schoolRepository,
        user: _specialist,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Kindergarten Room'), findsOneWidget);
    expect(find.text('5th Grade Room'), findsOneWidget);
  });
}
