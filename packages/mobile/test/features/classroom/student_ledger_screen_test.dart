import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/features/classroom/student_ledger_screen.dart';

const _user = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');

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
}
