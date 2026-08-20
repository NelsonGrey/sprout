import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/services/content/lesson_repository.dart';
import 'package:sprout/features/learn/learn_prepare_screen.dart';

/// Tall enough that the whole lesson contract (down to the "Start guided
/// lesson" button) lays out within the initial viewport — see
/// learn_list_screen_test.dart's identical helper for why this is needed.
void _setTallViewport(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(400, 2400);
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
}

Widget _wrap(String lessonSlug) {
  return MaterialApp.router(
    routerConfig: GoRouter(
      initialLocation: '/learn/$lessonSlug/prepare',
      routes: [
        GoRoute(
          path: '/learn/:lessonSlug/prepare',
          builder: (context, state) => LearnPrepareScreen(
            lessonRepository: const AssetLessonRepository(),
            lessonSlug: state.pathParameters['lessonSlug']!,
          ),
        ),
        GoRoute(
          path: '/learn/:lessonSlug/run',
          builder: (context, state) => Text('run ${state.pathParameters['lessonSlug']}'),
        ),
      ],
    ),
  );
}

void main() {
  // See learn_list_screen_test.dart's setUp comment: flutter_test's asset
  // channel mock only answers the first load per file otherwise.
  setUp(() => rootBundle.clear());

  testWidgets('shows the full lesson contract for a real lesson', (tester) async {
    _setTallViewport(tester);
    await tester.pumpWidget(_wrap('goal-trail'));
    await tester.pumpAndSettle();

    expect(find.text('Build a Goal Trail'), findsOneWidget);
    expect(find.text('Objective'), findsOneWidget);
    expect(find.text('Materials'), findsOneWidget);
    expect(find.text('Teach without shame'), findsOneWidget);
  });

  testWidgets('shows an error state for an unknown slug', (tester) async {
    _setTallViewport(tester);
    await tester.pumpWidget(_wrap('not-a-real-lesson'));
    await tester.pumpAndSettle();

    expect(find.text("This lesson doesn't exist."), findsOneWidget);
  });

  testWidgets('starting the guided lesson navigates to the run screen', (tester) async {
    _setTallViewport(tester);
    await tester.pumpWidget(_wrap('goal-trail'));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('startGuidedLessonButton')));
    await tester.pumpAndSettle();

    expect(find.text('run goal-trail'), findsOneWidget);
  });
}
