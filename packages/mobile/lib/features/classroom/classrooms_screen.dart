import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/widgets/account_menu_button.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

/// Post-login landing screen: a teacher's classroom list plus "create a
/// classroom". Uses a persistent inline form rather than a dialog so the
/// create flow stays easy to drive from a widget test (see
/// login_screen_test.dart's onPressed()-not-tap() convention).
///
/// The list itself is the classrooms this user owns directly, merged with
/// any classrooms visible via a school-wide or grade-level scope grant
/// (BR-1.3.11/1.3.12) — see [_ClassroomList].
class ClassroomsScreen extends StatefulWidget {
  const ClassroomsScreen({
    super.key,
    required this.authService,
    required this.classroomRepository,
    required this.schoolRepository,
    required this.user,
  });

  final AuthService authService;
  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
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
      appBar: SproutAppBar(
        title: 'My Classrooms',
        actions: [
          IconButton(
            icon: const Icon(Icons.school),
            tooltip: 'School',
            onPressed: () => context.go('/school'),
          ),
          AccountMenuButton(authService: widget.authService),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _ClassroomList(
              classroomRepository: widget.classroomRepository,
              schoolRepository: widget.schoolRepository,
              user: widget.user,
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

/// Merges [ClassroomRepository.myClassrooms] with
/// [ClassroomRepository.classroomsInSchool] when this user's school
/// membership scope is broader than "own" — nested StreamBuilders rather
/// than a stream-combining dependency, since this is the only place in the
/// app that needs it. Most users belong to no school at all, in which case
/// this is just the plain owned-classrooms list, unchanged from before.
class _ClassroomList extends StatelessWidget {
  const _ClassroomList({
    required this.classroomRepository,
    required this.schoolRepository,
    required this.user,
  });

  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
  final AppUser user;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<String>>(
      stream: schoolRepository.schoolIdsForUser(user.uid),
      builder: (context, schoolIdsSnapshot) {
        final schoolIds = schoolIdsSnapshot.data ?? const <String>[];
        if (schoolIds.isEmpty) {
          return _OwnClassroomsOnly(classroomRepository: classroomRepository, user: user);
        }
        // Multi-school membership/switching is future work — use the first
        // one for now (see plan's "Explicitly Deferred").
        final schoolId = schoolIds.first;
        return StreamBuilder<SchoolMember?>(
          stream: schoolRepository.myMembership(schoolId, user.uid),
          builder: (context, memberSnapshot) {
            final role = memberSnapshot.data?.role;
            final isAtLeastAdmin = role == MemberRole.admin || role == MemberRole.superAdmin;
            final scope = memberSnapshot.data?.scope;
            // Admins/super_admins always have full-school visibility (no
            // `scope` field exists on their member doc — that's
            // teacher-only data), mirroring firestore.rules'
            // hasScopedAccess isAtLeastAdmin shortcut.
            if (!isAtLeastAdmin && (scope == null || scope.type == MemberScopeType.own)) {
              return _OwnClassroomsOnly(classroomRepository: classroomRepository, user: user);
            }
            return StreamBuilder<List<ClassroomContext>>(
              stream: classroomRepository.myClassrooms(user.uid),
              builder: (context, ownSnapshot) {
                return StreamBuilder<List<ClassroomContext>>(
                  stream: classroomRepository.classroomsInSchool(
                    schoolId,
                    gradeLevels: !isAtLeastAdmin && scope?.type == MemberScopeType.grades ? scope!.grades : null,
                  ),
                  builder: (context, scopedSnapshot) {
                    if (!ownSnapshot.hasData || !scopedSnapshot.hasData) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    final merged = <String, ClassroomContext>{};
                    for (final c in ownSnapshot.data!) {
                      merged[c.id] = c;
                    }
                    for (final c in scopedSnapshot.data!) {
                      merged[c.id] = c;
                    }
                    return _ClassroomListView(classrooms: merged.values.toList());
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

class _OwnClassroomsOnly extends StatelessWidget {
  const _OwnClassroomsOnly({required this.classroomRepository, required this.user});

  final ClassroomRepository classroomRepository;
  final AppUser user;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<ClassroomContext>>(
      stream: classroomRepository.myClassrooms(user.uid),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        return _ClassroomListView(classrooms: snapshot.data!);
      },
    );
  }
}

class _ClassroomListView extends StatelessWidget {
  const _ClassroomListView({required this.classrooms});

  final List<ClassroomContext> classrooms;

  @override
  Widget build(BuildContext context) {
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
  }
}
