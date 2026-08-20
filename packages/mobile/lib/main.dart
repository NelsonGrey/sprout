import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/app/adaptive_shell.dart';
import 'package:sprout/core/config/firebase_options.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/auth/firebase_auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/classroom/firestore_classroom_repository.dart';
import 'package:sprout/core/services/connectivity/connectivity_plus_service.dart';
import 'package:sprout/core/services/connectivity/connectivity_service.dart';
import 'package:sprout/core/services/content/lesson_repository.dart';
import 'package:sprout/core/services/school/firestore_school_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/design_system/sprout_theme.dart';
import 'package:sprout/features/auth/delete_account_screen.dart';
import 'package:sprout/features/auth/login_screen.dart';
import 'package:sprout/features/classroom/classroom_detail_screen.dart';
import 'package:sprout/features/classroom/landing_screen.dart';
import 'package:sprout/features/classroom/student_ledger_screen.dart';
import 'package:sprout/features/learn/learn_list_screen.dart';
import 'package:sprout/features/learn/learn_prepare_screen.dart';
import 'package:sprout/features/learn/learn_run_screen.dart';
import 'package:sprout/features/school/school_screen.dart';
import 'package:sprout/features/student/archive_students_screen.dart';
import 'package:sprout/features/student/promote_students_screen.dart';
import 'package:sprout/features/student/student_import_screen.dart';
import 'package:sprout/features/student/students_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(
    SproutApp(
      authService: FirebaseAuthService(),
      classroomRepository: FirestoreClassroomRepository(),
      schoolRepository: FirestoreSchoolRepository(),
      connectivityService: ConnectivityPlusService(),
      lessonRepository: const AssetLessonRepository(),
    ),
  );
}

class SproutApp extends StatelessWidget {
  SproutApp({
    super.key,
    required this.authService,
    required this.classroomRepository,
    required this.schoolRepository,
    required this.connectivityService,
    required this.lessonRepository,
  }) : _router = _buildRouter(
         authService,
         classroomRepository,
         schoolRepository,
         connectivityService,
         lessonRepository,
       );

  final AuthService authService;
  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
  final ConnectivityService connectivityService;
  final LessonRepository lessonRepository;
  final GoRouter _router;

  static GoRouter _buildRouter(
    AuthService authService,
    ClassroomRepository classroomRepository,
    SchoolRepository schoolRepository,
    ConnectivityService connectivityService,
    LessonRepository lessonRepository,
  ) {
    return GoRouter(
      refreshListenable: _AuthStateRefresh(
        authService.authStateChanges(),
        classroomRepository,
        schoolRepository,
      ),
      redirect: (context, state) {
        final signedIn = authService.currentUser != null;
        final onLoginPage = state.matchedLocation == '/login';
        if (!signedIn && !onLoginPage) return '/login';
        if (signedIn && onLoginPage) return '/';
        return null;
      },
      routes: [
        ShellRoute(
          builder: (context, state, child) {
            final user = authService.currentUser;
            if (user == null) return const SizedBox.shrink();
            return AdaptiveShell(
              classroomRepository: classroomRepository,
              schoolRepository: schoolRepository,
              user: user,
              currentPath: state.uri.path,
              child: child,
            );
          },
          routes: [
            GoRoute(
              path: '/',
              builder: (context, state) {
                final user = authService.currentUser;
                if (user == null) return const SizedBox.shrink();
                return LandingScreen(
                  authService: authService,
                  classroomRepository: classroomRepository,
                  schoolRepository: schoolRepository,
                  user: user,
                );
              },
            ),
            GoRoute(
              path: '/learn',
              builder: (context, state) {
                final user = authService.currentUser;
                if (user == null) return const SizedBox.shrink();
                return LearnListScreen(
                  lessonRepository: lessonRepository,
                  classroomRepository: classroomRepository,
                  schoolRepository: schoolRepository,
                  user: user,
                );
              },
            ),
            GoRoute(
              path: '/school',
              builder: (context, state) {
                final user = authService.currentUser;
                if (user == null) return const SizedBox.shrink();
                return SchoolScreen(
                  schoolRepository: schoolRepository,
                  user: user,
                );
              },
            ),
            GoRoute(
              path: '/students',
              builder: (context, state) {
                final user = authService.currentUser;
                if (user == null) return const SizedBox.shrink();
                return StudentsScreen(
                  classroomRepository: classroomRepository,
                  schoolRepository: schoolRepository,
                  user: user,
                );
              },
            ),
          ],
        ),
        GoRoute(
          path: '/classrooms/:contextId',
          builder: (context, state) {
            final user = authService.currentUser;
            if (user == null) return const SizedBox.shrink();
            return ClassroomDetailScreen(
              classroomRepository: classroomRepository,
              schoolRepository: schoolRepository,
              connectivityService: connectivityService,
              user: user,
              contextId: state.pathParameters['contextId']!,
            );
          },
        ),
        GoRoute(
          path: '/classrooms/:contextId/students/:studentId',
          builder: (context, state) {
            final user = authService.currentUser;
            if (user == null) return const SizedBox.shrink();
            return StudentLedgerScreen(
              classroomRepository: classroomRepository,
              schoolRepository: schoolRepository,
              connectivityService: connectivityService,
              user: user,
              contextId: state.pathParameters['contextId']!,
              studentId: state.pathParameters['studentId']!,
            );
          },
        ),
        GoRoute(
          path: '/learn/:lessonSlug/prepare',
          builder: (context, state) {
            return LearnPrepareScreen(
              lessonRepository: lessonRepository,
              lessonSlug: state.pathParameters['lessonSlug']!,
            );
          },
        ),
        GoRoute(
          path: '/learn/:lessonSlug/run',
          builder: (context, state) {
            final user = authService.currentUser;
            if (user == null) return const SizedBox.shrink();
            return LearnRunScreen(
              lessonRepository: lessonRepository,
              classroomRepository: classroomRepository,
              schoolRepository: schoolRepository,
              authService: authService,
              user: user,
              lessonSlug: state.pathParameters['lessonSlug']!,
            );
          },
        ),
        GoRoute(
          path: '/students/promote',
          builder: (context, state) {
            final user = authService.currentUser;
            if (user == null) return const SizedBox.shrink();
            return PromoteStudentsScreen(
              classroomRepository: classroomRepository,
              schoolRepository: schoolRepository,
              user: user,
            );
          },
        ),
        GoRoute(
          path: '/students/archive',
          builder: (context, state) {
            final user = authService.currentUser;
            if (user == null) return const SizedBox.shrink();
            return ArchiveStudentsScreen(
              classroomRepository: classroomRepository,
              schoolRepository: schoolRepository,
              user: user,
            );
          },
        ),
        GoRoute(
          path: '/students/import',
          builder: (context, state) {
            final user = authService.currentUser;
            if (user == null) return const SizedBox.shrink();
            return StudentImportScreen(
              classroomRepository: classroomRepository,
              schoolRepository: schoolRepository,
              user: user,
            );
          },
        ),
        GoRoute(
          path: '/account/delete',
          builder: (context, state) {
            final user = authService.currentUser;
            if (user == null) return const SizedBox.shrink();
            return DeleteAccountScreen(
              authService: authService,
              classroomRepository: classroomRepository,
              schoolRepository: schoolRepository,
              user: user,
            );
          },
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => LoginScreen(authService: authService),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Sprout Streak',
      theme: SproutTheme.light,
      routerConfig: _router,
    );
  }
}

/// Bridges [AuthService.authStateChanges] into a [Listenable] so GoRouter's
/// `redirect` re-evaluates on sign-in/sign-out. Also runs
/// [SchoolRepository.claimPendingInviteIfAny] and
/// [ClassroomRepository.claimPendingStudentLinkIfAny] on every sign-in —
/// both no-ops unless an admin/teacher configured access for this exact
/// email, in which case they activate it (see plan's "Invite-and-Claim
/// Flow" and BR-1.3.3/1.4.1's student-linking flow).
class _AuthStateRefresh extends ChangeNotifier {
  _AuthStateRefresh(
    Stream<AppUser?> stream,
    ClassroomRepository classroomRepository,
    SchoolRepository schoolRepository,
  ) {
    _subscription = stream.listen((user) {
      notifyListeners();
      final email = user?.email;
      if (user != null && email != null) {
        schoolRepository.claimPendingInviteIfAny(
          uid: user.uid,
          email: email,
          displayName: user.displayName,
        );
        classroomRepository.claimPendingStudentLinkIfAny(
          uid: user.uid,
          email: email,
        );
      }
    });
  }

  late final StreamSubscription<AppUser?> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
