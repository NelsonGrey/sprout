import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/goal.dart';
import 'package:sprout/widgets/goal_progress_card.dart';

final _goal = Goal(
  id: 'goal-1',
  studentId: 'student-1',
  name: 'Bike',
  targetCents: 5000,
  savedCents: 2500,
  createdByUid: 'teacher-1',
  createdAt: DateTime(2026),
);

void main() {
  testWidgets(
    'shows name and saved/target amounts, no achieved badge below target',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: GoalProgressCard(goal: _goal)),
        ),
      );

      expect(find.text('Bike'), findsOneWidget);
      expect(find.text('\$25.00 of \$50.00 saved'), findsOneWidget);
      expect(find.text('Reached!'), findsNothing);
    },
  );

  testWidgets('shows a "Reached!" badge once saved reaches target', (
    tester,
  ) async {
    final achieved = Goal(
      id: _goal.id,
      studentId: _goal.studentId,
      name: _goal.name,
      targetCents: 5000,
      savedCents: 5000,
      createdByUid: _goal.createdByUid,
      createdAt: _goal.createdAt,
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: GoalProgressCard(goal: achieved)),
      ),
    );

    expect(find.text('Reached!'), findsOneWidget);
  });

  testWidgets(
    'hides delete and interest controls when neither callback is provided (read-only)',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: GoalProgressCard(goal: _goal)),
        ),
      );

      expect(find.byKey(const Key('deleteGoalButton-goal-1')), findsNothing);
      expect(find.byKey(const Key('applyInterestButton-goal-1')), findsNothing);
    },
  );

  testWidgets('calls onDelete when the delete button is tapped', (
    tester,
  ) async {
    var deleted = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: GoalProgressCard(goal: _goal, onDelete: () => deleted = true),
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('deleteGoalButton-goal-1')));
    await tester.pump();

    expect(deleted, isTrue);
  });

  testWidgets('calls onApplyInterest with the entered rate', (tester) async {
    double? appliedRate;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: GoalProgressCard(
            goal: _goal,
            onApplyInterest: (rate) => appliedRate = rate,
          ),
        ),
      ),
    );

    await tester.enterText(
      find.byKey(const Key('interestRateField-goal-1')),
      '10',
    );
    await tester.tap(find.byKey(const Key('applyInterestButton-goal-1')));
    await tester.pump();

    expect(appliedRate, 10.0);
  });

  testWidgets('disables the apply-interest button when nothing is saved yet', (
    tester,
  ) async {
    final empty = Goal(
      id: 'goal-2',
      studentId: 'student-1',
      name: 'Toy',
      targetCents: 1000,
      savedCents: 0,
      createdByUid: 'teacher-1',
      createdAt: DateTime(2026),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: GoalProgressCard(goal: empty, onApplyInterest: (_) {}),
        ),
      ),
    );

    final button = tester.widget<OutlinedButton>(
      find.byKey(const Key('applyInterestButton-goal-2')),
    );
    expect(button.onPressed, isNull);
  });
}
