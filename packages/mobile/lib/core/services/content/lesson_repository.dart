import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import 'package:sprout/core/models/lesson.dart';

/// Loads starter-lesson content — behind an interface (mirroring
/// ConnectivityService/ClassroomRepository) so screens can be tested
/// against a fixed [FakeLessonRepository] without touching the asset
/// bundle. See packages/mobile/lib/core/models/lesson.dart.
abstract class LessonRepository {
  Future<List<Lesson>> loadLessons();
}

/// Reads the real bundled `assets/content/lessons.json` — generated from
/// packages/shared's canonical source, never hand-edited here (see
/// pubspec.yaml).
class AssetLessonRepository implements LessonRepository {
  const AssetLessonRepository();

  @override
  Future<List<Lesson>> loadLessons() async {
    final jsonString = await rootBundle.loadString(
      'assets/content/lessons.json',
    );
    final decoded = json.decode(jsonString) as List<dynamic>;
    return decoded
        .map((entry) => Lesson.fromJson(entry as Map<String, dynamic>))
        .toList();
  }
}

class FakeLessonRepository implements LessonRepository {
  const FakeLessonRepository(this.lessons);

  final List<Lesson> lessons;

  @override
  Future<List<Lesson>> loadLessons() async => lessons;
}
