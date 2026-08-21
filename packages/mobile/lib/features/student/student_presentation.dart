import 'package:sprout/core/models/student.dart';
import 'package:sprout/features/learn/grade_band.dart';

/// Dart mirror of packages/web/src/features/student/studentPresentation.ts
/// — see that file's doc comment for the full reasoning (fails closed to
/// the standard, fuller presentation on an unresolvable grade level, not
/// the simplified one).
bool isEarlyReaderPresentation(Student student) {
  final band = gradeLevelToBand(student.gradeLevel);
  return band == 'Pre-K–K' || band == 'Grades 1–2';
}
