import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/content/lesson_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/features/learn/learn_list_screen.dart';

const _teacher = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');
const _studentUser = AppUser(uid: 'student-1-uid', displayName: 'Alex Rivera', email: 'alex@example.com');

/// Tall enough that all eight lesson cards lay out within the initial
/// viewport — Sliver-backed lists (even a non-.builder ListView) only
/// mount elements within paint extent, so the default 600px test surface
/// would hide most cards from `find.text`.
void _setTallViewport(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(400, 2400);
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
}

Widget _wrap({
  required AppUser user,
  required FakeClassroomRepository classroomRepository,
  required FakeSchoolRepository schoolRepository,
}) {
  return MaterialApp.router(
    routerConfig: GoRouter(
      initialLocation: '/learn',
      routes: [
        GoRoute(
          path: '/learn',
          builder: (context, state) => LearnListScreen(
            lessonRepository: const AssetLessonRepository(),
            classroomRepository: classroomRepository,
            schoolRepository: schoolRepository,
            user: user,
          ),
        ),
        GoRoute(
          path: '/learn/:lessonSlug/prepare',
          builder: (context, state) => Text('prepare ${state.pathParameters['lessonSlug']}'),
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
  // rootBundle caches loaded strings forever, but flutter_test's asset
  // channel mock only answers the very first load per file otherwise —
  // every screen here loads assets/content/lessons.json via
  // AssetLessonRepository, so without this, every test after the first
  // hangs waiting on a future that never resolves.
  setUp(() => rootBundle.clear());

  testWidgets('gives an adult "Prepare" links for every lesson', (tester) async {
    _setTallViewport(tester);
    await tester.pumpWidget(
      _wrap(
        user: _teacher,
        classroomRepository: FakeClassroomRepository(),
        schoolRepository: FakeSchoolRepository(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Prepare'), findsNWidgets(8));
    expect(find.text('Start mission'), findsNothing);
  });

  testWidgets('navigates to the prepare screen for a lesson', (tester) async {
    _setTallViewport(tester);
    await tester.pumpWidget(
      _wrap(
        user: _teacher,
        classroomRepository: FakeClassroomRepository(),
        schoolRepository: FakeSchoolRepository(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('prepareLesson-the-waiting-garden')));
    await tester.pumpAndSettle();

    expect(find.text('prepare the-waiting-garden'), findsOneWidget);
  });

  testWidgets('lets a student-only account start a mission only within their own grade band', (tester) async {
    _setTallViewport(tester);
    final classroomRepository = FakeClassroomRepository();
    final schoolRepository = FakeSchoolRepository();
    final classroom = await classroomRepository.createClassroom(name: '4th Grade', ownerUid: _teacher.uid);
    final student = await classroomRepository.addStudent(
      contextId: classroom.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      ownerUids: [_teacher.uid],
      contextName: classroom.name,
      gradeLevel: '3',
    );
    await classroomRepository.linkStudentAccount(
      studentId: student.id,
      email: _studentUser.email!,
      invitedByUid: _teacher.uid,
    );
    await classroomRepository.claimPendingStudentLinkIfAny(uid: _studentUser.uid, email: _studentUser.email!);

    await tester.pumpWidget(
      _wrap(user: _studentUser, classroomRepository: classroomRepository, schoolRepository: schoolRepository),
    );
    await tester.pumpAndSettle();

    // "Build a Goal Trail" and "The Classroom Store Budget" are Grades 3-4.
    expect(find.text('Start mission'), findsNWidgets(2));
    expect(find.text('Ask an adult'), findsNWidgets(6));
  });

  testWidgets('filters lessons by grade band', (tester) async {
    _setTallViewport(tester);
    await tester.pumpWidget(
      _wrap(
        user: _teacher,
        classroomRepository: FakeClassroomRepository(),
        schoolRepository: FakeSchoolRepository(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Prepare'), findsNWidgets(8));

    await tester.tap(find.text('Pre-K–K'));
    await tester.pumpAndSettle();

    expect(find.text('The Waiting Garden'), findsOneWidget);
    expect(find.text('Prepare'), findsOneWidget);
  });
}
