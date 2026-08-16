import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';

/// Post-login landing screen: a teacher's classroom list plus "create a
/// classroom". Uses a persistent inline form rather than a dialog so the
/// create flow stays easy to drive from a widget test (see
/// login_screen_test.dart's onPressed()-not-tap() convention).
class ClassroomsScreen extends StatefulWidget {
  const ClassroomsScreen({
    super.key,
    required this.authService,
    required this.classroomRepository,
    required this.user,
  });

  final AuthService authService;
  final ClassroomRepository classroomRepository;
  final AppUser user;

  @override
  State<ClassroomsScreen> createState() => _ClassroomsScreenState();
}

class _ClassroomsScreenState extends State<ClassroomsScreen> {
  final _nameController = TextEditingController();
  bool _creating = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _createClassroom() async {
    final name = _nameController.text.trim();
    if (name.isEmpty || _creating) return;
    setState(() => _creating = true);
    await widget.classroomRepository.createClassroom(
      name: name,
      ownerUid: widget.user.uid,
      ownerDisplayName: widget.user.displayName,
      ownerEmail: widget.user.email,
    );
    _nameController.clear();
    if (mounted) setState(() => _creating = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Classrooms'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: widget.authService.signOut,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<ClassroomContext>>(
              stream: widget.classroomRepository.myClassrooms(widget.user.uid),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final classrooms = snapshot.data!;
                if (classrooms.isEmpty) {
                  return const Center(child: Text('No classrooms yet — add one below.'));
                }
                return ListView.builder(
                  itemCount: classrooms.length,
                  itemBuilder: (context, index) {
                    final classroom = classrooms[index];
                    return ListTile(
                      title: Text(classroom.name),
                      onTap: () => context.go('/classrooms/${classroom.id}'),
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
                    key: const Key('classroomNameField'),
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Classroom name'),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  key: const Key('createClassroomButton'),
                  onPressed: _creating ? null : _createClassroom,
                  child: const Text('Create'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
