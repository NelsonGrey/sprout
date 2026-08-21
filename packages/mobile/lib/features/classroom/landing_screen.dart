import 'package:flutter/material.dart';

import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/features/classroom/classrooms_screen.dart';
import 'package:sprout/features/student/early_reader_today_screen.dart';
import 'package:sprout/features/student/student_presentation.dart';
import 'package:sprout/features/student/today_screen.dart';

/// Routed at `/`. Decides between the student-facing Today view and the
/// staff "My Classrooms" landing:
///   - linked student, no staff access at all -> [TodayScreen], or its
///     collapsed [EarlyReaderTodayScreen] presentation for a Pre-K–2
///     account (the common case for an actual student — see
///     BR-1.3.3/1.4.1).
///   - everyone else (unlinked, OR linked but also staff, OR a brand-new
///     self-serve teacher who's never linked to anything) ->
///     [ClassroomsScreen], unchanged from before this feature existed. A
///     dual-role user deliberately defaults to the staff experience, the
///     rarer and more privileged path.
class LandingScreen extends StatelessWidget {
  const LandingScreen({
    super.key,
    required this.authService,
    required this.classroomRepository,
    required this.schoolRepository,
    required this.user,
  });

  final AuthService authService;
  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
  final AppUser user;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Student?>(
      stream: classroomRepository.linkedStudentForUser(user.uid),
      builder: (context, linkedStudentSnapshot) {
        if (!linkedStudentSnapshot.hasData && linkedStudentSnapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final linkedStudent = linkedStudentSnapshot.data;

        return StreamBuilder<List<String>>(
          stream: schoolRepository.schoolIdsForUser(user.uid),
          builder: (context, schoolIdsSnapshot) {
            final schoolIds = schoolIdsSnapshot.data ?? const <String>[];

            return StreamBuilder<List<ClassroomContext>>(
              stream: classroomRepository.myClassrooms(user.uid),
              builder: (context, classroomsSnapshot) {
                final ownClassrooms = classroomsSnapshot.data ?? const <ClassroomContext>[];
                final hasAnyStaffAccess = schoolIds.isNotEmpty || ownClassrooms.isNotEmpty;

                if (linkedStudent != null && !hasAnyStaffAccess) {
                  return isEarlyReaderPresentation(linkedStudent)
                      ? EarlyReaderTodayScreen(
                          classroomRepository: classroomRepository,
                          authService: authService,
                          student: linkedStudent,
                        )
                      : TodayScreen(
                          classroomRepository: classroomRepository,
                          authService: authService,
                          student: linkedStudent,
                        );
                }
                return ClassroomsScreen(
                  authService: authService,
                  classroomRepository: classroomRepository,
                  schoolRepository: schoolRepository,
                  user: user,
                );
              },
            );
          },
        );
      },
    );
  }
}
