import 'package:flutter/material.dart';

import 'package:sprout/core/models/lesson.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/content/lesson_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/features/classroom/classrooms_screen.dart';
import 'package:sprout/features/learn/lesson_activity_links.dart';
import 'package:sprout/features/student/my_balance_screen.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

sealed class _RunStep {
  const _RunStep();
}

class _WarmupStep extends _RunStep {
  const _WarmupStep();
}

class _MissionStep extends _RunStep {
  const _MissionStep(this.index);
  final int index;
}

class _ReflectStep extends _RunStep {
  const _ReflectStep();
}

class _CheckStep extends _RunStep {
  const _CheckStep();
}

class _FamilyBridgeStep extends _RunStep {
  const _FamilyBridgeStep();
}

/// `M-LEARN-03` — the guided step runner: Warm-up → Mission 1..N → Reflect
/// → Check → Family bridge, one step at a time. Step state lives in this
/// State object and survives on the Navigator stack for the whole run — an
/// "Open activity" deep link uses `Navigator.push` (not `context.go`), so
/// popping the target screen returns here with the exact step untouched,
/// no query-param restoration needed (unlike the web equivalent, which has
/// no such persistent stack). Reflect and Check are "Discuss aloud"/"Skip"
/// prompts — no free-text input is collected or stored anywhere, since no
/// reflection data contract has been approved yet
/// (05_IMPLEMENTATION_HANDOFF.md's Slice 3 stop condition). Mirrors
/// packages/web/src/features/learn/LearnRunPage.tsx.
class LearnRunScreen extends StatefulWidget {
  const LearnRunScreen({
    super.key,
    required this.lessonRepository,
    required this.classroomRepository,
    required this.schoolRepository,
    required this.authService,
    required this.user,
    required this.lessonSlug,
  });

  final LessonRepository lessonRepository;
  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
  final AuthService authService;
  final AppUser user;
  final String lessonSlug;

  @override
  State<LearnRunScreen> createState() => _LearnRunScreenState();
}

class _LearnRunScreenState extends State<LearnRunScreen> {
  int _currentIndex = 0;

  /// One-shot read (not a live subscription) — role rarely changes mid-run,
  /// and "Open activity" only needs the value at the moment it's tapped.
  Future<bool> _isStudentOnly() async {
    final linkedStudent = await widget.classroomRepository
        .linkedStudentForUser(widget.user.uid)
        .first;
    final schoolIds = await widget.schoolRepository
        .schoolIdsForUser(widget.user.uid)
        .first;
    final ownClassrooms = await widget.classroomRepository
        .myClassrooms(widget.user.uid)
        .first;
    final hasAnyStaffAccess = schoolIds.isNotEmpty || ownClassrooms.isNotEmpty;
    return linkedStudent != null && !hasAnyStaffAccess;
  }

  List<_RunStep> _stepsFor(Lesson lesson) => [
    const _WarmupStep(),
    for (var i = 0; i < lesson.mission.length; i++) _MissionStep(i),
    const _ReflectStep(),
    const _CheckStep(),
    const _FamilyBridgeStep(),
  ];

  String _stepLabel(_RunStep step) => switch (step) {
    _WarmupStep() => 'Warm-up',
    _MissionStep(:final index) => 'Mission ${index + 1}',
    _ReflectStep() => 'Reflect',
    _CheckStep() => 'Check',
    _FamilyBridgeStep() => 'Family bridge',
  };

  Future<void> _openActivity() async {
    final isStudentOnly = await _isStudentOnly();
    if (!mounted) return;

    if (isStudentOnly) {
      final student = await widget.classroomRepository
          .linkedStudentForUser(widget.user.uid)
          .first;
      if (student == null || !mounted) return;
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => MyBalanceScreen(
            classroomRepository: widget.classroomRepository,
            authService: widget.authService,
            student: student,
          ),
        ),
      );
    } else {
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => ClassroomsScreen(
            authService: widget.authService,
            classroomRepository: widget.classroomRepository,
            schoolRepository: widget.schoolRepository,
            user: widget.user,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Lesson>>(
      future: widget.lessonRepository.loadLessons(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final lesson = snapshot.data!.where((l) => l.slug == widget.lessonSlug).firstOrNull;
        if (lesson == null) {
          return const Scaffold(body: Center(child: Text("This lesson doesn't exist.")));
        }

        final steps = _stepsFor(lesson);
        final index = _currentIndex.clamp(0, steps.length - 1);
        final step = steps[index];
        final activityLabel = activityLinkLabel(lesson.slug);

        return Scaffold(
          appBar: SproutAppBar(title: lesson.title),
          body: Column(
            children: [
              SizedBox(
                height: 48,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  children: [
                    for (var i = 0; i < steps.length; i++)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: ChoiceChip(
                          key: Key('step-$i'),
                          label: Text(_stepLabel(steps[i])),
                          selected: i == index,
                          onSelected: (_) => setState(() => _currentIndex = i),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      switch (step) {
                        _WarmupStep() => _StepContent(
                          title: 'Warm-up',
                          body: lesson.warmup,
                        ),
                        _MissionStep(:final index) => _StepContent(
                          title: lesson.mission[index].title,
                          body: lesson.mission[index].instructions,
                        ),
                        _ReflectStep() => _ReflectContent(prompts: lesson.reflect),
                        _CheckStep() => _StepContent(
                          title: 'Quick learning check',
                          body: lesson.check,
                        ),
                        _FamilyBridgeStep() => _StepContent(
                          title: 'Family bridge',
                          body: lesson.familyBridge,
                        ),
                      },
                      if (step is _MissionStep && activityLabel != null) ...[
                        const SizedBox(height: 16),
                        OutlinedButton(
                          key: const Key('openActivityButton'),
                          onPressed: _openActivity,
                          child: Text(activityLabel),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    OutlinedButton(
                      key: const Key('backStepButton'),
                      onPressed: index == 0
                          ? null
                          : () => setState(() => _currentIndex = index - 1),
                      child: const Text('Back'),
                    ),
                    FilledButton(
                      key: const Key('nextStepButton'),
                      onPressed: index == steps.length - 1
                          ? () => Navigator.of(context).pop()
                          : () => setState(() => _currentIndex = index + 1),
                      child: Text(index == steps.length - 1 ? 'Finish' : 'Next'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _StepContent extends StatelessWidget {
  const _StepContent({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        Text(body, style: Theme.of(context).textTheme.bodyLarge),
      ],
    );
  }
}

class _ReflectContent extends StatelessWidget {
  const _ReflectContent({required this.prompts});

  final List<String> prompts;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Reflect', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text(
          'Discuss aloud — nothing typed here is saved.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 12),
        for (final prompt in prompts)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text('→ $prompt'),
          ),
      ],
    );
  }
}
