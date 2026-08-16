import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';

/// A classroom's roster: student list + "add student". Tapping a student
/// opens their ledger.
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

  Future<void> _addStudent(List<String> ownerUids) async {
    final name = _nameController.text.trim();
    if (name.isEmpty || _adding) return;
    setState(() => _adding = true);
    await widget.classroomRepository.addStudent(
      contextId: widget.contextId,
      displayName: name,
      ownerUids: ownerUids,
    );
    _nameController.clear();
    if (mounted) setState(() => _adding = false);
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<ClassroomContext>>(
      stream: widget.classroomRepository.myClassrooms(widget.user.uid),
      builder: (context, classroomSnapshot) {
        final classroom = _findClassroom(classroomSnapshot.data, widget.contextId);
        final ownerUids = classroom?.ownerUids ?? [widget.user.uid];

        return Scaffold(
          appBar: AppBar(title: Text(classroom?.name ?? 'Classroom')),
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
                      return const Center(child: Text('No students yet — add one below.'));
                    }
                    return ListView.builder(
                      itemCount: students.length,
                      itemBuilder: (context, index) {
                        final student = students[index];
                        return ListTile(
                          title: Text(student.displayName),
                          trailing: Text('\$${(student.balanceCents / 100).toStringAsFixed(2)}'),
                          onTap: () => context
                              .go('/classrooms/${widget.contextId}/students/${student.id}'),
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
                      onPressed: _adding ? null : () => _addStudent(ownerUids),
                      child: const Text('Add'),
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

  ClassroomContext? _findClassroom(List<ClassroomContext>? classrooms, String contextId) {
    if (classrooms == null) return null;
    for (final classroom in classrooms) {
      if (classroom.id == contextId) return classroom;
    }
    return null;
  }
}
