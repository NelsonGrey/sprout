import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/features/student/history_screen.dart';

const _teacherUid = 'teacher-1';

void main() {
  testWidgets('shows an empty state with no transactions', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _teacherUid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_teacherUid],
    );

    await tester.pumpWidget(
      MaterialApp(home: HistoryScreen(classroomRepository: repository, student: student)),
    );
    await tester.pumpAndSettle();

    expect(find.text('No transactions yet.'), findsOneWidget);
  });

  testWidgets('expands a discussion-only reflection prompt on tap — nothing stored', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _teacherUid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_teacherUid],
    );
    await repository.recordTransaction(
      contextId: classroom.id,
      studentId: student.id,
      type: TransactionType.spend,
      amountCents: 300,
      reason: 'New cleats',
      createdByUid: _teacherUid,
      ownerUids: [_teacherUid],
    );

    await tester.pumpWidget(
      MaterialApp(home: HistoryScreen(classroomRepository: repository, student: student)),
    );
    await tester.pumpAndSettle();

    expect(find.text('New cleats'), findsOneWidget);
    expect(find.textContaining('What happened?'), findsNothing);

    await tester.tap(find.text('New cleats'));
    await tester.pumpAndSettle();

    expect(find.textContaining('What happened?'), findsOneWidget);
    expect(find.textContaining('nothing typed here is saved'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
  });
}
