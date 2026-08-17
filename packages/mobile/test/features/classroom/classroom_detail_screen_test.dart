import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/features/classroom/classroom_detail_screen.dart';

/// Minimal router harness for tests that trigger context.go('/') (e.g.
/// classroom deletion) — plain MaterialApp has no GoRouter ancestor.
Widget _routedHarness(ClassroomRepository repository, String contextId, {SchoolRepository? schoolRepository}) {
  final router = GoRouter(
    initialLocation: '/classrooms/$contextId',
    routes: [
      GoRoute(path: '/', builder: (context, state) => const Scaffold(body: Text('My Classrooms'))),
      GoRoute(
        path: '/classrooms/:contextId',
        builder: (context, state) => ClassroomDetailScreen(
          classroomRepository: repository,
          schoolRepository: schoolRepository ?? FakeSchoolRepository(),
          user: _user,
          contextId: state.pathParameters['contextId']!,
        ),
      ),
    ],
  );
  return MaterialApp.router(routerConfig: router);
}

const _user = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');
const _admin = AppUser(uid: 'admin-1', displayName: 'Office Manager', email: 'admin@example.com');

void main() {
  testWidgets('shows empty state with no students', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _user.uid);

    await tester.pumpWidget(MaterialApp(
      home: ClassroomDetailScreen(
        classroomRepository: repository,
        schoolRepository: FakeSchoolRepository(),
        user: _user,
        contextId: classroom.id,
      ),
    ));
    await tester.pump();

    expect(find.text('No students yet — create one below.'), findsOneWidget);
  });

  testWidgets('adding a student shows them in the roster with a zero balance', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _user.uid);

    await tester.pumpWidget(MaterialApp(
      home: ClassroomDetailScreen(
        classroomRepository: repository,
        schoolRepository: FakeSchoolRepository(),
        user: _user,
        contextId: classroom.id,
      ),
    ));
    await tester.pump();

    final field = tester.widget<TextField>(find.byKey(const Key('studentNameField')));
    field.controller!.text = 'Alex';

    final button = tester.widget<ElevatedButton>(find.byKey(const Key('addStudentButton')));
    button.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Alex'), findsOneWidget);
    expect(find.text('\$0.00'), findsOneWidget);
  });

  testWidgets('a non-owning viewer sees the real title and adds a correctly-scoped student',
      (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: _user.uid,
      schoolId: 'school-1',
      gradeLevel: '4',
    );
    // Manage rights come from role (admin), not scope — needed for the
    // viewer to even see the create-student form, matching
    // hasManageAccess's narrowed rule.
    final schoolRepository = FakeSchoolRepository();
    await schoolRepository.inviteMember(
      schoolId: 'school-1',
      email: _admin.email!,
      role: MemberRole.admin,
      invitedByUid: 'super-1',
    );
    await schoolRepository.claimPendingInviteIfAny(uid: _admin.uid, email: _admin.email!);

    await tester.pumpWidget(MaterialApp(
      home: ClassroomDetailScreen(
        classroomRepository: repository,
        schoolRepository: schoolRepository,
        user: _admin,
        contextId: classroom.id,
      ),
    ));
    await tester.pumpAndSettle();

    // The real classroom name, not the "Classroom" fallback a non-owner
    // used to get when the screen only checked the viewer's own classrooms.
    expect(find.text('4th Grade'), findsOneWidget);

    final field = tester.widget<TextField>(find.byKey(const Key('studentNameField')));
    field.controller!.text = 'Jamie';
    final button = tester.widget<ElevatedButton>(find.byKey(const Key('addStudentButton')));
    button.onPressed!();
    await tester.pumpAndSettle();

    final students = await repository.studentsInClassroom(classroom.id).first;
    final jamie = students.firstWhere((s) => s.displayName == 'Jamie');
    // ownerUids/schoolId/gradeLevel should mirror the classroom's, not
    // default to the non-owning viewer.
    expect(jamie.ownerUids, [_user.uid]);
    expect(jamie.schoolId, 'school-1');
    expect(jamie.gradeLevel, '4');
  });

  testWidgets('renames the classroom', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _user.uid);

    await tester.pumpWidget(MaterialApp(
      home: ClassroomDetailScreen(classroomRepository: repository,
        schoolRepository: FakeSchoolRepository(), user: _user, contextId: classroom.id),
    ));
    await tester.pump();

    final renameButton = tester.widget<IconButton>(find.byKey(const Key('renameClassroomButton')));
    renameButton.onPressed!();
    await tester.pumpAndSettle();

    final field = tester.widget<TextField>(find.byKey(const Key('renameClassroomField')));
    field.controller!.text = '5th Grade';

    final saveButton = tester.widget<TextButton>(find.byKey(const Key('saveClassroomNameButton')));
    saveButton.onPressed!();
    await tester.pumpAndSettle();

    final updated = await repository.classroom(classroom.id).first;
    expect(updated?.name, '5th Grade');
  });

  testWidgets('requires confirming before deleting the classroom, then navigates back', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _user.uid);

    await tester.pumpWidget(_routedHarness(repository, classroom.id));
    await tester.pump();

    final deleteButton = tester.widget<IconButton>(find.byKey(const Key('deleteClassroomButton')));
    deleteButton.onPressed!();
    await tester.pumpAndSettle();

    expect(await repository.classroom(classroom.id).first, isNotNull);

    final confirmButton = tester.widget<TextButton>(find.byKey(const Key('confirmDeleteButton')));
    confirmButton.onPressed!();
    await tester.pumpAndSettle();

    expect(await repository.classroom(classroom.id).first, isNull);
    expect(find.text('My Classrooms'), findsOneWidget);
  });

  testWidgets('renames a student from the roster row', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _user.uid);
    final student = await repository.addStudent(contextId: classroom.id, firstName: 'Alex', lastName: '', ownerUids: [_user.uid]);

    await tester.pumpWidget(MaterialApp(
      home: ClassroomDetailScreen(classroomRepository: repository,
        schoolRepository: FakeSchoolRepository(), user: _user, contextId: classroom.id),
    ));
    await tester.pump();

    final renameButton =
        tester.widget<IconButton>(find.byKey(Key('renameStudentButton-${student.id}')));
    renameButton.onPressed!();
    await tester.pumpAndSettle();

    final field = tester.widget<TextField>(find.byKey(const Key('renameStudentField')));
    field.controller!.text = 'Alexis';

    final saveButton = tester.widget<TextButton>(find.byKey(const Key('saveStudentNameButton')));
    saveButton.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Alexis'), findsOneWidget);
  });

  testWidgets('requires confirming before deleting a student from the roster row', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _user.uid);
    final student = await repository.addStudent(contextId: classroom.id, firstName: 'Alex', lastName: '', ownerUids: [_user.uid]);

    await tester.pumpWidget(MaterialApp(
      home: ClassroomDetailScreen(classroomRepository: repository,
        schoolRepository: FakeSchoolRepository(), user: _user, contextId: classroom.id),
    ));
    await tester.pump();

    final deleteButton =
        tester.widget<IconButton>(find.byKey(Key('deleteStudentButton-${student.id}')));
    deleteButton.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Alex'), findsOneWidget);

    final confirmButton = tester.widget<TextButton>(find.byKey(const Key('confirmDeleteButton')));
    confirmButton.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Alex'), findsNothing);
  });

  testWidgets('hides rename/delete/create for a viewer with only award-level access', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: 'other-teacher',
      schoolId: 'school-1',
      gradeLevel: '4',
    );
    final schoolRepository = FakeSchoolRepository();
    await schoolRepository.inviteMember(
      schoolId: 'school-1',
      email: _user.email!,
      role: MemberRole.teacher,
      scope: const MemberScope.school(),
      invitedByUid: 'super-1',
    );
    await schoolRepository.claimPendingInviteIfAny(uid: _user.uid, email: _user.email!);

    await tester.pumpWidget(MaterialApp(
      home: ClassroomDetailScreen(
        classroomRepository: repository,
        schoolRepository: schoolRepository,
        user: _user,
        contextId: classroom.id,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('renameClassroomButton')), findsNothing);
    expect(find.byKey(const Key('deleteClassroomButton')), findsNothing);
    expect(find.byKey(const Key('studentNameField')), findsNothing);
  });

  testWidgets('shows rename/delete/create for a teacher with an explicit manage-level classroom grant',
      (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: 'other-teacher',
      schoolId: 'school-1',
      gradeLevel: '4',
    );
    final schoolRepository = FakeSchoolRepository();
    await schoolRepository.inviteMember(
      schoolId: 'school-1',
      email: _user.email!,
      role: MemberRole.teacher,
      scope: const MemberScope.own(),
      invitedByUid: 'super-1',
    );
    await schoolRepository.claimPendingInviteIfAny(uid: _user.uid, email: _user.email!);
    await schoolRepository.approveAccessRequest(
      AccessRequest(
        id: 'req-1',
        schoolId: 'school-1',
        contextId: classroom.id,
        contextName: '4th Grade',
        requestedByUid: 'other-teacher',
        requestedByDisplayName: 'Other Teacher',
        targetUid: _user.uid,
        targetDisplayName: 'Ms. Lord',
        level: ClassroomGrantLevel.manage,
        status: AccessRequestStatus.pending,
      ),
      resolvedByUid: 'super-1',
    );

    await tester.pumpWidget(MaterialApp(
      home: ClassroomDetailScreen(
        classroomRepository: repository,
        schoolRepository: schoolRepository,
        user: _user,
        contextId: classroom.id,
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('renameClassroomButton')), findsOneWidget);
    expect(find.byKey(const Key('studentNameField')), findsOneWidget);
  });

  testWidgets('lets the owner submit a request-access form for a colleague', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: _user.uid,
      schoolId: 'school-1',
      gradeLevel: '4',
    );
    final schoolRepository = FakeSchoolRepository();
    await schoolRepository.inviteMember(
      schoolId: 'school-1',
      email: 'colleague@example.com',
      role: MemberRole.teacher,
      scope: const MemberScope.own(),
      invitedByUid: _user.uid,
    );
    await schoolRepository.claimPendingInviteIfAny(uid: 'colleague-1', email: 'colleague@example.com');

    await tester.pumpWidget(MaterialApp(
      home: ClassroomDetailScreen(
        classroomRepository: repository,
        schoolRepository: schoolRepository,
        user: _user,
        contextId: classroom.id,
      ),
    ));
    await tester.pumpAndSettle();

    final dropdown =
        tester.widget<DropdownButton<String>>(find.byKey(const Key('requestTargetDropdown')));
    dropdown.onChanged!('colleague-1');
    await tester.pumpAndSettle();

    final requestButton = tester.widget<ElevatedButton>(find.byKey(const Key('requestAccessButton')));
    requestButton.onPressed!();
    await tester.pumpAndSettle();

    final requests = await schoolRepository.accessRequestsForContext(classroom.id).first;
    expect(requests, hasLength(1));
    expect(requests.first.targetUid, 'colleague-1');
    expect(requests.first.level, ClassroomGrantLevel.award);
  });
}
