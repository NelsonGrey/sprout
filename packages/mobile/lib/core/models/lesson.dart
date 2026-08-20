/// A starter lesson, parsed from the bundled `assets/content/lessons.json`
/// asset — generated from packages/shared's canonical, schema-validated
/// source (see packages/shared/src/content/lessons.ts and
/// packages/shared/scripts/generate-mobile-content.mjs). This class is a
/// plain JSON parser, not a hand-typed duplicate of the lesson bodies
/// themselves — see 05_IMPLEMENTATION_HANDOFF.md's Slice 3 step 1.
class LessonMissionStep {
  const LessonMissionStep({required this.title, required this.instructions});

  factory LessonMissionStep.fromJson(Map<String, dynamic> json) =>
      LessonMissionStep(
        title: json['title'] as String,
        instructions: json['instructions'] as String,
      );

  final String title;
  final String instructions;
}

class Lesson {
  const Lesson({
    required this.slug,
    required this.title,
    required this.band,
    required this.minutes,
    required this.strand,
    required this.buildingBlock,
    required this.summary,
    required this.objective,
    required this.vocabulary,
    required this.materials,
    required this.warmup,
    required this.mission,
    required this.reflect,
    required this.check,
    required this.familyBridge,
    required this.productConnection,
    required this.inclusionNote,
    required this.standardsNote,
  });

  factory Lesson.fromJson(Map<String, dynamic> json) => Lesson(
    slug: json['slug'] as String,
    title: json['title'] as String,
    band: json['band'] as String,
    minutes: json['minutes'] as int,
    strand: json['strand'] as String,
    buildingBlock: json['buildingBlock'] as String,
    summary: json['summary'] as String,
    objective: json['objective'] as String,
    vocabulary: List<String>.from(json['vocabulary'] as List),
    materials: List<String>.from(json['materials'] as List),
    warmup: json['warmup'] as String,
    mission: (json['mission'] as List)
        .map((m) => LessonMissionStep.fromJson(m as Map<String, dynamic>))
        .toList(),
    reflect: List<String>.from(json['reflect'] as List),
    check: json['check'] as String,
    familyBridge: json['familyBridge'] as String,
    productConnection: json['productConnection'] as String,
    inclusionNote: json['inclusionNote'] as String,
    standardsNote: json['standardsNote'] as String,
  );

  final String slug;
  final String title;
  final String band;
  final int minutes;
  final String strand;
  final String buildingBlock;
  final String summary;
  final String objective;
  final List<String> vocabulary;
  final List<String> materials;
  final String warmup;
  final List<LessonMissionStep> mission;
  final List<String> reflect;
  final String check;
  final String familyBridge;
  final String productConnection;
  final String inclusionNote;
  final String standardsNote;
}
