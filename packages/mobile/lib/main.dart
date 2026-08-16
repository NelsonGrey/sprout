import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/config/firebase_options.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/auth/firebase_auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/classroom/firestore_classroom_repository.dart';
import 'package:sprout/features/auth/login_screen.dart';
import 'package:sprout/features/classroom/classroom_detail_screen.dart';
import 'package:sprout/features/classroom/classrooms_screen.dart';
import 'package:sprout/features/classroom/student_ledger_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(SproutApp(
    authService: FirebaseAuthService(),
    classroomRepository: FirestoreClassroomRepository(),
  ));
}

class SproutApp extends StatelessWidget {
  SproutApp({super.key, required this.authService, required this.classroomRepository})
      : _router = _buildRouter(authService, classroomRepository);

  final AuthService authService;
  final ClassroomRepository classroomRepository;
  final GoRouter _router;

  static GoRouter _buildRouter(
    AuthService authService,
    ClassroomRepository classroomRepository,
  ) {
    return GoRouter(
      refreshListenable: _AuthStateRefresh(authService.authStateChanges()),
      redirect: (context, state) {
        final signedIn = authService.currentUser != null;
        final onLoginPage = state.matchedLocation == '/login';
        if (!signedIn && !onLoginPage) return '/login';
        if (signedIn && onLoginPage) return '/';
        return null;
      },
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) {
            final user = authService.currentUser;
            if (user == null) return const SizedBox.shrink();
            return ClassroomsScreen(
              authService: authService,
              classroomRepository: classroomRepository,
              user: user,
            );
          },
        ),
        GoRoute(
          path: '/classrooms/:contextId',
          builder: (context, state) {
            final user = authService.currentUser;
            if (user == null) return const SizedBox.shrink();
            return ClassroomDetailScreen(
              classroomRepository: classroomRepository,
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
              user: user,
              contextId: state.pathParameters['contextId']!,
              studentId: state.pathParameters['studentId']!,
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
      title: 'Sprout',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.green)),
      routerConfig: _router,
    );
  }
}

/// Bridges [AuthService.authStateChanges] into a [Listenable] so GoRouter's
/// `redirect` re-evaluates on sign-in/sign-out.
class _AuthStateRefresh extends ChangeNotifier {
  _AuthStateRefresh(Stream<AppUser?> stream) {
    _subscription = stream.listen((_) => notifyListeners());
  }

  late final StreamSubscription<AppUser?> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
