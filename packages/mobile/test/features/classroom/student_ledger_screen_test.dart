import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/core/services/connectivity/fake_connectivity_service.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/features/classroom/student_ledger_screen.dart';

const _user = AppUser(
  uid: 'teacher-1',
  displayName: 'Ms. Lord',
  email: 'lord@example.com',
);

/// Minimal router harness for tests that trigger context.go/push/pop (e.g.
/// student deletion popping back to the classroom) — plain MaterialApp has
/// no GoRouter ancestor. Starts at the classroom route and returns the
/// router so the caller can `.push()` to the student route, mirroring how
/// the real app always reaches this screen (classroom_detail_screen.dart
/// pushes, never replaces) — that's what makes `context.pop()` in
/// student_ledger_screen.dart's delete handler have somewhere to return to.
GoRouter _routedHarness(
  ClassroomRepository repository,
  String contextId,
  String studentId, {
  SchoolRepository? schoolRepository,
}) {
  return GoRouter(
    initialLocation: '/classrooms/$contextId',
    routes: [
      GoRoute(
        path: '/classrooms/:contextId',
        builder: (context, state) =>
            const Scaffold(body: Text('Classroom Roster')),
      ),
      GoRoute(
        path: '/classrooms/:contextId/students/:studentId',
        builder: (context, state) => StudentLedgerScreen(
          classroomRepository: repository,
          schoolRepository: schoolRepository ?? FakeSchoolRepository(),
          connectivityService: FakeConnectivityService(),
          user: _user,
          contextId: state.pathParameters['contextId']!,
          studentId: state.pathParameters['studentId']!,
        ),
      ),
    ],
  );
}

void main() {
  testWidgets('recording an earn updates the balance and history', (
    tester,
  ) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: _user.uid,
    );
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: '',
      ownerUids: classroom.ownerUids,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: StudentLedgerScreen(
          classroomRepository: repository,
          schoolRepository: FakeSchoolRepository(),
          connectivityService: FakeConnectivityService(),
          user: _user,
          contextId: classroom.id,
          studentId: student.id,
        ),
      ),
    );
    await tester.pump();

    expect(find.text('\$0.00'), findsOneWidget);

    tester
            .widget<TextField>(find.byKey(const Key('amountField')))
            .controller!
            .text =
        '5';
    tester
            .widget<TextField>(find.byKey(const Key('reasonField')))
            .controller!
            .text =
        'Homework';

    final earnButton = tester.widget<ElevatedButton>(
      find.byKey(const Key('earnButton')),
    );
    earnButton.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('\$5.00'), findsOneWidget);
    expect(find.text('Homework'), findsOneWidget);
    expect(find.text('+\$5.00'), findsOneWidget);
  });

  testWidgets('recording a spend decreases the balance', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: _user.uid,
    );
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: '',
      ownerUids: classroom.ownerUids,
    );
    await repository.recordTransaction(
      contextId: classroom.id,
      studentId: student.id,
      type: TransactionType.earn,
      amountCents: 1000,
      reason: 'Starting balance',
      createdByUid: _user.uid,
      ownerUids: classroom.ownerUids,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: StudentLedgerScreen(
          classroomRepository: repository,
          schoolRepository: FakeSchoolRepository(),
          connectivityService: FakeConnectivityService(),
          user: _user,
          contextId: classroom.id,
          studentId: student.id,
        ),
      ),
    );
    await tester.pump();

    expect(find.text('\$10.00'), findsOneWidget);

    tester
            .widget<TextField>(find.byKey(const Key('amountField')))
            .controller!
            .text =
        '3';
    tester
            .widget<TextField>(find.byKey(const Key('reasonField')))
            .controller!
            .text =
        'Store';

    final spendButton = tester.widget<ElevatedButton>(
      find.byKey(const Key('spendButton')),
    );
    spendButton.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('\$7.00'), findsOneWidget);
  });

  testWidgets('renames the student', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: _user.uid,
    );
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: '',
      ownerUids: classroom.ownerUids,
    );

    final router = _routedHarness(repository, classroom.id, student.id);
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    router.push('/classrooms/${classroom.id}/students/${student.id}');
    await tester.pumpAndSettle();

    final renameButton = tester.widget<IconButton>(
      find.byKey(const Key('renameStudentButton')),
    );
    renameButton.onPressed!();
    await tester.pumpAndSettle();

    final field = tester.widget<TextField>(
      find.byKey(const Key('renameStudentField')),
    );
    field.controller!.text = 'Alexis';

    final saveButton = tester.widget<TextButton>(
      find.byKey(const Key('saveStudentNameButton')),
    );
    saveButton.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Alexis'), findsOneWidget);
  });

  testWidgets(
    'requires confirming before deleting the student, then navigates back',
    (tester) async {
      final repository = FakeClassroomRepository();
      final classroom = await repository.createClassroom(
        name: '4th Grade',
        ownerUid: _user.uid,
      );
      final student = await repository.addStudent(
        contextId: classroom.id,
        firstName: 'Alex',
        lastName: '',
        ownerUids: classroom.ownerUids,
      );

      final router = _routedHarness(repository, classroom.id, student.id);
      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      router.push('/classrooms/${classroom.id}/students/${student.id}');
      await tester.pumpAndSettle();

      final deleteButton = tester.widget<IconButton>(
        find.byKey(const Key('deleteStudentButton')),
      );
      deleteButton.onPressed!();
      await tester.pumpAndSettle();

      final students = await repository.studentsInClassroom(classroom.id).first;
      expect(students, isNotEmpty);

      final confirmButton = tester.widget<TextButton>(
        find.byKey(const Key('confirmDeleteButton')),
      );
      confirmButton.onPressed!();
      await tester.pumpAndSettle();

      final remaining = await repository
          .studentsInClassroom(classroom.id)
          .first;
      expect(remaining, isEmpty);
      expect(find.text('Classroom Roster'), findsOneWidget);
    },
  );

  testWidgets('hides rename/delete for a viewer with only award-level access', (
    tester,
  ) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: 'other-teacher',
      schoolId: 'school-1',
      gradeLevel: '4',
    );
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: '',
      ownerUids: ['other-teacher'],
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
    await schoolRepository.claimPendingInviteIfAny(
      uid: _user.uid,
      email: _user.email!,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: StudentLedgerScreen(
          classroomRepository: repository,
          schoolRepository: schoolRepository,
          connectivityService: FakeConnectivityService(),
          user: _user,
          contextId: classroom.id,
          studentId: student.id,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('renameStudentButton')), findsNothing);
    expect(find.byKey(const Key('deleteStudentButton')), findsNothing);
    // Award-level access still gets the earn/spend form.
    expect(find.text('Earn'), findsOneWidget);
  });

  testWidgets(
    'shows rename/delete for a teacher with an explicit manage-level classroom grant',
    (tester) async {
      final repository = FakeClassroomRepository();
      final classroom = await repository.createClassroom(
        name: '4th Grade',
        ownerUid: 'other-teacher',
        schoolId: 'school-1',
        gradeLevel: '4',
      );
      final student = await repository.addStudent(
        contextId: classroom.id,
        firstName: 'Alex',
        lastName: '',
        ownerUids: ['other-teacher'],
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
      await schoolRepository.claimPendingInviteIfAny(
        uid: _user.uid,
        email: _user.email!,
      );
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

      await tester.pumpWidget(
        MaterialApp(
          home: StudentLedgerScreen(
            classroomRepository: repository,
            schoolRepository: schoolRepository,
            connectivityService: FakeConnectivityService(),
            user: _user,
            contextId: classroom.id,
            studentId: student.id,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('renameStudentButton')), findsOneWidget);
      expect(find.byKey(const Key('deleteStudentButton')), findsOneWidget);
    },
  );

  testWidgets('lets the owner send a link invite, then shows it as pending', (
    tester,
  ) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: _user.uid,
    );
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: '',
      ownerUids: classroom.ownerUids,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: StudentLedgerScreen(
          classroomRepository: repository,
          schoolRepository: FakeSchoolRepository(),
          connectivityService: FakeConnectivityService(),
          user: _user,
          contextId: classroom.id,
          studentId: student.id,
        ),
      ),
    );
    await tester.pump();

    tester
            .widget<TextField>(find.byKey(const Key('linkStudentEmailField')))
            .controller!
            .text =
        'alex@example.com';
    final sendButton = tester.widget<ElevatedButton>(
      find.byKey(const Key('sendLinkInviteButton')),
    );
    sendButton.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Invite sent to alex@example.com'), findsOneWidget);
  });

  testWidgets('shows a linked badge and lets the owner unlink', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: _user.uid,
    );
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: '',
      ownerUids: classroom.ownerUids,
    );
    await repository.linkStudentAccount(
      studentId: student.id,
      email: 'alex@example.com',
      invitedByUid: _user.uid,
    );
    await repository.claimPendingStudentLinkIfAny(
      uid: 'student-uid',
      email: 'alex@example.com',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: StudentLedgerScreen(
          classroomRepository: repository,
          schoolRepository: FakeSchoolRepository(),
          connectivityService: FakeConnectivityService(),
          user: _user,
          contextId: classroom.id,
          studentId: student.id,
        ),
      ),
    );
    await tester.pump();

    expect(find.textContaining('Linked'), findsOneWidget);

    final unlinkButton = tester.widget<TextButton>(
      find.byKey(const Key('unlinkStudentButton')),
    );
    unlinkButton.onPressed!();
    await tester.pumpAndSettle();

    final updated = await repository.linkedStudentForUser('student-uid').first;
    expect(updated, isNull);
  });

  testWidgets('adds a goal and shows its progress card', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: _user.uid,
    );
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: '',
      ownerUids: classroom.ownerUids,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: StudentLedgerScreen(
          classroomRepository: repository,
          schoolRepository: FakeSchoolRepository(),
          connectivityService: FakeConnectivityService(),
          user: _user,
          contextId: classroom.id,
          studentId: student.id,
        ),
      ),
    );
    await tester.pump();

    final newGoalButton = tester.widget<TextButton>(
      find.byKey(const Key('newGoalButton')),
    );
    newGoalButton.onPressed!();
    await tester.pump();

    tester
            .widget<TextField>(find.byKey(const Key('goalNameField')))
            .controller!
            .text =
        'Bike';
    tester
            .widget<TextField>(find.byKey(const Key('goalTargetField')))
            .controller!
            .text =
        '50';

    final addGoalButton = tester.widget<ElevatedButton>(
      find.byKey(const Key('addGoalButton')),
    );
    addGoalButton.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Bike'), findsOneWidget);
    expect(find.text('\$0.00 of \$50.00 saved'), findsOneWidget);
  });

  testWidgets(
    'recording an earn with a goal selected increments the goal and tags the transaction',
    (tester) async {
      final repository = FakeClassroomRepository();
      final classroom = await repository.createClassroom(
        name: '4th Grade',
        ownerUid: _user.uid,
      );
      final student = await repository.addStudent(
        contextId: classroom.id,
        firstName: 'Alex',
        lastName: '',
        ownerUids: classroom.ownerUids,
      );
      final goal = await repository.createGoal(
        studentId: student.id,
        name: 'Bike',
        targetCents: 5000,
        createdByUid: _user.uid,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: StudentLedgerScreen(
            classroomRepository: repository,
            schoolRepository: FakeSchoolRepository(),
            connectivityService: FakeConnectivityService(),
            user: _user,
            contextId: classroom.id,
            studentId: student.id,
          ),
        ),
      );
      await tester.pump();

      tester
              .widget<TextField>(find.byKey(const Key('amountField')))
              .controller!
              .text =
          '5';
      tester
              .widget<TextField>(find.byKey(const Key('reasonField')))
              .controller!
              .text =
          'Homework';

      final saveAsField = tester.widget<DropdownButtonFormField<String>>(
        find.byKey(const Key('saveAsField')),
      );
      saveAsField.onChanged!(goal.id);
      await tester.pump();

      final earnButton = tester.widget<ElevatedButton>(
        find.byKey(const Key('earnButton')),
      );
      earnButton.onPressed!();
      await tester.pumpAndSettle();

      expect(find.text('\$5.00 of \$50.00 saved'), findsOneWidget);

      final transactions = await repository
          .transactionsForStudent(
            contextId: classroom.id,
            studentId: student.id,
          )
          .first;
      expect(transactions.single.goalId, goal.id);
      expect(transactions.single.savingsLabel, SavingsLabel.goal);
    },
  );

  testWidgets('applying interest records an earn toward the goal', (
    tester,
  ) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: _user.uid,
    );
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: '',
      ownerUids: classroom.ownerUids,
    );
    final goal = await repository.createGoal(
      studentId: student.id,
      name: 'Bike',
      targetCents: 5000,
      createdByUid: _user.uid,
    );
    await repository.recordTransaction(
      contextId: classroom.id,
      studentId: student.id,
      type: TransactionType.earn,
      amountCents: 1000,
      reason: 'Savings',
      goalId: goal.id,
      createdByUid: _user.uid,
      ownerUids: classroom.ownerUids,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: StudentLedgerScreen(
          classroomRepository: repository,
          schoolRepository: FakeSchoolRepository(),
          connectivityService: FakeConnectivityService(),
          user: _user,
          contextId: classroom.id,
          studentId: student.id,
        ),
      ),
    );
    await tester.pump();

    expect(find.text('\$10.00 of \$50.00 saved'), findsOneWidget);

    final applyButton = tester.widget<OutlinedButton>(
      find.byKey(Key('applyInterestButton-${goal.id}')),
    );
    applyButton.onPressed!();
    await tester.pumpAndSettle();

    // 5% of $10.00 saved = $0.50 interest, on top of the existing $10.00.
    expect(find.text('\$10.50 of \$50.00 saved'), findsOneWidget);
  });

  testWidgets('shows no store chips when the catalog is empty', (tester) async {
    final classroomRepository = FakeClassroomRepository();
    final classroom = await classroomRepository.createClassroom(
      name: '4th Grade',
      ownerUid: _user.uid,
    );
    final student = await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: '',
      ownerUids: classroom.ownerUids,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: StudentLedgerScreen(
          classroomRepository: classroomRepository,
          schoolRepository: FakeSchoolRepository(),
          connectivityService: FakeConnectivityService(),
          user: _user,
          contextId: classroom.id,
          studentId: student.id,
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(ActionChip), findsNothing);
  });

  testWidgets('tapping a store item chip prefills amount and reason', (
    tester,
  ) async {
    final classroomRepository = FakeClassroomRepository();
    final classroom = await classroomRepository.createClassroom(
      name: '4th Grade',
      ownerUid: _user.uid,
    );
    final student = await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: '',
      ownerUids: classroom.ownerUids,
    );
    // No catalog-management UI exists on mobile yet (target M-CLASS-05) —
    // seeded directly against the fake, the same shape a web-created item
    // would have in the real (shared) contexts/{id}/storeItems collection.
    classroomRepository.seedStoreItem(
      contextId: classroom.id,
      name: 'Pencil',
      priceCents: 150,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: StudentLedgerScreen(
          classroomRepository: classroomRepository,
          schoolRepository: FakeSchoolRepository(),
          connectivityService: FakeConnectivityService(),
          user: _user,
          contextId: classroom.id,
          studentId: student.id,
        ),
      ),
    );
    await tester.pump();

    await tester.tap(find.widgetWithText(ActionChip, 'Pencil — \$1.50'));
    await tester.pump();

    expect(
      tester
          .widget<TextField>(find.byKey(const Key('amountField')))
          .controller!
          .text,
      '1.50',
    );
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('reasonField')))
          .controller!
          .text,
      'Pencil',
    );
  });

  testWidgets(
    'shows an opportunity-cost reminder when spending with an unfinished goal',
    (tester) async {
      final repository = FakeClassroomRepository();
      final classroom = await repository.createClassroom(
        name: '4th Grade',
        ownerUid: _user.uid,
      );
      final student = await repository.addStudent(
        contextId: classroom.id,
        firstName: 'Alex',
        lastName: '',
        ownerUids: classroom.ownerUids,
      );
      await repository.createGoal(
        studentId: student.id,
        name: 'Bike',
        targetCents: 5000,
        createdByUid: _user.uid,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: StudentLedgerScreen(
            classroomRepository: repository,
            schoolRepository: FakeSchoolRepository(),
            connectivityService: FakeConnectivityService(),
            user: _user,
            contextId: classroom.id,
            studentId: student.id,
          ),
        ),
      );
      await tester.pump();

      expect(
        find.textContaining('Spending this now means less goes toward'),
        findsNothing,
      );

      // enterText (not a direct controller mutation) so the field's onChanged
      // fires and the reminder — which depends on a rebuild, unlike _record's
      // read of the live controller text at submit time — actually reacts.
      await tester.enterText(find.byKey(const Key('amountField')), '3');
      await tester.pump();

      expect(
        find.textContaining('Spending this now means less goes toward: Bike.'),
        findsOneWidget,
      );
    },
  );

  group('offline', () {
    testWidgets(
      'disables Earn/Spend and shows a reconnect notice while offline',
      (tester) async {
        final repository = FakeClassroomRepository();
        final classroom = await repository.createClassroom(
          name: '4th Grade',
          ownerUid: _user.uid,
        );
        final student = await repository.addStudent(
          contextId: classroom.id,
          firstName: 'Alex',
          lastName: '',
          ownerUids: classroom.ownerUids,
        );
        final connectivityService = FakeConnectivityService()..setOnline(false);

        await tester.pumpWidget(
          MaterialApp(
            home: StudentLedgerScreen(
              classroomRepository: repository,
              schoolRepository: FakeSchoolRepository(),
              connectivityService: connectivityService,
              user: _user,
              contextId: classroom.id,
              studentId: student.id,
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(
          find.textContaining('Reconnect to record this transaction'),
          findsOneWidget,
        );
        expect(
          tester
              .widget<ElevatedButton>(find.byKey(const Key('earnButton')))
              .onPressed,
          isNull,
        );
        expect(
          tester
              .widget<ElevatedButton>(find.byKey(const Key('spendButton')))
              .onPressed,
          isNull,
        );
      },
    );

    testWidgets('re-enables Earn/Spend once back online', (tester) async {
      final repository = FakeClassroomRepository();
      final classroom = await repository.createClassroom(
        name: '4th Grade',
        ownerUid: _user.uid,
      );
      final student = await repository.addStudent(
        contextId: classroom.id,
        firstName: 'Alex',
        lastName: '',
        ownerUids: classroom.ownerUids,
      );
      final connectivityService = FakeConnectivityService()..setOnline(false);

      await tester.pumpWidget(
        MaterialApp(
          home: StudentLedgerScreen(
            classroomRepository: repository,
            schoolRepository: FakeSchoolRepository(),
            connectivityService: connectivityService,
            user: _user,
            contextId: classroom.id,
            studentId: student.id,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<ElevatedButton>(find.byKey(const Key('earnButton')))
            .onPressed,
        isNull,
      );

      connectivityService.setOnline(true);
      await tester.pumpAndSettle();

      expect(
        find.textContaining('Reconnect to record this transaction'),
        findsNothing,
      );
      expect(
        tester
            .widget<ElevatedButton>(find.byKey(const Key('earnButton')))
            .onPressed,
        isNotNull,
      );
    });
  });
}
