import 'package:firebase_auth/firebase_auth.dart' show FirebaseAuthException;
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/widgets/confirm_delete_dialog.dart';

/// One school this user belongs to, and what deleting the account would do
/// to their membership there — mirrors web's SchoolMembershipSummary.
class _SchoolMembershipSummary {
  const _SchoolMembershipSummary({
    required this.schoolId,
    required this.schoolName,
    required this.role,
    required this.isSoleSuperAdmin,
  });

  final String schoolId;
  final String schoolName;
  final MemberRole role;
  final bool isSoleSuperAdmin;
}

class _AccountDeletionSummary {
  const _AccountDeletionSummary({
    required this.schoolMemberships,
    required this.standaloneClassrooms,
    required this.linkedStudentName,
  });

  final List<_SchoolMembershipSummary> schoolMemberships;
  final List<({String id, String name})> standaloneClassrooms;
  final String? linkedStudentName;
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

/// Self-service account deletion, required for Apple/Google app store
/// compliance (any app that supports account creation must offer in-app
/// deletion). Ports packages/web/src/features/auth/DeleteAccountPage.tsx's
/// design: leaving a school only unassigns any classroom(s) this member
/// owned there (an admin can reassign them); a personal (non-school)
/// classroom this user solely owns is permanently destroyed along with its
/// students, since firestore.rules gives standalone classrooms no admin
/// escape hatch and they'd otherwise be orphaned forever.
///
/// Deliberately does NOT touch a linked student's linkedUid — no rules
/// branch lets a student clear their own link (only staff can, via
/// unlinkStudentAccount); a stale linkedUid after this account + its auth
/// identity are both gone is inert, not a security issue. Matches web's
/// lib/account.ts reasoning exactly.
///
/// Deliberately does NOT delete a destroyed personal classroom's
/// transactions subcollection — matches deleteClassroom's existing accepted
/// non-cascading behavior elsewhere in this codebase; safe, since
/// transaction reads require either a live contexts doc or a live linked
/// student, both gone by the time this returns.
class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({
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
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  _AccountDeletionSummary? _summary;
  bool _acknowledged = false;
  bool _deleting = false;
  String? _error;
  final _passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadSummary();
  }

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _loadSummary() async {
    final uid = widget.user.uid;
    final schoolIds = await widget.schoolRepository.schoolIdsForUser(uid).first;

    final memberships = <_SchoolMembershipSummary>[];
    for (final schoolId in schoolIds) {
      final school = await widget.schoolRepository.getSchool(schoolId);
      final member = await widget.schoolRepository.myMembership(schoolId, uid).first;
      final role = member?.role ?? MemberRole.teacher;
      final allMembers = await widget.schoolRepository.membersOfSchool(schoolId).first;
      final superAdminCount = allMembers.where((m) => m.role == MemberRole.superAdmin).length;
      memberships.add(_SchoolMembershipSummary(
        schoolId: schoolId,
        schoolName: school?.name ?? 'Unknown School',
        role: role,
        isSoleSuperAdmin: role == MemberRole.superAdmin && superAdminCount <= 1,
      ));
    }

    final owned = await widget.classroomRepository.myClassrooms(uid).first;
    final standaloneClassrooms = owned
        .where((c) => c.schoolId == null)
        .map((c) => (id: c.id, name: c.name))
        .toList();

    final linkedStudent = await widget.classroomRepository.linkedStudentForUser(uid).first;

    if (!mounted) return;
    setState(() {
      _summary = _AccountDeletionSummary(
        schoolMemberships: memberships,
        standaloneClassrooms: standaloneClassrooms,
        linkedStudentName: linkedStudent?.displayName,
      );
    });
  }

  String _friendlyDeleteError(Object error) {
    if (error is! FirebaseAuthException) {
      return kDebugMode ? error.toString() : 'Something went wrong. Please try again.';
    }
    switch (error.code) {
      case 'invalid-credential':
      case 'wrong-password':
        return 'Incorrect password.';
      case 'popup-closed-by-user':
      case 'sign_in_canceled':
        return 'Verification was cancelled.';
      case 'requires-recent-login':
        return 'Please verify your identity again and retry.';
      default:
        return kDebugMode
            ? '${error.message ?? error.code}\n\n(code: ${error.code})'
            : 'Something went wrong. Please try again.';
    }
  }

  /// The actual deletion sequence, run only after reauthentication succeeds:
  /// leave every school (auto-unassigning owned classrooms there), destroy
  /// every standalone classroom this user owns (students first, then the
  /// classroom), delete the users/{uid} profile doc, and finally delete the
  /// Firebase Auth account — which must be last, since every step above
  /// needs to still be authenticated as this uid.
  Future<void> _deleteAccountData() async {
    final uid = widget.user.uid;
    final summary = _summary!;

    for (final membership in summary.schoolMemberships) {
      await widget.schoolRepository.removeMember(membership.schoolId, uid);
      await widget.schoolRepository.removeSchoolIdForSelf(membership.schoolId, uid);
    }

    for (final classroom in summary.standaloneClassrooms) {
      final students = await widget.classroomRepository.studentsInClassroom(classroom.id).first;
      await widget.classroomRepository.bulkDeleteStudents(students.map((s) => s.id).toList());
      await widget.classroomRepository.deleteClassroom(classroom.id);
    }

    await widget.schoolRepository.deleteUserProfile(uid);
    await widget.authService.deleteAccount();
  }

  Future<void> _handleDelete() async {
    setState(() {
      _deleting = true;
      _error = null;
    });
    try {
      switch (widget.user.providerId) {
        case 'google.com':
          await widget.authService.reauthenticateWithGoogle();
        case 'apple.com':
          await widget.authService.reauthenticateWithApple();
        default:
          await widget.authService.reauthenticateWithEmail(_passwordController.text);
      }
      await _deleteAccountData();
      // No further state update needed on success — deleteAccount() clears
      // the auth session; the app's top-level router (see main.dart's
      // redirect) sends us to /login once authStateChanges() fires.
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _friendlyDeleteError(e);
        _deleting = false;
      });
    }
  }

  Future<void> _confirmAndDelete() async {
    final providerId = widget.user.providerId;
    final bool confirmed;
    if (providerId == 'password') {
      confirmed = await _showPasswordConfirmDialog();
    } else {
      confirmed = await showConfirmDeleteDialog(
        context,
        title: 'Delete your account?',
        message: "This can't be undone.",
      );
    }
    if (confirmed) await _handleDelete();
  }

  /// Email/password accounts need the password collected as part of the
  /// confirmation step (Google/Apple reauthenticate via their own
  /// popup/native flow with no extra input needed here).
  Future<bool> _showPasswordConfirmDialog() async {
    _passwordController.clear();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete your account?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("This can't be undone."),
            const SizedBox(height: 12),
            TextField(
              key: const Key('deleteAccountPasswordField'),
              controller: _passwordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirm your password'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            key: const Key('confirmDeleteButton'),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    return confirmed ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final summary = _summary;
    return Scaffold(
      appBar: AppBar(title: const Text('Delete Account')),
      body: summary == null
          ? const Center(child: CircularProgressIndicator())
          : _buildBody(context, summary),
    );
  }

  Widget _buildBody(BuildContext context, _AccountDeletionSummary summary) {
    final soleSuperAdminOf = summary.schoolMemberships.where((m) => m.isSoleSuperAdmin).toList();
    final needsAcknowledgement = summary.standaloneClassrooms.isNotEmpty;
    final canDelete = !needsAcknowledgement || _acknowledged;

    if (soleSuperAdminOf.isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              "You can't delete your account yet",
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "You're the only super admin of "
              '${soleSuperAdminOf.map((m) => m.schoolName).join(', ')}. '
              'Promote another admin to super admin before deleting your account.',
            ),
            const SizedBox(height: 12),
            for (final membership in soleSuperAdminOf)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: OutlinedButton(
                  key: const Key('goToStaffButton'),
                  onPressed: () => context.go('/school'),
                  child: Text('Go to Staff — ${membership.schoolName}'),
                ),
              ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('What happens', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          for (final membership in summary.schoolMemberships)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                "You'll leave ${membership.schoolName} (${_roleLabel(membership.role)}). "
                'Any classroom you own there will be unassigned, not deleted — '
                'an admin can reassign it.',
              ),
            ),
          if (summary.standaloneClassrooms.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'These personal classrooms and their students will be permanently deleted: '
              '${summary.standaloneClassrooms.map((c) => c.name).join(', ')}.',
              style: const TextStyle(color: Colors.red),
            ),
          ],
          if (summary.linkedStudentName != null) ...[
            const SizedBox(height: 8),
            Text(
              "Your account is linked to ${summary.linkedStudentName}'s balance — "
              'that record stays with the school; only your login is removed.',
            ),
          ],
          if (needsAcknowledgement) ...[
            const SizedBox(height: 16),
            CheckboxListTile(
              key: const Key('acknowledgeCheckbox'),
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: _acknowledged,
              onChanged: (value) => setState(() => _acknowledged = value ?? false),
              title: const Text(
                'I understand my personal classroom(s) and their students '
                'will be permanently deleted.',
              ),
            ),
          ],
          const SizedBox(height: 16),
          ElevatedButton(
            key: const Key('deleteAccountButton'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: (!canDelete || _deleting) ? null : _confirmAndDelete,
            child: const Text('Delete My Account'),
          ),
          if (_deleting) ...[
            const SizedBox(height: 12),
            const Text('Deleting your account…'),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
        ],
      ),
    );
  }
}
