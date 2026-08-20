import 'package:flutter/material.dart';

import 'package:sprout/design_system/sprout_theme.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/widgets/confirm_delete_dialog.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

enum _SortKey { name, grade, classroom }

/// School-wide roster with multi-select bulk actions — mirrors web's
/// StudentsPage. Admin-gated: a non-admin sees only the gate message, no
/// school-wide query even fires (mirrors web's `isAtLeastAdmin ? schoolId :
/// undefined` short-circuit).
class StudentsScreen extends StatefulWidget {
  const StudentsScreen({
    super.key,
    required this.classroomRepository,
    required this.schoolRepository,
    required this.user,
  });

  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
  final AppUser user;

  @override
  State<StudentsScreen> createState() => _StudentsScreenState();
}

class _StudentsScreenState extends State<StudentsScreen> {
  String _search = '';
  _SortKey _sortKey = _SortKey.name;
  bool _showArchived = false;

  // Never pruned by search/sort/showArchived changes — only cleared once a
  // bulk action completes. Matches web's StudentsPage exactly.
  final Set<String> _selected = {};
  bool _bulkInFlight = false;

  List<Student> _visibleStudents(List<Student> students) {
    final base = _showArchived
        ? students
        : students.where((s) => s.archivedAt == null).toList();
    final term = _search.trim().toLowerCase();
    final filtered = term.isEmpty
        ? base
        : base
              .where(
                (s) =>
                    s.displayName.toLowerCase().contains(term) ||
                    (s.studentId?.toLowerCase().contains(term) ?? false),
              )
              .toList();
    filtered.sort((a, b) {
      switch (_sortKey) {
        case _SortKey.name:
          final byLast = a.lastName.compareTo(b.lastName);
          return byLast != 0 ? byLast : a.firstName.compareTo(b.firstName);
        case _SortKey.grade:
          return (a.gradeLevel ?? '').compareTo(b.gradeLevel ?? '');
        case _SortKey.classroom:
          return (a.contextName ?? '').compareTo(b.contextName ?? '');
      }
    });
    return filtered;
  }

  void _toggleSelected(String id) {
    setState(() {
      if (!_selected.remove(id)) _selected.add(id);
    });
  }

  Future<void> _rename(Student student) async {
    final firstController = TextEditingController(text: student.firstName);
    final lastController = TextEditingController(text: student.lastName);
    final studentIdController = TextEditingController(
      text: student.studentId ?? '',
    );
    final gradeController = TextEditingController(
      text: student.gradeLevel ?? '',
    );
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit student'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              key: const Key('editFirstNameField'),
              controller: firstController,
              decoration: const InputDecoration(labelText: 'First name'),
            ),
            TextField(
              key: const Key('editLastNameField'),
              controller: lastController,
              decoration: const InputDecoration(labelText: 'Last name'),
            ),
            TextField(
              key: const Key('editStudentIdField'),
              controller: studentIdController,
              decoration: const InputDecoration(labelText: 'Student ID'),
            ),
            TextField(
              key: const Key('editGradeLevelField'),
              controller: gradeController,
              decoration: const InputDecoration(labelText: 'Grade'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            key: const Key('saveEditStudentButton'),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (saved != true) return;
    await widget.classroomRepository.updateStudent(
      student.id,
      firstName: firstController.text.trim(),
      lastName: lastController.text.trim(),
      studentId: studentIdController.text.trim().isEmpty
          ? null
          : studentIdController.text.trim(),
      gradeLevel: gradeController.text.trim().isEmpty
          ? null
          : gradeController.text.trim(),
    );
    if (mounted) setState(() {});
  }

  /// Shared dialog for "Move to classroom…" and "Restore…" — a classroom
  /// picker with the confirm button disabled until one is chosen, then runs
  /// [onConfirm] and clears selection.
  Future<void> _pickClassroomAndAct({
    required List<ClassroomContext> classrooms,
    required String title,
    required String confirmLabel,
    required Future<void> Function(ClassroomContext target) onConfirm,
  }) async {
    String? targetId;
    final target = await showDialog<ClassroomContext>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          final chosen = targetId == null
              ? null
              : classrooms.firstWhere((c) => c.id == targetId);
          return AlertDialog(
            title: Text(title),
            content: DropdownButton<String>(
              key: const Key('classroomTargetDropdown'),
              hint: const Text('Choose a classroom…'),
              value: targetId,
              items: classrooms
                  .map(
                    (c) => DropdownMenuItem(value: c.id, child: Text(c.name)),
                  )
                  .toList(),
              onChanged: (v) => setDialogState(() => targetId = v),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                key: const Key('confirmClassroomTargetButton'),
                onPressed: chosen == null
                    ? null
                    : () => Navigator.pop(context, chosen),
                child: Text(confirmLabel),
              ),
            ],
          );
        },
      ),
    );
    if (target == null) return;
    setState(() => _bulkInFlight = true);
    await onConfirm(target);
    if (mounted) setState(() => _bulkInFlight = false);
  }

  Future<void> _bulkMove(List<ClassroomContext> classrooms) =>
      _pickClassroomAndAct(
        classrooms: classrooms,
        title: 'Move ${_selected.length} student(s) to…',
        confirmLabel: 'Move',
        onConfirm: (target) async {
          final ids = [..._selected];
          _selected.clear();
          await widget.classroomRepository.bulkMoveStudents(
            ids,
            contextId: target.id,
            ownerUids: target.ownerUids,
            schoolId: target.schoolId,
            gradeLevel: target.gradeLevel,
            contextName: target.name,
          );
        },
      );

  Future<void> _bulkRestore(List<ClassroomContext> classrooms) =>
      _pickClassroomAndAct(
        classrooms: classrooms,
        title: 'Restore ${_selected.length} student(s) into…',
        confirmLabel: 'Restore',
        onConfirm: (target) async {
          final ids = [..._selected];
          _selected.clear();
          await widget.classroomRepository.restoreStudents(
            ids,
            contextId: target.id,
            ownerUids: target.ownerUids,
            schoolId: target.schoolId,
            gradeLevel: target.gradeLevel,
            contextName: target.name,
          );
        },
      );

  Future<void> _bulkArchive() async {
    setState(() => _bulkInFlight = true);
    final ids = [..._selected];
    _selected.clear();
    await widget.classroomRepository.bulkArchiveStudents(ids);
    if (mounted) setState(() => _bulkInFlight = false);
  }

  Future<void> _bulkDelete() async {
    final confirmed = await showConfirmDeleteDialog(
      context,
      title: 'Delete ${_selected.length} student(s)?',
      message: "This can't be undone.",
    );
    if (!confirmed) return;
    setState(() => _bulkInFlight = true);
    final ids = [..._selected];
    _selected.clear();
    await widget.classroomRepository.bulkDeleteStudents(ids);
    if (mounted) setState(() => _bulkInFlight = false);
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<String>>(
      stream: widget.schoolRepository.schoolIdsForUser(widget.user.uid),
      builder: (context, schoolIdsSnapshot) {
        final schoolIds = schoolIdsSnapshot.data ?? const <String>[];
        if (schoolIds.isEmpty) {
          return const Scaffold(
            appBar: SproutAppBar(title: 'Students'),
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
                appBar: SproutAppBar(title: 'Students'),
                body: Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'Only school admins can manage the full student roster.',
                    ),
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
                    if (!studentsSnapshot.hasData) {
                      return const Scaffold(
                        body: Center(child: CircularProgressIndicator()),
                      );
                    }
                    final visible = _visibleStudents(studentsSnapshot.data!);
                    final selectedStudents = visible
                        .where((s) => _selected.contains(s.id))
                        .toList();
                    final canRestore =
                        selectedStudents.isNotEmpty &&
                        selectedStudents.every((s) => s.archivedAt != null);

                    return Scaffold(
                      appBar: SproutAppBar(
                        title: 'Students',
                        actions: [
                          TextButton(
                            key: const Key('promoteStudentsButton'),
                            onPressed: () => context.push('/students/promote'),
                            child: const Text('Promote'),
                          ),
                          TextButton(
                            key: const Key('archiveStudentsButton'),
                            onPressed: () => context.push('/students/archive'),
                            child: const Text('Archive'),
                          ),
                          TextButton(
                            key: const Key('importCsvButton'),
                            onPressed: () => context.push('/students/import'),
                            child: const Text('Import'),
                          ),
                        ],
                      ),
                      body: Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                            child: Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    key: const Key('studentSearchField'),
                                    decoration: const InputDecoration(
                                      labelText: 'Search',
                                    ),
                                    onChanged: (v) =>
                                        setState(() => _search = v),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                DropdownButton<_SortKey>(
                                  key: const Key('sortKeyDropdown'),
                                  value: _sortKey,
                                  items: const [
                                    DropdownMenuItem(
                                      value: _SortKey.name,
                                      child: Text('Sort: Name'),
                                    ),
                                    DropdownMenuItem(
                                      value: _SortKey.grade,
                                      child: Text('Sort: Grade'),
                                    ),
                                    DropdownMenuItem(
                                      value: _SortKey.classroom,
                                      child: Text('Sort: Classroom'),
                                    ),
                                  ],
                                  onChanged: (v) =>
                                      setState(() => _sortKey = v ?? _sortKey),
                                ),
                                const SizedBox(width: 8),
                                const Text('Show archived'),
                                Switch(
                                  key: const Key('showArchivedSwitch'),
                                  value: _showArchived,
                                  onChanged: (v) =>
                                      setState(() => _showArchived = v),
                                ),
                              ],
                            ),
                          ),
                          if (_selected.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              child: Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  Text('${_selected.length} selected'),
                                  ElevatedButton(
                                    key: const Key('bulkMoveButton'),
                                    onPressed: _bulkInFlight
                                        ? null
                                        : () => _bulkMove(classrooms),
                                    child: const Text('Move to classroom…'),
                                  ),
                                  ElevatedButton(
                                    key: const Key('bulkArchiveButton'),
                                    onPressed: _bulkInFlight
                                        ? null
                                        : _bulkArchive,
                                    child: const Text('Archive'),
                                  ),
                                  ElevatedButton(
                                    key: const Key('bulkRestoreButton'),
                                    onPressed: (_bulkInFlight || !canRestore)
                                        ? null
                                        : () => _bulkRestore(classrooms),
                                    child: const Text('Restore…'),
                                  ),
                                  ElevatedButton(
                                    key: const Key('bulkDeleteButton'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: SproutColors.danger,
                                    ),
                                    onPressed: _bulkInFlight
                                        ? null
                                        : _bulkDelete,
                                    child: const Text('Delete'),
                                  ),
                                ],
                              ),
                            ),
                          Expanded(
                            child: visible.isEmpty
                                ? const Center(
                                    child: Text('No students match.'),
                                  )
                                : ListView.builder(
                                    itemCount: visible.length,
                                    itemBuilder: (context, index) {
                                      final student = visible[index];
                                      final subtitleParts = [
                                        if (student.gradeLevel != null)
                                          'Grade ${student.gradeLevel}',
                                        if (student.contextName != null)
                                          student.contextName!,
                                        if (student.archivedAt != null)
                                          'Archived',
                                      ];
                                      return CheckboxListTile(
                                        key: Key('studentRow-${student.id}'),
                                        controlAffinity:
                                            ListTileControlAffinity.leading,
                                        value: _selected.contains(student.id),
                                        onChanged: (_) =>
                                            _toggleSelected(student.id),
                                        title: GestureDetector(
                                          onTap: () => _rename(student),
                                          child: Text(student.displayName),
                                        ),
                                        subtitle: subtitleParts.isEmpty
                                            ? null
                                            : Text(subtitleParts.join(' · ')),
                                      );
                                    },
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
