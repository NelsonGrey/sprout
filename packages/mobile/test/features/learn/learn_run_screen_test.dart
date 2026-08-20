import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/auth/fake_auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/content/lesson_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/features/learn/learn_run_screen.dart';

const _teacher = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');

Widget _screen({
  required String lessonSlug,
  FakeClassroomRepository? classroomRepository,
  FakeSchoolRepository? schoolRepository,
}) {
  return LearnRunScreen(
    lessonRepository: const AssetLessonRepository(),
    classroomRepository: classroomRepository ?? FakeClassroomRepository(),
    schoolRepository: schoolRepository ?? FakeSchoolRepository(),
    authService: FakeAuthService(),
    user: _teacher,
    lessonSlug: lessonSlug,
  );
}

Widget _wrap({
  required String lessonSlug,
  FakeClassroomRepository? classroomRepository,
  FakeSchoolRepository? schoolRepository,
}) {
  return MaterialApp(
    home: _screen(
      lessonSlug: lessonSlug,
      classroomRepository: classroomRepository,
      schoolRepository: schoolRepository,
    ),
  );
}

void main() {
  // See learn_list_screen_test.dart's setUp comment: flutter_test's asset
  // channel mock only answers the first load per file otherwise.
  setUp(() => rootBundle.clear());

  testWidgets('starts on the warm-up step by default', (tester) async {
    await tester.pumpWidget(_wrap(lessonSlug: 'goal-trail'));
    await tester.pumpAndSettle();

    expect(find.text('Warm-up'), findsWidgets);
  });

  testWidgets('Next advances through mission steps in order', (tester) async {
    await tester.pumpWidget(_wrap(lessonSlug: 'goal-trail'));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('nextStepButton')));
    await tester.pumpAndSettle();

    expect(find.text('Choose the finish'), findsOneWidget);
  });

  testWidgets('Back is disabled on the first step', (tester) async {
    await tester.pumpWidget(_wrap(lessonSlug: 'goal-trail'));
    await tester.pumpAndSettle();

    final backButton = tester.widget<OutlinedButton>(find.byKey(const Key('backStepButton')));
    expect(backButton.onPressed, isNull);
  });

  testWidgets('offers an "Open activity" button on a mission step for a lesson with a real product connection', (
    tester,
  ) async {
    await tester.pumpWidget(_wrap(lessonSlug: 'goal-trail'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('nextStepButton')));
    await tester.pumpAndSettle();

    expect(find.text('Try creating or checking a savings goal'), findsOneWidget);
  });

  testWidgets('never shows "Open activity" for a lesson whose product connection is not yet built', (tester) async {
    await tester.pumpWidget(_wrap(lessonSlug: 'interest-joins-the-team'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('nextStepButton')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('openActivityButton')), findsNothing);
  });

  testWidgets('tapping "Open activity" pushes the target screen; popping it returns to the same step', (
    tester,
  ) async {
    await tester.pumpWidget(_wrap(lessonSlug: 'goal-trail'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('nextStepButton')));
    await tester.pumpAndSettle();
    expect(find.text('Choose the finish'), findsOneWidget);

    await tester.tap(find.byKey(const Key('openActivityButton')));
    await tester.pumpAndSettle();
    expect(find.text('Choose the finish'), findsNothing);
    expect(find.text('My Classrooms'), findsWidgets);

    await tester.pageBack();
    await tester.pumpAndSettle();

    expect(find.text('Choose the finish'), findsOneWidget);
  });

  testWidgets('the last step\'s button says Finish and pops the screen', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: ElevatedButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => _screen(lessonSlug: 'the-waiting-garden')),
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    // the-waiting-garden: warm-up + 3 mission steps + reflect + check + family bridge = 7 steps.
    for (var i = 0; i < 6; i++) {
      await tester.tap(find.byKey(const Key('nextStepButton')));
      await tester.pumpAndSettle();
    }
    expect(find.text('Finish'), findsOneWidget);

    await tester.tap(find.byKey(const Key('nextStepButton')));
    await tester.pumpAndSettle();

    expect(find.text('open'), findsOneWidget);
  });
}
