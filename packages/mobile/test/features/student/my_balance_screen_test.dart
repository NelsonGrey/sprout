import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/auth/fake_auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/features/student/my_balance_screen.dart';

const _owner = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');
const _studentUser = AppUser(uid: 'student-1-uid', displayName: 'Alex Rivera', email: 'alex@example.com');

void main() {
  testWidgets('shows the balance, classroom name, and transaction history — read only', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _owner.uid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_owner.uid],
      contextName: classroom.name,
    );
    await repository.recordTransaction(
      contextId: classroom.id,
      studentId: student.id,
      type: TransactionType.earn,
      amountCents: 500,
      reason: 'Homework',
      createdByUid: _owner.uid,
      ownerUids: [_owner.uid],
    );
    await repository.linkStudentAccount(
      studentId: student.id,
      email: _studentUser.email!,
      invitedByUid: _owner.uid,
    );
    await repository.claimPendingStudentLinkIfAny(uid: _studentUser.uid, email: _studentUser.email!);
    final linked = (await repository.linkedStudentForUser(_studentUser.uid).first)!;

    await tester.pumpWidget(MaterialApp(
      home: MyBalanceScreen(
        classroomRepository: repository,
        authService: FakeAuthService(),
        student: linked,
      ),
    ));
    await tester.pump();

    expect(find.text('4th Grade'), findsOneWidget);
    expect(find.text('\$5.00'), findsOneWidget);
    expect(find.text('Homework'), findsOneWidget);
    expect(find.text('+\$5.00'), findsOneWidget);

    // No earn/spend controls anywhere on this read-only view.
    expect(find.text('Earn'), findsNothing);
    expect(find.text('Spend'), findsNothing);
    expect(find.byKey(const Key('amountField')), findsNothing);
  });

  testWidgets('has a sign-out action', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _owner.uid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_owner.uid],
    );

    await tester.pumpWidget(MaterialApp(
      home: MyBalanceScreen(
        classroomRepository: repository,
        authService: FakeAuthService(),
        student: student,
      ),
    ));
    await tester.pump();

    expect(find.byTooltip('Sign out'), findsOneWidget);
  });
}
