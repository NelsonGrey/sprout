import 'package:firebase_auth/firebase_auth.dart' show FirebaseAuthException;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/auth/fake_auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/features/auth/delete_account_screen.dart';

/// Routed harness — the hard-block state's "Go to Staff" button does
/// context.go('/school'), so a plain MaterialApp has no GoRouter ancestor
/// to satisfy that, same reasoning as classroom_detail_screen_test.dart's
/// _routedHarness.
Widget _routedHarness({
  required AuthService authService,
  required ClassroomRepository classroomRepository,
  required SchoolRepository schoolRepository,
  required AppUser user,
}) {
  final router = GoRouter(
    initialLocation: '/account/delete',
    routes: [
      GoRoute(path: '/school', builder: (context, state) => const Scaffold(body: Text('Staff Page'))),
      GoRoute(
        path: '/account/delete',
        builder: (context, state) => DeleteAccountScreen(
          authService: authService,
          classroomRepository: classroomRepository,
          schoolRepository: schoolRepository,
          user: user,
        ),
      ),
    ],
  );
  return MaterialApp.router(routerConfig: router);
}

const _user = AppUser(
  uid: 'teacher-1',
  displayName: 'Ms. Lord',
  email: 'lord@example.com',
  providerId: 'google.com',
);

void main() {
  testWidgets('sole super admin sees a hard block, not a delete button', (tester) async {
    final schoolRepository = FakeSchoolRepository();
    await schoolRepository.createSchool(name: 'Riverside Elementary', founderUid: _user.uid);

    await tester.pumpWidget(_routedHarness(
      authService: FakeAuthService(),
      classroomRepository: FakeClassroomRepository(),
      schoolRepository: schoolRepository,
      user: _user,
    ));
    await tester.pumpAndSettle();

    expect(find.text("You can't delete your account yet"), findsOneWidget);
    expect(find.byKey(const Key('deleteAccountButton')), findsNothing);

    await tester.tap(find.byKey(const Key('goToStaffButton')));
    await tester.pumpAndSettle();
    expect(find.text('Staff Page'), findsOneWidget);
  });

  testWidgets('a school membership without sole-super-admin status does not block deletion', (tester) async {
    final schoolRepository = FakeSchoolRepository();
    await schoolRepository.createSchool(name: 'Riverside Elementary', founderUid: 'principal-1');
    await schoolRepository.inviteMember(
      schoolId: (await schoolRepository.schoolIdsForUser('principal-1').first).first,
      email: _user.email!,
      role: MemberRole.teacher,
      invitedByUid: 'principal-1',
    );
    await schoolRepository.claimPendingInviteIfAny(uid: _user.uid, email: _user.email!, displayName: _user.displayName);

    await tester.pumpWidget(_routedHarness(
      authService: FakeAuthService(),
      classroomRepository: FakeClassroomRepository(),
      schoolRepository: schoolRepository,
      user: _user,
    ));
    await tester.pumpAndSettle();

    expect(find.text("You can't delete your account yet"), findsNothing);
    expect(find.textContaining("You'll leave Riverside Elementary"), findsOneWidget);
    expect(find.byKey(const Key('deleteAccountButton')), findsOneWidget);
  });

  testWidgets('standalone classrooms require acknowledgement before delete is enabled', (tester) async {
    final classroomRepository = FakeClassroomRepository();
    await classroomRepository.createClassroom(name: "Ms. Lord's Class", ownerUid: _user.uid);

    await tester.pumpWidget(_routedHarness(
      authService: FakeAuthService(),
      classroomRepository: classroomRepository,
      schoolRepository: FakeSchoolRepository(),
      user: _user,
    ));
    await tester.pumpAndSettle();

    expect(find.textContaining("Ms. Lord's Class"), findsOneWidget);

    final buttonBefore = tester.widget<ElevatedButton>(find.byKey(const Key('deleteAccountButton')));
    expect(buttonBefore.onPressed, isNull);

    await tester.tap(find.byKey(const Key('acknowledgeCheckbox')));
    await tester.pumpAndSettle();

    final buttonAfter = tester.widget<ElevatedButton>(find.byKey(const Key('deleteAccountButton')));
    expect(buttonAfter.onPressed, isNotNull);
  });

  testWidgets('successful delete: reauthenticates first, then runs the full cleanup sequence', (tester) async {
    final authService = FakeAuthService();
    final classroomRepository = FakeClassroomRepository();
    final schoolRepository = FakeSchoolRepository();

    await schoolRepository.createSchool(name: 'Other Super Admin School', founderUid: 'other-super-admin');
    final schoolId = (await schoolRepository.schoolIdsForUser('other-super-admin').first).first;
    await schoolRepository.inviteMember(
      schoolId: schoolId,
      email: _user.email!,
      role: MemberRole.teacher,
      invitedByUid: 'other-super-admin',
    );
    await schoolRepository.claimPendingInviteIfAny(uid: _user.uid, email: _user.email!, displayName: _user.displayName);
    final classroom = await classroomRepository.createClassroom(name: 'Standalone Class', ownerUid: _user.uid);
    final student = await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_user.uid],
    );

    await tester.pumpWidget(_routedHarness(
      authService: authService,
      classroomRepository: classroomRepository,
      schoolRepository: schoolRepository,
      user: _user,
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('acknowledgeCheckbox')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('deleteAccountButton')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('confirmDeleteButton')));
    await tester.pumpAndSettle();

    expect(authService.reauthenticateCalled, isTrue);
    expect(authService.deleteAccountCalled, isTrue);
    expect(await schoolRepository.schoolIdsForUser(_user.uid).first, isEmpty);
    expect(await classroomRepository.myClassrooms(_user.uid).first, isEmpty);
    // The student in the destroyed standalone classroom is gone too.
    expect((await classroomRepository.studentsInClassroom(classroom.id).first).map((s) => s.id), isNot(contains(student.id)));
  });

  testWidgets('a failed reauthentication shows an error and never runs cleanup', (tester) async {
    final authService = FakeAuthService()..reauthenticateError = FirebaseAuthException(code: 'wrong-password');
    final schoolRepository = FakeSchoolRepository();
    await schoolRepository.createSchool(name: 'Other Super Admin School', founderUid: 'other-super-admin');
    final schoolId = (await schoolRepository.schoolIdsForUser('other-super-admin').first).first;
    await schoolRepository.inviteMember(
      schoolId: schoolId,
      email: _user.email!,
      role: MemberRole.teacher,
      invitedByUid: 'other-super-admin',
    );
    await schoolRepository.claimPendingInviteIfAny(uid: _user.uid, email: _user.email!, displayName: _user.displayName);

    await tester.pumpWidget(_routedHarness(
      authService: authService,
      classroomRepository: FakeClassroomRepository(),
      schoolRepository: schoolRepository,
      user: _user,
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('deleteAccountButton')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('confirmDeleteButton')));
    await tester.pumpAndSettle();

    expect(authService.reauthenticateCalled, isTrue);
    expect(authService.deleteAccountCalled, isFalse);
    // Cleanup never ran — the membership is still there.
    expect(await schoolRepository.schoolIdsForUser(_user.uid).first, isNotEmpty);
    expect(find.text('Incorrect password.'), findsOneWidget);
  });
}
