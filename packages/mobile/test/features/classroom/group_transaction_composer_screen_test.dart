import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/connectivity/fake_connectivity_service.dart';
import 'package:sprout/features/classroom/group_transaction_composer_screen.dart';

const _ownerUid = 'teacher-1';

void main() {
  Future<(FakeClassroomRepository, String contextId, List<String> studentIds)>
  seed() async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(
      name: '4th Grade',
      ownerUid: _ownerUid,
    );
    final alex = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: '',
      ownerUids: classroom.ownerUids,
    );
    final sam = await repository.addStudent(
      contextId: classroom.id,
      firstName: 'Sam',
      lastName: '',
      ownerUids: classroom.ownerUids,
    );
    return (repository, classroom.id, [alex.id, sam.id]);
  }

  testWidgets(
    'recording a group earn updates every recipient balance exactly once',
    (tester) async {
      final (repository, contextId, studentIds) = await seed();
      final students = await repository.studentsInClassroom(contextId).first;

      await tester.pumpWidget(
        MaterialApp(
          home: GroupTransactionComposerScreen(
            classroomRepository: repository,
            connectivityService: FakeConnectivityService(),
            contextId: contextId,
            students: students,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('groupAmountField')), '5');
      await tester.enterText(
        find.byKey(const Key('groupReasonField')),
        'Great teamwork',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('recordGroupTransactionButton')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('bulkResultSummary')), findsOneWidget);
      expect(find.text('2 of 2 recorded.'), findsOneWidget);

      for (final id in studentIds) {
        final updated = (await repository.studentsInClassroom(contextId).first)
            .firstWhere((s) => s.id == id);
        expect(updated.balanceCents, 500);
      }
    },
  );

  testWidgets('Spend decreases balances instead of increasing them', (
    tester,
  ) async {
    final (repository, contextId, studentIds) = await seed();
    for (final id in studentIds) {
      await repository.recordTransaction(
        contextId: contextId,
        studentId: id,
        type: TransactionType.earn,
        amountCents: 1000,
        reason: 'Starting balance',
        createdByUid: _ownerUid,
        ownerUids: [_ownerUid],
      );
    }
    final students = await repository.studentsInClassroom(contextId).first;

    await tester.pumpWidget(
      MaterialApp(
        home: GroupTransactionComposerScreen(
          classroomRepository: repository,
          connectivityService: FakeConnectivityService(),
          contextId: contextId,
          students: students,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('groupSpendChip')));
    await tester.enterText(find.byKey(const Key('groupAmountField')), '3');
    await tester.enterText(
      find.byKey(const Key('groupReasonField')),
      'Field trip',
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('recordGroupTransactionButton')));
    await tester.pumpAndSettle();

    for (final id in studentIds) {
      final updated = (await repository.studentsInClassroom(contextId).first)
          .firstWhere((s) => s.id == id);
      expect(updated.balanceCents, 700);
    }
  });

  testWidgets(
    'a partial failure shows per-recipient errors and never claims full success',
    (tester) async {
      final (repository, contextId, studentIds) = await seed();
      // Both selected while active (matching a teacher's real selection
      // order), then one is archived before submission — the composer must
      // re-check current state at submit time, not trust the snapshot it
      // was built with.
      final selectedStudents = await repository
          .studentsInClassroom(contextId)
          .first;
      await repository.bulkArchiveStudents([studentIds[1]]);

      await tester.pumpWidget(
        MaterialApp(
          home: GroupTransactionComposerScreen(
            classroomRepository: repository,
            connectivityService: FakeConnectivityService(),
            contextId: contextId,
            students: selectedStudents,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('groupAmountField')), '5');
      await tester.enterText(
        find.byKey(const Key('groupReasonField')),
        'Great teamwork',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('recordGroupTransactionButton')));
      await tester.pumpAndSettle();

      expect(find.text('1 of 2 recorded, 1 failed.'), findsOneWidget);
      expect(find.textContaining('Student is archived'), findsOneWidget);
    },
  );

  testWidgets(
    'retrying failed-only reuses the same idempotencyKey and narrows recipients',
    (tester) async {
      final (repository, contextId, studentIds) = await seed();
      final selectedStudents = await repository
          .studentsInClassroom(contextId)
          .first;
      await repository.bulkArchiveStudents([studentIds[1]]);

      await tester.pumpWidget(
        MaterialApp(
          home: GroupTransactionComposerScreen(
            classroomRepository: repository,
            connectivityService: FakeConnectivityService(),
            contextId: contextId,
            students: selectedStudents,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('groupAmountField')), '5');
      await tester.enterText(
        find.byKey(const Key('groupReasonField')),
        'Great teamwork',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('recordGroupTransactionButton')));
      await tester.pumpAndSettle();

      expect(find.text('1 of 2 recorded, 1 failed.'), findsOneWidget);
      expect(find.byKey(const Key('retryFailedOnlyButton')), findsOneWidget);

      // Un-archive so a retry can actually succeed this time, then retry —
      // the archived student's transaction must not have been double-
      // counted for the one that already succeeded.
      await repository.restoreStudents(
        [studentIds[1]],
        contextId: contextId,
        ownerUids: [_ownerUid],
      );
      await tester.tap(find.byKey(const Key('retryFailedOnlyButton')));
      await tester.pumpAndSettle();

      expect(find.text('2 of 2 recorded.'), findsOneWidget);
      final updated = await repository.studentsInClassroom(contextId).first;
      for (final s in updated) {
        expect(
          s.balanceCents,
          500,
          reason:
              'each recipient credited exactly once across the initial + retry calls',
        );
      }
    },
  );

  testWidgets('disables submit until amount and reason are both present', (
    tester,
  ) async {
    final (repository, contextId, _) = await seed();
    final students = await repository.studentsInClassroom(contextId).first;

    await tester.pumpWidget(
      MaterialApp(
        home: GroupTransactionComposerScreen(
          classroomRepository: repository,
          connectivityService: FakeConnectivityService(),
          contextId: contextId,
          students: students,
        ),
      ),
    );
    await tester.pumpAndSettle();

    ElevatedButton submitButton() => tester.widget<ElevatedButton>(
      find.byKey(const Key('recordGroupTransactionButton')),
    );
    expect(submitButton().onPressed, isNull);

    await tester.enterText(find.byKey(const Key('groupAmountField')), '5');
    await tester.pumpAndSettle();
    expect(submitButton().onPressed, isNull);

    await tester.enterText(
      find.byKey(const Key('groupReasonField')),
      'Great teamwork',
    );
    await tester.pumpAndSettle();
    expect(submitButton().onPressed, isNotNull);
  });

  testWidgets('Return to classroom pops the screen', (tester) async {
    final (repository, contextId, _) = await seed();
    final students = await repository.studentsInClassroom(contextId).first;

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: ElevatedButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => GroupTransactionComposerScreen(
                    classroomRepository: repository,
                    connectivityService: FakeConnectivityService(),
                    contextId: contextId,
                    students: students,
                  ),
                ),
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byKey(const Key('groupAmountField')), '5');
    await tester.enterText(
      find.byKey(const Key('groupReasonField')),
      'Great teamwork',
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('recordGroupTransactionButton')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('returnToClassroomButton')));
    await tester.pumpAndSettle();

    expect(find.text('open'), findsOneWidget);
  });

  group('offline', () {
    testWidgets(
      'disables the group submit and shows a reconnect notice while offline',
      (tester) async {
        final (repository, contextId, _) = await seed();
        final students = await repository.studentsInClassroom(contextId).first;
        final connectivityService = FakeConnectivityService()..setOnline(false);

        await tester.pumpWidget(
          MaterialApp(
            home: GroupTransactionComposerScreen(
              classroomRepository: repository,
              connectivityService: connectivityService,
              contextId: contextId,
              students: students,
            ),
          ),
        );
        await tester.pumpAndSettle();

        await tester.enterText(find.byKey(const Key('groupAmountField')), '5');
        await tester.enterText(
          find.byKey(const Key('groupReasonField')),
          'Great teamwork',
        );
        await tester.pumpAndSettle();

        expect(
          find.textContaining('Reconnect to record this transaction'),
          findsOneWidget,
        );
        final submit = tester.widget<ElevatedButton>(
          find.byKey(const Key('recordGroupTransactionButton')),
        );
        expect(submit.onPressed, isNull);
      },
    );

    testWidgets('re-enables the group submit once back online', (tester) async {
      final (repository, contextId, _) = await seed();
      final students = await repository.studentsInClassroom(contextId).first;
      final connectivityService = FakeConnectivityService()..setOnline(false);

      await tester.pumpWidget(
        MaterialApp(
          home: GroupTransactionComposerScreen(
            classroomRepository: repository,
            connectivityService: connectivityService,
            contextId: contextId,
            students: students,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('groupAmountField')), '5');
      await tester.enterText(
        find.byKey(const Key('groupReasonField')),
        'Great teamwork',
      );
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<ElevatedButton>(
              find.byKey(const Key('recordGroupTransactionButton')),
            )
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
            .widget<ElevatedButton>(
              find.byKey(const Key('recordGroupTransactionButton')),
            )
            .onPressed,
        isNotNull,
      );
    });
  });
}
