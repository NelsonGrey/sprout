import 'package:csv/csv.dart';

import 'package:sprout/core/models/student_import_row.dart';

enum ImportRowStatus { newStudent, update, error }

/// One row of the CSV preview table — a superset of [StudentImportRow]
/// that also carries display/status info before commit. Mirrors web's
/// StudentImportPage preview-row shape.
class ImportPreviewRow {
  const ImportPreviewRow({
    required this.firstName,
    required this.lastName,
    required this.rawStudentId,
    required this.status,
    this.studentId,
    this.gradeLevel,
    this.existingId,
    this.error,
  });

  final String firstName;
  final String lastName;
  final String? studentId;
  final String? gradeLevel;
  final String? existingId;
  final String rawStudentId;
  final ImportRowStatus status;
  final String? error;

  StudentImportRow toImportRow() => StudentImportRow(
        firstName: firstName,
        lastName: lastName,
        studentId: studentId,
        gradeLevel: gradeLevel,
        existingId: existingId,
      );
}

/// Parses raw CSV text into header-keyed string maps — a Dart mirror of
/// papaparse's `header: true, skipEmptyLines: true` mode. Every cell stays
/// a string (shouldParseNumbers: false) so a numeric-looking studentId
/// like "007" never gets silently coerced to 7, which would break the
/// exact-string matching in [buildImportPreview].
List<Map<String, String>> parseCsvRows(String csvContent) {
  // CsvToListConverter doesn't split rows on a bare '\n' unless told to —
  // its row-ending auto-detection otherwise expects '\r\n'. Normalizing
  // first means files from any platform (Mac/Windows/exported-from-Sheets)
  // parse the same way.
  final normalized = csvContent.replaceAll('\r\n', '\n');
  final table = const CsvToListConverter(shouldParseNumbers: false, eol: '\n').convert(normalized);
  if (table.isEmpty) return const [];
  final header = table.first.map((h) => h.toString()).toList();
  final rows = <Map<String, String>>[];
  for (final rawRow in table.skip(1)) {
    if (rawRow.every((cell) => cell.toString().trim().isEmpty)) continue; // skipEmptyLines
    final row = <String, String>{};
    for (var i = 0; i < header.length && i < rawRow.length; i++) {
      row[header[i]] = rawRow[i].toString();
    }
    rows.add(row);
  }
  return rows;
}

/// Classifies each raw row as new/update/error — exact mirror of web's
/// `buildPreview` (packages/web/src/features/students/StudentImportPage.tsx):
/// error iff first or last name is blank after trimming (message always
/// exactly 'Missing first or last name'); else matched by exact trimmed
/// studentId equality against [existingByStudentId] (school-wide, built by
/// the caller from ALL of studentsInSchool, not just the destination
/// classroom) -> 'update'; else -> 'new'. A blank studentId never matches,
/// even on repeat import of the same file.
List<ImportPreviewRow> buildImportPreview(
  List<Map<String, String>> rawRows,
  Map<String, String> existingByStudentId,
) {
  return rawRows.map((raw) {
    final firstName = (raw['firstName'] ?? '').trim();
    final lastName = (raw['lastName'] ?? '').trim();
    final studentId = (raw['studentId'] ?? '').trim();
    final gradeLevel = (raw['gradeLevel'] ?? '').trim();

    if (firstName.isEmpty || lastName.isEmpty) {
      return ImportPreviewRow(
        firstName: firstName,
        lastName: lastName,
        studentId: studentId.isEmpty ? null : studentId,
        gradeLevel: gradeLevel.isEmpty ? null : gradeLevel,
        rawStudentId: studentId,
        status: ImportRowStatus.error,
        error: 'Missing first or last name',
      );
    }

    final existingId = studentId.isEmpty ? null : existingByStudentId[studentId];
    return ImportPreviewRow(
      firstName: firstName,
      lastName: lastName,
      studentId: studentId.isEmpty ? null : studentId,
      gradeLevel: gradeLevel.isEmpty ? null : gradeLevel,
      existingId: existingId,
      rawStudentId: studentId,
      status: existingId != null ? ImportRowStatus.update : ImportRowStatus.newStudent,
    );
  }).toList();
}
