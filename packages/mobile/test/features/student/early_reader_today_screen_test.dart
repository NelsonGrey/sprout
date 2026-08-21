import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/services/auth/fake_auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/features/student/early_reader_today_screen.dart';

const _teacherUid = 'teacher-1';

void main() {
  testWidgets('shows a plain-language balance sentence, not just a bare \$ figure', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: 'Room 4', ownerUid: _teacherUid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Sam',
      lastName: 'Lee',
      ownerUids: [_teacherUid],
      gradeLevel: 'K',
    );
    await repository.recordTransaction(
      contextId: classroom.id,
      studentId: student.id,
      type: TransactionType.earn,
      amountCents: 500,
      reason: 'Helping clean up',
      createdByUid: _teacherUid,
      ownerUids: [_teacherUid],
    );
    final updated = (await repository.studentsInClassroom(classroom.id).first).first;

    await tester.pumpWidget(
      MaterialApp(
        home: EarlyReaderTodayScreen(
          classroomRepository: repository,
          authService: FakeAuthService(),
          student: updated,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('You have 5.00 dollars.'), findsOneWidget);
    expect(find.text('You earned 5.00 dollars for Helping clean up.'), findsOneWidget);
  });

  testWidgets('shows the Pause · Choose · Grow prompt for an adult, not a text field', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: 'Room 4', ownerUid: _teacherUid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Sam',
      lastName: 'Lee',
      ownerUids: [_teacherUid],
      gradeLevel: 'K',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: EarlyReaderTodayScreen(
          classroomRepository: repository,
          authService: FakeAuthService(),
          student: student,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Pause · Choose · Grow'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
  });
}
