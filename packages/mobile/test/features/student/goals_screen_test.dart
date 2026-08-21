import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/features/student/goals_screen.dart';

const _teacherUid = 'teacher-1';

void main() {
  testWidgets('shows an empty state with no goals', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _teacherUid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_teacherUid],
    );

    await tester.pumpWidget(
      MaterialApp(home: GoalsScreen(classroomRepository: repository, student: student)),
    );
    await tester.pumpAndSettle();

    expect(find.text('No goals yet — ask an adult to set one up with you.'), findsOneWidget);
  });

  testWidgets('shows every goal, read-only, with no delete control', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _teacherUid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_teacherUid],
    );
    await repository.createGoal(
      studentId: student.id,
      name: 'New soccer ball',
      targetCents: 2000,
      createdByUid: _teacherUid,
    );

    await tester.pumpWidget(
      MaterialApp(home: GoalsScreen(classroomRepository: repository, student: student)),
    );
    await tester.pumpAndSettle();

    expect(find.text('New soccer ball'), findsOneWidget);
    expect(find.byKey(const Key('deleteGoalButton-goal-1')), findsNothing);
    expect(find.byIcon(Icons.delete_outline), findsNothing);
  });

  testWidgets('offers a spend-detour preview for an unfinished goal', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _teacherUid);
    final student = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_teacherUid],
    );
    await repository.createGoal(
      studentId: student.id,
      name: 'New soccer ball',
      targetCents: 2000,
      createdByUid: _teacherUid,
    );

    await tester.pumpWidget(
      MaterialApp(home: GoalsScreen(classroomRepository: repository, student: student)),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('spendDetourAmountField')), findsOneWidget);
    await tester.enterText(find.byKey(const Key('spendDetourAmountField')), '5');
    await tester.pumpAndSettle();

    expect(find.textContaining("You'd still need \$20.00 more"), findsOneWidget);
  });
}
