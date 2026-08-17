import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/widgets/confirm_delete_dialog.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

/// A classroom's roster: student list + "create a student". Tapping a
/// student opens their ledger.
class ClassroomDetailScreen extends StatefulWidget {
  const ClassroomDetailScreen({
    super.key,
    required this.classroomRepository,
    required this.user,
    required this.contextId,
  });

  final ClassroomRepository classroomRepository;
  final AppUser user;
  final String contextId;

  @override
  State<ClassroomDetailScreen> createState() => _ClassroomDetailScreenState();
}

class _ClassroomDetailScreenState extends State<ClassroomDetailScreen> {
  final _nameController = TextEditingController();
  bool _adding = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _addStudent(List<String> ownerUids, ClassroomContext? classroom) async {
    final name = _nameController.text.trim();
    if (name.isEmpty || _adding) return;
    setState(() => _adding = true);
    await widget.classroomRepository.addStudent(
      contextId: widget.contextId,
      displayName: name,
      ownerUids: ownerUids,
      schoolId: classroom?.schoolId,
      gradeLevel: classroom?.gradeLevel,
    );
    _nameController.clear();
    if (mounted) setState(() => _adding = false);
  }

  Future<void> _renameClassroom(String currentName) async {
    final controller = TextEditingController(text: currentName);
    final newName = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename classroom'),
        content: TextField(key: const Key('renameClassroomField'), controller: controller, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            key: const Key('saveClassroomNameButton'),
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (newName != null && newName.isNotEmpty) {
      await widget.classroomRepository.updateClassroom(widget.contextId, name: newName);
    }
  }

  Future<void> _deleteClassroom() async {
    final confirmed = await showConfirmDeleteDialog(
      context,
      title: 'Delete this classroom?',
      message: "This can't be undone.",
    );
    if (!confirmed) return;
    await widget.classroomRepository.deleteClassroom(widget.contextId);
    if (mounted) context.go('/');
  }

  Future<void> _renameStudent(String studentId, String currentName) async {
    final controller = TextEditingController(text: currentName);
    final newName = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename student'),
        content: TextField(key: const Key('renameStudentField'), controller: controller, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            key: const Key('saveStudentNameButton'),
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (newName != null && newName.isNotEmpty) {
      await widget.classroomRepository.updateStudent(studentId, displayName: newName);
      if (mounted) setState(() {});
    }
  }

  Future<void> _deleteStudent(String studentId) async {
    final confirmed = await showConfirmDeleteDialog(
      context,
      title: 'Delete this student?',
      message: "This can't be undone.",
    );
    if (confirmed) {
      await widget.classroomRepository.deleteStudent(studentId);
      if (mounted) setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<ClassroomContext?>(
      stream: widget.classroomRepository.classroom(widget.contextId),
      builder: (context, classroomSnapshot) {
        final classroom = classroomSnapshot.data;
        final ownerUids = classroom?.ownerUids ?? [widget.user.uid];

        return Scaffold(
          appBar: SproutAppBar(
            title: classroom?.name ?? 'Classroom',
            actions: [
              IconButton(
                key: const Key('renameClassroomButton'),
                icon: const Icon(Icons.edit),
                tooltip: 'Rename classroom',
                onPressed: classroom == null ? null : () => _renameClassroom(classroom.name),
              ),
              IconButton(
                key: const Key('deleteClassroomButton'),
                icon: const Icon(Icons.delete),
                tooltip: 'Delete classroom',
                onPressed: _deleteClassroom,
              ),
            ],
          ),
          body: Column(
            children: [
              Expanded(
                child: StreamBuilder<List<Student>>(
                  stream: widget.classroomRepository.studentsInClassroom(widget.contextId),
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    final students = snapshot.data!;
                    if (students.isEmpty) {
                      return const Center(child: Text('No students yet — create one below.'));
                    }
                    return ListView.builder(
                      itemCount: students.length,
                      itemBuilder: (context, index) {
                        final student = students[index];
                        return ListTile(
                          title: Text(student.displayName),
                          onTap: () => context
                              .go('/classrooms/${widget.contextId}/students/${student.id}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('\$${(student.balanceCents / 100).toStringAsFixed(2)}'),
                              IconButton(
                                key: Key('renameStudentButton-${student.id}'),
                                icon: const Icon(Icons.edit, size: 18),
                                tooltip: 'Rename student',
                                onPressed: () => _renameStudent(student.id, student.displayName),
                              ),
                              IconButton(
                                key: Key('deleteStudentButton-${student.id}'),
                                icon: const Icon(Icons.delete, size: 18),
                                tooltip: 'Delete student',
                                onPressed: () => _deleteStudent(student.id),
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        key: const Key('studentNameField'),
                        controller: _nameController,
                        decoration: const InputDecoration(labelText: 'Student name'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      key: const Key('addStudentButton'),
                      onPressed: _adding ? null : () => _addStudent(ownerUids, classroom),
                      child: const Text('Create'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
