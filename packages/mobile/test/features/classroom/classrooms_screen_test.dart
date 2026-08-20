import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/auth/fake_auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/features/classroom/classrooms_screen.dart';

const _user = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');
const _specialist = AppUser(uid: 'specialist-1', displayName: 'Coach Kim', email: 'kim@example.com');
const _admin = AppUser(uid: 'admin-1', displayName: 'Office Manager', email: 'admin@example.com');
const _superAdmin = AppUser(uid: 'super-1', displayName: 'Super Admin', email: 'super@example.com');

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

  testWidgets('a super_admin sees every classroom despite having no scope field', (tester) async {
    final classroomRepository = FakeClassroomRepository();
    final schoolRepository = FakeSchoolRepository();
    final school = await schoolRepository.createSchool(
      name: 'Riverside Elementary',
      founderUid: _user.uid,
    );
    await classroomRepository.createClassroom(
      name: '3rd Grade Room',
      ownerUid: _user.uid,
      schoolId: school.id,
      gradeLevel: '3',
    );
    await schoolRepository.inviteMember(
      schoolId: school.id,
      email: _superAdmin.email!,
      role: MemberRole.superAdmin,
      invitedByUid: _user.uid,
    );
    await schoolRepository.claimPendingInviteIfAny(
      uid: _superAdmin.uid,
      email: _superAdmin.email!,
      displayName: _superAdmin.displayName,
    );

    await tester.pumpWidget(MaterialApp(
      home: ClassroomsScreen(
        authService: FakeAuthService(),
        classroomRepository: classroomRepository,
        schoolRepository: schoolRepository,
        user: _superAdmin,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('3rd Grade Room'), findsOneWidget);
  });

  testWidgets('a plain admin sees every classroom despite having no scope field', (tester) async {
    final classroomRepository = FakeClassroomRepository();
    final schoolRepository = FakeSchoolRepository();
    final school = await schoolRepository.createSchool(
      name: 'Riverside Elementary',
      founderUid: _user.uid,
    );
    await classroomRepository.createClassroom(
      name: '2nd Grade Room',
      ownerUid: _user.uid,
      schoolId: school.id,
      gradeLevel: '2',
    );
    await schoolRepository.inviteMember(
      schoolId: school.id,
      email: _admin.email!,
      role: MemberRole.admin,
      invitedByUid: _user.uid,
    );
    await schoolRepository.claimPendingInviteIfAny(
      uid: _admin.uid,
      email: _admin.email!,
      displayName: _admin.displayName,
    );

    await tester.pumpWidget(MaterialApp(
      home: ClassroomsScreen(
        authService: FakeAuthService(),
        classroomRepository: classroomRepository,
        schoolRepository: schoolRepository,
        user: _admin,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('2nd Grade Room'), findsOneWidget);
  });

  testWidgets('tapping a classroom pushes (not replaces), so the user can navigate back to the list', (tester) async {
    final classroomRepository = FakeClassroomRepository();
    final classroom = await classroomRepository.createClassroom(name: '3rd Grade', ownerUid: _user.uid);

    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => ClassroomsScreen(
            authService: FakeAuthService(),
            classroomRepository: classroomRepository,
            schoolRepository: FakeSchoolRepository(),
            user: _user,
          ),
        ),
        GoRoute(
          path: '/classrooms/:contextId',
          builder: (context, state) {
            expect(state.pathParameters['contextId'], classroom.id);
            return const Scaffold(body: Text('Classroom Detail Stub'));
          },
        ),
      ],
    );

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();

    await tester.tap(find.text('3rd Grade'));
    await tester.pumpAndSettle();

    expect(find.text('Classroom Detail Stub'), findsOneWidget);
    expect(router.canPop(), isTrue, reason: 'tapping a classroom must push so the user is never stuck without a way back');

    router.pop();
    await tester.pumpAndSettle();

    expect(find.text('3rd Grade'), findsOneWidget);
  });
}
