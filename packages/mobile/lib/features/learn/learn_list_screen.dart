import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/lesson.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/content/lesson_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/features/learn/grade_band.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

const _gradeBandFilters = [
  'All',
  'Pre-K–K',
  'Grades 1–2',
  'Grades 3–4',
  'Grades 5–6',
];

final Map<String, Color> _strandColors = {
  'Plan': Colors.teal,
  'Earn': Colors.blue,
  'Spend': Colors.deepOrange,
  'Save': Colors.amber.shade800,
  'Protect': Colors.purple,
};

/// `M-LEARN-01` — the authenticated learning library, gated behind the
/// `authenticatedLearning` flag (see app/feature_flags.dart). Content and
/// filters match web; the call to action per card depends on who's
/// looking, mirroring packages/web/src/features/learn/LearnListPage.tsx.
class LearnListScreen extends StatefulWidget {
  const LearnListScreen({
    super.key,
    required this.lessonRepository,
    required this.classroomRepository,
    required this.schoolRepository,
    required this.user,
  });

  final LessonRepository lessonRepository;
  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
  final AppUser user;

  @override
  State<LearnListScreen> createState() => _LearnListScreenState();
}

class _LearnListScreenState extends State<LearnListScreen> {
  String _band = 'All';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const SproutAppBar(title: 'Learning library'),
      body: FutureBuilder<List<Lesson>>(
        future: widget.lessonRepository.loadLessons(),
        builder: (context, lessonsSnapshot) {
          if (!lessonsSnapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final lessons = lessonsSnapshot.data!;

          return StreamBuilder<Student?>(
            stream: widget.classroomRepository.linkedStudentForUser(
              widget.user.uid,
            ),
            builder: (context, linkedStudentSnapshot) {
              final linkedStudent = linkedStudentSnapshot.data;

              return StreamBuilder<List<String>>(
                stream: widget.schoolRepository.schoolIdsForUser(
                  widget.user.uid,
                ),
                builder: (context, schoolIdsSnapshot) {
                  final schoolIds = schoolIdsSnapshot.data ?? const [];

                  return StreamBuilder<List<ClassroomContext>>(
                    stream: widget.classroomRepository.myClassrooms(
                      widget.user.uid,
                    ),
                    builder: (context, classroomsSnapshot) {
                      final ownClassrooms = classroomsSnapshot.data ?? const [];
                      final hasAnyStaffAccess =
                          schoolIds.isNotEmpty || ownClassrooms.isNotEmpty;
                      final isStudentOnly =
                          linkedStudent != null && !hasAnyStaffAccess;
                      final studentBand = isStudentOnly
                          ? gradeLevelToBand(linkedStudent.gradeLevel)
                          : null;

                      final visibleLessons = _band == 'All'
                          ? lessons
                          : lessons.where((l) => l.band == _band).toList();

                      return Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(12),
                            child: Wrap(
                              spacing: 8,
                              children: [
                                for (final band in _gradeBandFilters)
                                  ChoiceChip(
                                    key: Key('bandFilter-$band'),
                                    label: Text(band),
                                    selected: _band == band,
                                    onSelected: (_) =>
                                        setState(() => _band = band),
                                  ),
                              ],
                            ),
                          ),
                          Expanded(
                            // A plain ListView, not .builder: the library
                            // is a fixed eight lessons, never large enough
                            // to need lazy building.
                            child: ListView(
                              children: [
                                for (final lesson in visibleLessons)
                                  Card(
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 6,
                                    ),
                                    child: ListTile(
                                      leading: CircleAvatar(
                                        backgroundColor:
                                            _strandColors[lesson.strand] ??
                                            Colors.grey,
                                        child: Text(
                                          lesson.strand.substring(0, 1),
                                          style: const TextStyle(
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                      title: Text(lesson.title),
                                      subtitle: Text(
                                        '${lesson.band} · ${lesson.minutes} minutes',
                                      ),
                                      trailing:
                                          isStudentOnly
                                              ? (studentBand != null &&
                                                      studentBand ==
                                                          lesson.band
                                                  ? TextButton(
                                                      key: Key(
                                                        'startMission-${lesson.slug}',
                                                      ),
                                                      onPressed: () =>
                                                          context.push(
                                                            '/learn/${lesson.slug}/run',
                                                          ),
                                                      child: const Text(
                                                        'Start mission',
                                                      ),
                                                    )
                                                  : const Text(
                                                      'Ask an adult',
                                                      style: TextStyle(
                                                        fontSize: 12,
                                                      ),
                                                    ))
                                              : TextButton(
                                                  key: Key(
                                                    'prepareLesson-${lesson.slug}',
                                                  ),
                                                  onPressed: () =>
                                                      context.push(
                                                        '/learn/${lesson.slug}/prepare',
                                                      ),
                                                  child: const Text(
                                                    'Prepare',
                                                  ),
                                                ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
