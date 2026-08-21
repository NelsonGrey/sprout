import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/services/auth/fake_auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/features/student/today_screen.dart';

const _teacherUid = 'teacher-1';

Widget _wrap(Widget child) {
  return MaterialApp.router(
    routerConfig: GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(path: '/', builder: (context, state) => child),
        GoRoute(path: '/me/history', builder: (context, state) => const Text('history screen')),
      ],
    ),
  );
}

void main() {
  testWidgets('shows the balance, at most three recent transactions, and a link to full history', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _teacherUid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_teacherUid],
      contextName: classroom.name,
    );
    for (final reason in ['Homework', 'Chores', 'Reading', 'Extra credit']) {
      await repository.recordTransaction(
        contextId: classroom.id,
        studentId: student.id,
        type: TransactionType.earn,
        amountCents: 500,
        reason: reason,
        createdByUid: _teacherUid,
        ownerUids: [_teacherUid],
      );
    }
    final updated = (await repository.studentsInClassroom(classroom.id).first).first;

    await tester.pumpWidget(
      _wrap(
        TodayScreen(
          classroomRepository: repository,
          authService: FakeAuthService(),
          student: updated,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('\$20.00'), findsOneWidget);
    expect(find.text('Extra credit'), findsOneWidget);
    expect(find.text('Reading'), findsOneWidget);
    expect(find.text('Chores'), findsOneWidget);
    expect(find.text('Homework'), findsNothing);
  });

  testWidgets('tapping "See all history" navigates to the history screen', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _teacherUid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_teacherUid],
    );

    await tester.pumpWidget(
      _wrap(
        TodayScreen(
          classroomRepository: repository,
          authService: FakeAuthService(),
          student: student,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('seeAllHistoryButton')));
    await tester.pumpAndSettle();

    expect(find.text('history screen'), findsOneWidget);
  });

  testWidgets('offers a discussion-only reflection prompt with no text input', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _teacherUid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_teacherUid],
    );

    await tester.pumpWidget(
      _wrap(
        TodayScreen(
          classroomRepository: repository,
          authService: FakeAuthService(),
          student: student,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('reflectionPromptToggle')));
    await tester.pumpAndSettle();

    expect(find.text('Discuss aloud with an adult — nothing typed here is saved.'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
  });
}
