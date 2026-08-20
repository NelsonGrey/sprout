import 'package:flutter/material.dart';

import 'package:sprout/design_system/sprout_theme.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

/// Year-end grade rollover: one destination classroom per occupied source
/// classroom, applied to every student in it. Mirrors web's
/// PromoteStudentsPage, including its one acknowledged inconsistency with
/// ArchiveStudentsScreen: grouping here does NOT exclude already-archived
/// students (an archived student sitting in a classroom's contextId still
/// gets promoted along with everyone else) — replicated as-is for parity,
/// not "fixed."
class PromoteStudentsScreen extends StatefulWidget {
  const PromoteStudentsScreen({
    super.key,
    required this.classroomRepository,
    required this.schoolRepository,
    required this.user,
  });

  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
  final AppUser user;

  @override
  State<PromoteStudentsScreen> createState() => _PromoteStudentsScreenState();
}

class _PromoteStudentsScreenState extends State<PromoteStudentsScreen> {
  final Map<String, String> _mapping =
      {}; // sourceContextId -> destinationContextId
  bool _promoting = false;
  bool _done = false;
  String? _error;

  Future<void> _promote(
    List<({ClassroomContext classroom, List<Student> students})> rows,
    List<ClassroomContext> classrooms,
  ) async {
    final mappedRows = rows
        .where((r) => _mapping[r.classroom.id] != null)
        .toList();
    if (mappedRows.isEmpty || _promoting) return;
    setState(() {
      _promoting = true;
      _error = null;
    });
    try {
      for (final row in mappedRows) {
        final target = classrooms.firstWhere(
          (c) => c.id == _mapping[row.classroom.id],
        );
        await widget.classroomRepository.bulkMoveStudents(
          row.students.map((s) => s.id).toList(),
          contextId: target.id,
          ownerUids: target.ownerUids,
          schoolId: target.schoolId,
          gradeLevel: target.gradeLevel,
          contextName: target.name,
        );
      }
      setState(() {
        _mapping.clear();
        _done = true;
      });
    } catch (e) {
      setState(() {
        _error =
            'Promotion failed partway through — check Students for current state.';
      });
    } finally {
      if (mounted) setState(() => _promoting = false);
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
            appBar: SproutAppBar(title: 'Promote Students'),
            body: Center(child: Text('No school found.')),
          );
        }
        final schoolId = schoolIds.first;
        return StreamBuilder<SchoolMember?>(
          stream: widget.schoolRepository.myMembership(
            schoolId,
            widget.user.uid,
          ),
          builder: (context, membershipSnapshot) {
            final membership = membershipSnapshot.data;
            final isAtLeastAdmin =
                membership != null && membership.role != MemberRole.teacher;
            if (!isAtLeastAdmin) {
              return const Scaffold(
                appBar: SproutAppBar(title: 'Promote Students'),
                body: Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('Only school admins can promote students.'),
                  ),
                ),
              );
            }
            return StreamBuilder<List<ClassroomContext>>(
              stream: widget.classroomRepository.classroomsInSchool(schoolId),
              builder: (context, classroomsSnapshot) {
                final classrooms =
                    classroomsSnapshot.data ?? const <ClassroomContext>[];
                return StreamBuilder<List<Student>>(
                  stream: widget.classroomRepository.studentsInSchool(schoolId),
                  builder: (context, studentsSnapshot) {
                    if (!studentsSnapshot.hasData ||
                        !classroomsSnapshot.hasData) {
                      return const Scaffold(
                        body: Center(child: CircularProgressIndicator()),
                      );
                    }
                    final students = studentsSnapshot.data!;
                    final rows =
                        classrooms
                            .map(
                              (c) => (
                                classroom: c,
                                students: students
                                    .where((s) => s.contextId == c.id)
                                    .toList(),
                              ),
                            )
                            .where((r) => r.students.isNotEmpty)
                            .toList()
                          ..sort(
                            (a, b) =>
                                a.classroom.name.compareTo(b.classroom.name),
                          );

                    if (_done) {
                      return Scaffold(
                        appBar: const SproutAppBar(title: 'Promote Students'),
                        body: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text('Promotion complete.'),
                              const SizedBox(height: 12),
                              TextButton(
                                // pop, not go: this screen was pushed on top
                                // of the (still-live) Students screen, which
                                // will reflect the promotion automatically.
                                onPressed: () => context.pop(),
                                child: const Text('Back to Students'),
                              ),
                            ],
                          ),
                        ),
                      );
                    }

                    final canPromote = rows.any(
                      (r) => _mapping[r.classroom.id] != null,
                    );

                    return Scaffold(
                      appBar: const SproutAppBar(title: 'Promote Students'),
                      body: Column(
                        children: [
                          Expanded(
                            child: rows.isEmpty
                                ? const Center(
                                    child: Text('No occupied classrooms.'),
                                  )
                                : ListView.builder(
                                    itemCount: rows.length,
                                    itemBuilder: (context, index) {
                                      final row = rows[index];
                                      final destinations =
                                          classrooms
                                              .where(
                                                (c) => c.id != row.classroom.id,
                                              )
                                              .toList()
                                            ..sort(
                                              (a, b) =>
                                                  a.name.compareTo(b.name),
                                            );
                                      return ListTile(
                                        key: Key(
                                          'promoteRow-${row.classroom.id}',
                                        ),
                                        title: Text(row.classroom.name),
                                        subtitle: Text(
                                          '${row.students.length} student(s)',
                                        ),
                                        trailing: DropdownButton<String?>(
                                          key: Key(
                                            'promoteTargetDropdown-${row.classroom.id}',
                                          ),
                                          hint: const Text(
                                            '— Leave in place —',
                                          ),
                                          value: _mapping[row.classroom.id],
                                          items: [
                                            const DropdownMenuItem<String?>(
                                              value: null,
                                              child: Text('— Leave in place —'),
                                            ),
                                            ...destinations.map(
                                              (c) => DropdownMenuItem<String?>(
                                                value: c.id,
                                                child: Text(c.name),
                                              ),
                                            ),
                                          ],
                                          onChanged: (v) => setState(() {
                                            if (v == null) {
                                              _mapping.remove(row.classroom.id);
                                            } else {
                                              _mapping[row.classroom.id] = v;
                                            }
                                          }),
                                        ),
                                      );
                                    },
                                  ),
                          ),
                          if (_error != null)
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Text(
                                _error!,
                                style: const TextStyle(
                                  color: SproutColors.danger,
                                ),
                              ),
                            ),
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: ElevatedButton(
                              key: const Key('promoteAllButton'),
                              onPressed: (!canPromote || _promoting)
                                  ? null
                                  : () => _promote(rows, classrooms),
                              child: Text(
                                _promoting ? 'Promoting…' : 'Promote All',
                              ),
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
