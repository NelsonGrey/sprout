/// Maps a student's free-text `gradeLevel` (school-entered, unenforced) to
/// a lesson band, so `/learn` can offer "Start mission" only when a lesson
/// is actually within a student's own band — never from a self-reported
/// age. Returns null for anything unrecognized; callers must treat that
/// the same as "not in band" (fail closed to "ask an adult").
/// Dart mirror of packages/web/src/features/learn/gradeBand.ts.
String? gradeLevelToBand(String? gradeLevel) {
  if (gradeLevel == null || gradeLevel.trim().isEmpty) return null;
  final normalized = gradeLevel
      .trim()
      .toLowerCase()
      .replaceFirst(RegExp(r'^grade\s*'), '');

  if (['pk', 'pre-k', 'prek', 'k', 'kindergarten'].contains(normalized)) {
    return 'Pre-K–K';
  }
  if (['1', '2'].contains(normalized)) return 'Grades 1–2';
  if (['3', '4'].contains(normalized)) return 'Grades 3–4';
  if (['5', '6'].contains(normalized)) return 'Grades 5–6';
  return null;
}
