import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:sprout/core/config/api_config.dart';
import 'package:sprout/core/models/lesson.dart';
import 'package:sprout/core/services/content/lesson_repository.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

/// `M-LEARN-02` — an adult's preparation view for one lesson before running
/// it, following the lesson contract exactly. Stores nothing: no
/// preparation state is persisted anywhere (05_IMPLEMENTATION_HANDOFF.md's
/// Slice 3 stop condition). "View printable version" opens the public
/// lesson page in the system browser, without any student identifiers —
/// mirrors packages/web/src/features/learn/LearnPreparePage.tsx.
class LearnPrepareScreen extends StatelessWidget {
  const LearnPrepareScreen({
    super.key,
    required this.lessonRepository,
    required this.lessonSlug,
  });

  final LessonRepository lessonRepository;
  final String lessonSlug;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Lesson>>(
      future: lessonRepository.loadLessons(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final lesson = snapshot.data!
            .where((l) => l.slug == lessonSlug)
            .firstOrNull;
        if (lesson == null) {
          return const Scaffold(body: Center(child: Text("This lesson doesn't exist.")));
        }

        return Scaffold(
          appBar: SproutAppBar(
            title: lesson.title,
            actions: [
              IconButton(
                icon: const Icon(Icons.open_in_browser),
                tooltip: 'View printable version',
                onPressed: () => launchUrl(
                  Uri.parse('${ApiConfig.baseUrl}/curriculum/${lesson.slug}'),
                  mode: LaunchMode.externalApplication,
                ),
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Wrap(
                spacing: 8,
                children: [
                  Chip(label: Text(lesson.band)),
                  Chip(label: Text(lesson.strand)),
                  Chip(label: Text('${lesson.minutes} minutes')),
                ],
              ),
              const SizedBox(height: 12),
              Text(lesson.summary, style: Theme.of(context).textTheme.bodyLarge),
              const SizedBox(height: 20),
              Text('Objective', style: Theme.of(context).textTheme.titleMedium),
              Text(lesson.objective),
              const SizedBox(height: 20),
              Text('Materials', style: Theme.of(context).textTheme.titleMedium),
              for (final item in lesson.materials) Text('• $item'),
              const SizedBox(height: 20),
              Text('Warm-up', style: Theme.of(context).textTheme.titleMedium),
              Text(lesson.warmup),
              const SizedBox(height: 20),
              Text('Mission overview', style: Theme.of(context).textTheme.titleMedium),
              for (var i = 0; i < lesson.mission.length; i++)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text('${i + 1}. ${lesson.mission[i].title} — ${lesson.mission[i].instructions}'),
                ),
              const SizedBox(height: 20),
              Card(
                color: Theme.of(context).colorScheme.secondaryContainer,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Teach without shame', style: Theme.of(context).textTheme.titleSmall),
                      const SizedBox(height: 6),
                      Text(lesson.inclusionNote),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  key: const Key('startGuidedLessonButton'),
                  onPressed: () => context.push('/learn/${lesson.slug}/run'),
                  child: const Text('Start guided lesson'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
