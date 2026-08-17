import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/features/classroom/student_ledger_screen.dart';

const _user = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');

/// Minimal router harness for tests that trigger context.go(...) (e.g.
/// student deletion navigating back to the classroom) — plain MaterialApp
/// has no GoRouter ancestor.
Widget _routedHarness(ClassroomRepository repository, String contextId, String studentId) {
  final router = GoRouter(
    initialLocation: '/classrooms/$contextId/students/$studentId',
    routes: [
      GoRoute(
        path: '/classrooms/:contextId',
        builder: (context, state) => const Scaffold(body: Text('Classroom Roster')),
      ),
      GoRoute(
        path: '/classrooms/:contextId/students/:studentId',
        builder: (context, state) => StudentLedgerScreen(
          classroomRepository: repository,
          user: _user,
          contextId: state.pathParameters['contextId']!,
          studentId: state.pathParameters['studentId']!,
        ),
      ),
    ],
  );
  return MaterialApp.router(routerConfig: router);
}

void main() {
  testWidgets('recording an earn updates the balance and history', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _user.uid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      displayName: 'Alex',
      ownerUids: classroom.ownerUids,
    );

    await tester.pumpWidget(MaterialApp(
      home: StudentLedgerScreen(
        classroomRepository: repository,
        user: _user,
        contextId: classroom.id,
        studentId: student.id,
      ),
    ));
    await tester.pump();

    expect(find.text('\$0.00'), findsOneWidget);

    tester.widget<TextField>(find.byKey(const Key('amountField'))).controller!.text = '5';
    tester.widget<TextField>(find.byKey(const Key('reasonField'))).controller!.text = 'Homework';

    final earnButton = tester.widget<ElevatedButton>(find.byKey(const Key('earnButton')));
    earnButton.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('\$5.00'), findsOneWidget);
    expect(find.text('Homework'), findsOneWidget);
    expect(find.text('+\$5.00'), findsOneWidget);
  });

  testWidgets('recording a spend decreases the balance', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _user.uid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      displayName: 'Alex',
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

    await tester.pumpWidget(MaterialApp(
      home: StudentLedgerScreen(
        classroomRepository: repository,
        user: _user,
        contextId: classroom.id,
        studentId: student.id,
      ),
    ));
    await tester.pump();

    expect(find.text('\$10.00'), findsOneWidget);

    tester.widget<TextField>(find.byKey(const Key('amountField'))).controller!.text = '3';
    tester.widget<TextField>(find.byKey(const Key('reasonField'))).controller!.text = 'Store';

    final spendButton = tester.widget<ElevatedButton>(find.byKey(const Key('spendButton')));
    spendButton.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('\$7.00'), findsOneWidget);
  });

  testWidgets('renames the student', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _user.uid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      displayName: 'Alex',
      ownerUids: classroom.ownerUids,
    );

    await tester.pumpWidget(_routedHarness(repository, classroom.id, student.id));
    await tester.pump();

    final renameButton = tester.widget<IconButton>(find.byKey(const Key('renameStudentButton')));
    renameButton.onPressed!();
    await tester.pumpAndSettle();

    final field = tester.widget<TextField>(find.byKey(const Key('renameStudentField')));
    field.controller!.text = 'Alexis';

    final saveButton = tester.widget<TextButton>(find.byKey(const Key('saveStudentNameButton')));
    saveButton.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Alexis'), findsOneWidget);
  });

  testWidgets('requires confirming before deleting the student, then navigates back', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _user.uid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      displayName: 'Alex',
      ownerUids: classroom.ownerUids,
    );

    await tester.pumpWidget(_routedHarness(repository, classroom.id, student.id));
    await tester.pump();

    final deleteButton = tester.widget<IconButton>(find.byKey(const Key('deleteStudentButton')));
    deleteButton.onPressed!();
    await tester.pumpAndSettle();

    final students = await repository.studentsInClassroom(classroom.id).first;
    expect(students, isNotEmpty);

    final confirmButton = tester.widget<TextButton>(find.byKey(const Key('confirmDeleteButton')));
    confirmButton.onPressed!();
    await tester.pumpAndSettle();

    final remaining = await repository.studentsInClassroom(classroom.id).first;
    expect(remaining, isEmpty);
    expect(find.text('Classroom Roster'), findsOneWidget);
  });
}
