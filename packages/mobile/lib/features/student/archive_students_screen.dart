import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

/// End-of-year archive by classroom. Mirrors web's ArchiveStudentsPage:
/// grouping here EXCLUDES already-archived students (the opposite of
/// PromoteStudentsScreen's grouping — both are intentional, both
/// replicated as-is), and a single bulkArchiveStudents call covers every
/// checked classroom's students combined, not one call per classroom.
/// There's no undo here — un-archiving only exists via StudentsScreen's
/// Restore….
class ArchiveStudentsScreen extends StatefulWidget {
  const ArchiveStudentsScreen({
    super.key,
    required this.classroomRepository,
    required this.schoolRepository,
    required this.user,
  });

  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
  final AppUser user;

  @override
  State<ArchiveStudentsScreen> createState() => _ArchiveStudentsScreenState();
}

class _ArchiveStudentsScreenState extends State<ArchiveStudentsScreen> {
  final Map<String, bool> _selected = {}; // contextId -> checked
  bool _archiving = false;
  bool _done = false;
  String? _error;

  Future<void> _archive(List<({ClassroomContext classroom, List<Student> students})> rows) async {
    final ids = rows.where((r) => _selected[r.classroom.id] == true).expand((r) => r.students.map((s) => s.id)).toList();
    if (ids.isEmpty || _archiving) return;
    setState(() {
      _archiving = true;
      _error = null;
    });
    try {
      await widget.classroomRepository.bulkArchiveStudents(ids);
      setState(() {
        _selected.clear();
        _done = true;
      });
    } catch (e) {
      setState(() {
        _error = 'Archiving failed partway through — check Students for current state.';
      });
    } finally {
      if (mounted) setState(() => _archiving = false);
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
            appBar: SproutAppBar(title: 'Archive Students'),
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
                appBar: SproutAppBar(title: 'Archive Students'),
                body: Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('Only school admins can archive students.'),
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
                    final students = studentsSnapshot.data!.where((s) => s.archivedAt == null).toList();
                    final rows =
                        classrooms
                            .map(
                              (c) => (
                                classroom: c,
                                students: students.where((s) => s.contextId == c.id).toList(),
                              ),
                            )
                            .where((r) => r.students.isNotEmpty)
                            .toList()
                          ..sort((a, b) => a.classroom.name.compareTo(b.classroom.name));

                    if (_done) {
                      return Scaffold(
                        appBar: const SproutAppBar(title: 'Archive Students'),
                        body: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text('Archiving complete.'),
                              const SizedBox(height: 4),
                              const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 24),
                                child: Text(
                                  "There's no undo button yet — ask to have it cleared directly if this was a mistake.",
                                  textAlign: TextAlign.center,
                                ),
                              ),
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

                    final canArchive = rows.any((r) => _selected[r.classroom.id] == true);

                    return Scaffold(
                      appBar: const SproutAppBar(title: 'Archive Students'),
                      body: Column(
                        children: [
                          Expanded(
                            child: rows.isEmpty
                                ? const Center(child: Text('No occupied classrooms.'))
                                : ListView.builder(
                                    itemCount: rows.length,
                                    itemBuilder: (context, index) {
                                      final row = rows[index];
                                      return CheckboxListTile(
                                        key: Key('archiveRow-${row.classroom.id}'),
                                        title: Text(row.classroom.name),
                                        subtitle: Text('${row.students.length} student(s)'),
                                        value: _selected[row.classroom.id] ?? false,
                                        onChanged: (v) => setState(() => _selected[row.classroom.id] = v ?? false),
                                      );
                                    },
                                  ),
                          ),
                          if (_error != null)
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Text(_error!, style: const TextStyle(color: Colors.red)),
                            ),
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: ElevatedButton(
                              key: const Key('archiveAllButton'),
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                              onPressed: (!canArchive || _archiving) ? null : () => _archive(rows),
                              child: Text(_archiving ? 'Archiving…' : 'Archive All'),
                            ),
                          ),
                        ],
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
