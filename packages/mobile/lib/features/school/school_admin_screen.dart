import 'package:flutter/material.dart';

import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

const _gradeOptions = [
  'PK',
  'K',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
];

String _scopeSummary(MemberScope? scope) {
  if (scope == null || scope.type == MemberScopeType.own) {
    return 'Own classrooms only';
  }
  if (scope.type == MemberScopeType.school) return 'Whole school';
  return 'Grades: ${scope.grades.isEmpty ? '(none selected)' : scope.grades.join(', ')}';
}

String _roleLabel(MemberRole role) {
  switch (role) {
    case MemberRole.superAdmin:
      return 'Super Admin';
    case MemberRole.admin:
      return 'Admin';
    case MemberRole.teacher:
      return 'Teacher';
  }
}

/// Mirrors web's ScopePicker: own/grades/school radios, grade chips when
/// "Specific grades" is selected.
class _ScopePicker extends StatelessWidget {
  const _ScopePicker({required this.value, required this.onChanged});

  final MemberScope value;
  final ValueChanged<MemberScope> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        RadioListTile<MemberScopeType>(
          contentPadding: EdgeInsets.zero,
          title: const Text('Own classrooms only'),
          value: MemberScopeType.own,
          groupValue: value.type,
          onChanged: (_) => onChanged(const MemberScope.own()),
        ),
        RadioListTile<MemberScopeType>(
          contentPadding: EdgeInsets.zero,
          title: const Text('Specific grades'),
          value: MemberScopeType.grades,
          groupValue: value.type,
          onChanged: (_) => onChanged(const MemberScope.grades([])),
        ),
        if (value.type == MemberScopeType.grades)
          Padding(
            padding: const EdgeInsets.only(left: 16, bottom: 8),
            child: Wrap(
              spacing: 6,
              children: _gradeOptions.map((grade) {
                final checked = value.grades.contains(grade);
                return FilterChip(
                  label: Text(grade),
                  selected: checked,
                  onSelected: (_) => onChanged(
                    MemberScope.grades(
                      checked
                          ? value.grades.where((g) => g != grade).toList()
                          : [...value.grades, grade],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        RadioListTile<MemberScopeType>(
          contentPadding: EdgeInsets.zero,
          title: const Text('Whole school (PE, art, music, etc.)'),
          value: MemberScopeType.school,
          groupValue: value.type,
          onChanged: (_) => onChanged(const MemberScope.school()),
        ),
      ],
    );
  }
}

/// Mirrors web's SchoolAdminPage. Admins/super admins get the full staff
/// roster + invite/remove/scope-edit tooling; a plain teacher just sees
/// their own role and scope. Delegation is hierarchical (BR-1.3.11/1.3.12):
/// only a super_admin can invite/remove another super_admin or an admin —
/// a regular admin manages teachers only. The school is never left without
/// at least one super_admin (enforced in firestore.rules, not just this
/// screen's disabled-button state).
class SchoolAdminScreen extends StatefulWidget {
  const SchoolAdminScreen({
    super.key,
    required this.schoolRepository,
    required this.user,
    required this.schoolId,
  });

  final SchoolRepository schoolRepository;
  final AppUser user;
  final String schoolId;

  @override
  State<SchoolAdminScreen> createState() => _SchoolAdminScreenState();
}

class _SchoolAdminScreenState extends State<SchoolAdminScreen> {
  String? _schoolName;

  final _inviteEmailController = TextEditingController();
  MemberScope _inviteScope = const MemberScope.own();
  bool _inviting = false;

  final _adminEmailController = TextEditingController();
  MemberRole _adminRole = MemberRole.admin;
  bool _invitingAdmin = false;

  String? _editingScopeUid;
  MemberScope _scopeDraft = const MemberScope.own();

  @override
  void initState() {
    super.initState();
    widget.schoolRepository.getSchool(widget.schoolId).then((school) {
      if (mounted) setState(() => _schoolName = school?.name);
    });
  }

  @override
  void dispose() {
    _inviteEmailController.dispose();
    _adminEmailController.dispose();
    super.dispose();
  }

  Future<void> _renameSchool() async {
    final controller = TextEditingController(text: _schoolName ?? '');
    final newName = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename school'),
        content: TextField(
          key: const Key('renameSchoolField'),
          controller: controller,
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            key: const Key('saveSchoolNameButton'),
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (newName != null && newName.isNotEmpty) {
      await widget.schoolRepository.updateSchool(
        widget.schoolId,
        name: newName,
      );
      if (mounted) setState(() => _schoolName = newName);
    }
  }

  Future<void> _inviteTeacher() async {
    final email = _inviteEmailController.text.trim();
    if (email.isEmpty || _inviting) return;
    setState(() => _inviting = true);
    await widget.schoolRepository.inviteMember(
      schoolId: widget.schoolId,
      email: email,
      role: MemberRole.teacher,
      scope: _inviteScope,
      invitedByUid: widget.user.uid,
    );
    _inviteEmailController.clear();
    if (mounted) {
      setState(() {
        _inviting = false;
        _inviteScope = const MemberScope.own();
      });
    }
  }

  Future<void> _inviteAdmin() async {
    final email = _adminEmailController.text.trim();
    if (email.isEmpty || _invitingAdmin) return;
    setState(() => _invitingAdmin = true);
    await widget.schoolRepository.inviteMember(
      schoolId: widget.schoolId,
      email: email,
      role: _adminRole,
      invitedByUid: widget.user.uid,
    );
    _adminEmailController.clear();
    if (mounted) setState(() => _invitingAdmin = false);
  }

  Future<void> _saveScope(String uid) async {
    await widget.schoolRepository.updateMemberScope(
      widget.schoolId,
      uid,
      _scopeDraft,
    );
    if (mounted) setState(() => _editingScopeUid = null);
  }

  bool _canRemove(SchoolMember member, SchoolMember self, int superAdminCount) {
    if (member.uid == self.uid) return false;
    final isAtLeastAdmin =
        self.role == MemberRole.admin || self.role == MemberRole.superAdmin;
    final isSuperAdmin = self.role == MemberRole.superAdmin;
    switch (member.role) {
      case MemberRole.teacher:
        return isAtLeastAdmin;
      case MemberRole.admin:
        return isSuperAdmin;
      case MemberRole.superAdmin:
        return isSuperAdmin && superAdminCount > 1;
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<SchoolMember?>(
      stream: widget.schoolRepository.myMembership(
        widget.schoolId,
        widget.user.uid,
      ),
      builder: (context, membershipSnapshot) {
        final membership = membershipSnapshot.data;
        final isAtLeastAdmin =
            membership?.role == MemberRole.admin ||
            membership?.role == MemberRole.superAdmin;
        final isSuperAdmin = membership?.role == MemberRole.superAdmin;

        return Scaffold(
          appBar: SproutAppBar(
            title: _schoolName ?? 'School',
            actions: [
              if (isSuperAdmin)
                IconButton(
                  key: const Key('renameSchoolButton'),
                  icon: const Icon(Icons.edit),
                  tooltip: 'Rename school',
                  onPressed: _renameSchool,
                ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Your access',
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          membership == null
                              ? ''
                              : '${_roleLabel(membership.role)}'
                                    '${membership.role == MemberRole.teacher ? ' — ${_scopeSummary(membership.scope)}' : ''}',
                        ),
                      ],
                    ),
                  ),
                ),
                if (isAtLeastAdmin) ...[
                  const SizedBox(height: 24),
                  Text('Staff', style: Theme.of(context).textTheme.labelLarge),
                  StreamBuilder<List<SchoolMember>>(
                    stream: widget.schoolRepository.membersOfSchool(
                      widget.schoolId,
                    ),
                    builder: (context, membersSnapshot) {
                      final members =
                          membersSnapshot.data ?? const <SchoolMember>[];
                      final superAdminCount = members
                          .where((m) => m.role == MemberRole.superAdmin)
                          .length;
                      return Column(
                        children: members.map((member) {
                          if (_editingScopeUid == member.uid) {
                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      member.displayName.isEmpty
                                          ? member.email
                                          : member.displayName,
                                    ),
                                    _ScopePicker(
                                      value: _scopeDraft,
                                      onChanged: (v) =>
                                          setState(() => _scopeDraft = v),
                                    ),
                                    Row(
                                      children: [
                                        TextButton(
                                          key: const Key('saveScopeButton'),
                                          onPressed: () =>
                                              _saveScope(member.uid),
                                          child: const Text('Save'),
                                        ),
                                        TextButton(
                                          onPressed: () => setState(
                                            () => _editingScopeUid = null,
                                          ),
                                          child: const Text('Cancel'),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }
                          return Card(
                            child: ListTile(
                              title: Text(
                                member.displayName.isEmpty
                                    ? member.email
                                    : member.displayName,
                              ),
                              subtitle: Text(
                                member.role == MemberRole.teacher
                                    ? 'Teacher — ${_scopeSummary(member.scope)}'
                                    : _roleLabel(member.role),
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (member.role == MemberRole.teacher &&
                                      isAtLeastAdmin)
                                    IconButton(
                                      key: Key('editScopeButton-${member.uid}'),
                                      icon: const Icon(Icons.edit, size: 18),
                                      tooltip: 'Edit scope',
                                      onPressed: () => setState(() {
                                        _scopeDraft =
                                            member.scope ??
                                            const MemberScope.own();
                                        _editingScopeUid = member.uid;
                                      }),
                                    ),
                                  if (membership != null &&
                                      _canRemove(
                                        member,
                                        membership,
                                        superAdminCount,
                                      ))
                                    TextButton(
                                      key: Key(
                                        'removeMemberButton-${member.uid}',
                                      ),
                                      onPressed: () =>
                                          widget.schoolRepository.removeMember(
                                            widget.schoolId,
                                            member.uid,
                                          ),
                                      child: const Text('Remove'),
                                    ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                  StreamBuilder<List<PendingInvite>>(
                    stream: widget.schoolRepository.pendingInvitesForSchool(
                      widget.schoolId,
                    ),
                    builder: (context, invitesSnapshot) {
                      final invites =
                          invitesSnapshot.data ?? const <PendingInvite>[];
                      if (invites.isEmpty) return const SizedBox.shrink();
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Pending invites',
                            style: Theme.of(context).textTheme.labelLarge,
                          ),
                          ...invites.map(
                            (invite) => Card(
                              child: ListTile(
                                title: Text(invite.email),
                                subtitle: Text(
                                  invite.role == MemberRole.teacher
                                      ? 'Teacher — ${_scopeSummary(invite.scope)} (pending)'
                                      : '${_roleLabel(invite.role)} (pending)',
                                ),
                                trailing: TextButton(
                                  onPressed: () => widget.schoolRepository
                                      .cancelInvite(invite.email),
                                  child: const Text('Cancel'),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],
                      );
                    },
                  ),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Invite a teacher',
                            style: Theme.of(context).textTheme.labelLarge,
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            key: const Key('inviteTeacherEmailField'),
                            controller: _inviteEmailController,
                            decoration: const InputDecoration(
                              labelText: 'Email',
                            ),
                          ),
                          _ScopePicker(
                            value: _inviteScope,
                            onChanged: (v) => setState(() => _inviteScope = v),
                          ),
                          ElevatedButton(
                            key: const Key('sendTeacherInviteButton'),
                            onPressed: _inviting ? null : _inviteTeacher,
                            child: const Text('Send Invite'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (isSuperAdmin) ...[
                    const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Delegate admin access',
                              style: Theme.of(context).textTheme.labelLarge,
                            ),
                            const Text(
                              'Only a super admin can grant or revoke admin (or super admin) access.',
                              style: TextStyle(fontSize: 12),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              key: const Key('inviteAdminEmailField'),
                              controller: _adminEmailController,
                              decoration: const InputDecoration(
                                labelText: 'Email',
                              ),
                            ),
                            RadioListTile<MemberRole>(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('Admin'),
                              value: MemberRole.admin,
                              groupValue: _adminRole,
                              onChanged: (v) => setState(() => _adminRole = v!),
                            ),
                            RadioListTile<MemberRole>(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('Super Admin'),
                              value: MemberRole.superAdmin,
                              groupValue: _adminRole,
                              onChanged: (v) => setState(() => _adminRole = v!),
                            ),
                            ElevatedButton(
                              key: const Key('sendAdminInviteButton'),
                              onPressed: _invitingAdmin ? null : _inviteAdmin,
                              child: const Text('Send Invite'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
