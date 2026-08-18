import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/features/student/student_import_preview.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

const _bulkChunkSize = 400; // matches ClassroomRepository's write-batch chunk size

/// CSV roster import. Mirrors web's StudentImportPage: destination classroom
/// chosen first (file picking is disabled until then), rows matched by
/// exact trimmed studentId against the WHOLE school's roster (not just the
/// destination classroom). Unlike web, commit here is wrapped in a
/// try/catch with a user-visible error — web's equivalent has none (an
/// exception there is an unhandled promise rejection), which is a worse
/// failure mode on mobile (a permanently-disabled button with zero
/// feedback) than a browser console warning. That's the one deliberate
/// deviation from parity in this feature.
class StudentImportScreen extends StatefulWidget {
  const StudentImportScreen({
    super.key,
    required this.classroomRepository,
    required this.schoolRepository,
    required this.user,
  });

  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
  final AppUser user;

  @override
  State<StudentImportScreen> createState() => _StudentImportScreenState();
}

class _StudentImportScreenState extends State<StudentImportScreen> {
  String? _targetContextId;
  List<ImportPreviewRow>? _rows;
  String? _parseError;
  bool _committing = false;
  bool _done = false;
  String? _commitError;

  List<ImportPreviewRow> get _validRows => (_rows ?? const []).where((r) => r.status != ImportRowStatus.error).toList();

  Future<void> _pickFile(List<Student> existingStudents) async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv'],
      withData: true,
    );
    final bytes = result?.files.single.bytes;
    if (bytes == null) return;
    setState(() {
      _parseError = null;
      _rows = null;
    });
    try {
      final content = utf8.decode(bytes);
      final rawRows = parseCsvRows(content);
      final existingByStudentId = <String, String>{
        for (final s in existingStudents)
          if (s.studentId != null) s.studentId!: s.id,
      };
      setState(() => _rows = buildImportPreview(rawRows, existingByStudentId));
    } catch (e) {
      setState(() => _parseError = 'Could not parse file: $e');
    }
  }

  Future<void> _commit(ClassroomContext target) async {
    if (_validRows.isEmpty || _committing || target.schoolId == null) return;
    setState(() {
      _committing = true;
      _commitError = null;
    });
    try {
      await widget.classroomRepository.commitStudentImport(
        _validRows.map((r) => r.toImportRow()).toList(),
        contextId: target.id,
        ownerUids: target.ownerUids,
        schoolId: target.schoolId!,
        gradeLevel: target.gradeLevel,
        contextName: target.name,
      );
      setState(() => _done = true);
    } catch (e) {
      setState(() => _commitError = 'Import failed partway through — check Students for current state.');
    } finally {
      if (mounted) setState(() => _committing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<String>>(
      stream: widget.schoolRepository.schoolIdsForUser(widget.user.uid),
      builder: (context, schoolIdsSnapshot) {
        final schoolIds = schoolIdsSnapshot.data ?? const <String>[];
        if (schoolIds.isEmpty) {
          return const Scaffold(
            appBar: SproutAppBar(title: 'Import CSV'),
            body: Center(child: Text('No school found.')),
          );
        }
        final schoolId = schoolIds.first;
        return StreamBuilder<SchoolMember?>(
          stream: widget.schoolRepository.myMembership(schoolId, widget.user.uid),
          builder: (context, membershipSnapshot) {
            final membership = membershipSnapshot.data;
            final isAtLeastAdmin = membership != null && membership.role != MemberRole.teacher;
            if (!isAtLeastAdmin) {
              return const Scaffold(
                appBar: SproutAppBar(title: 'Import CSV'),
                body: Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('Only school admins can import students.'),
                  ),
                ),
              );
            }
            return StreamBuilder<List<ClassroomContext>>(
              stream: widget.classroomRepository.classroomsInSchool(schoolId),
              builder: (context, classroomsSnapshot) {
                final classrooms = classroomsSnapshot.data ?? const <ClassroomContext>[];
                return StreamBuilder<List<Student>>(
                  stream: widget.classroomRepository.studentsInSchool(schoolId),
                  builder: (context, studentsSnapshot) {
                    if (!studentsSnapshot.hasData || !classroomsSnapshot.hasData) {
                      return const Scaffold(body: Center(child: CircularProgressIndicator()));
                    }
                    final existingStudents = studentsSnapshot.data!;

                    if (_done) {
                      return Scaffold(
                        appBar: const SproutAppBar(title: 'Import CSV'),
                        body: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('Imported ${_validRows.length} student(s).'),
                              const SizedBox(height: 12),
                              TextButton(
                                onPressed: () => context.go('/students'),
                                child: const Text('Back to Students'),
                              ),
                            ],
                          ),
                        ),
                      );
                    }

                    final target = classrooms.where((c) => c.id == _targetContextId).firstOrNull;
                    final hasBlankStudentId = _validRows.any((r) => r.studentId == null);

                    return Scaffold(
                      appBar: const SproutAppBar(title: 'Import CSV'),
                      body: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('1. Destination classroom'),
                            DropdownButton<String>(
                              key: const Key('importTargetDropdown'),
                              hint: const Text('Choose a classroom…'),
                              value: _targetContextId,
                              items: classrooms
                                  .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
                                  .toList(),
                              onChanged: (v) => setState(() => _targetContextId = v),
                            ),
                            const SizedBox(height: 16),
                            const Text('2. CSV file'),
                            ElevatedButton(
                              key: const Key('pickCsvFileButton'),
                              onPressed: _targetContextId == null ? null : () => _pickFile(existingStudents),
                              child: const Text('Choose file…'),
                            ),
                            if (_parseError != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Text(_parseError!, style: const TextStyle(color: Colors.red)),
                              ),
                            if (_rows != null) ...[
                              const SizedBox(height: 16),
                              const Text('3. Preview'),
                              Text(
                                '${_validRows.length} of ${_rows!.length} rows will be imported '
                                '(${_rows!.length - _validRows.length} skipped).'
                                '${_validRows.length > _bulkChunkSize ? ' Imported in batches automatically.' : ''}',
                              ),
                              if (hasBlankStudentId)
                                const Padding(
                                  padding: EdgeInsets.only(top: 4),
                                  child: Text(
                                    'Some rows have no student ID — those will always create a new '
                                    'student, even if you import this same file again.',
                                    style: TextStyle(fontStyle: FontStyle.italic),
                                  ),
                                ),
                              Expanded(
                                child: ListView.builder(
                                  itemCount: _rows!.length,
                                  itemBuilder: (context, index) {
                                    final row = _rows![index];
                                    final statusText = switch (row.status) {
                                      ImportRowStatus.newStudent => 'New',
                                      ImportRowStatus.update => 'Will update',
                                      ImportRowStatus.error => 'Error: ${row.error}',
                                    };
                                    return ListTile(
                                      key: Key('importPreviewRow-$index'),
                                      dense: true,
                                      title: Text('${row.firstName} ${row.lastName}'.trim()),
                                      subtitle: Text('ID: ${row.rawStudentId}  Grade: ${row.gradeLevel ?? ''}'),
                                      trailing: Text(
                                        statusText,
                                        style: TextStyle(
                                          color: row.status == ImportRowStatus.error ? Colors.red : null,
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                              if (_commitError != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(_commitError!, style: const TextStyle(color: Colors.red)),
                                ),
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: ElevatedButton(
                                  key: const Key('commitImportButton'),
                                  onPressed: (target == null || _validRows.isEmpty || _committing)
                                      ? null
                                      : () => _commit(target),
                                  child: Text(_committing ? 'Importing…' : 'Import ${_validRows.length} students'),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            );
          },
        );
      },
    );
  }
}
