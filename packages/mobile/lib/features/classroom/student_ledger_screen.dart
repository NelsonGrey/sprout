import 'package:flutter/material.dart';

import 'package:sprout/design_system/sprout_theme.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/widgets/confirm_delete_dialog.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

/// A single student's balance and transaction history, with an inline
/// earn/spend form. Handing the device to the student to view this screen
/// is this slice's stand-in for a separate student login (see plan notes on
/// deferred student auth).
class StudentLedgerScreen extends StatefulWidget {
  const StudentLedgerScreen({
    super.key,
    required this.classroomRepository,
    required this.schoolRepository,
    required this.user,
    required this.contextId,
    required this.studentId,
  });

  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
  final AppUser user;
  final String contextId;
  final String studentId;

  @override
  State<StudentLedgerScreen> createState() => _StudentLedgerScreenState();
}

class _StudentLedgerScreenState extends State<StudentLedgerScreen> {
  final _amountController = TextEditingController();
  final _reasonController = TextEditingController();
  final _linkEmailController = TextEditingController();
  bool _recording = false;
  bool _linking = false;

  @override
  void dispose() {
    _amountController.dispose();
    _reasonController.dispose();
    _linkEmailController.dispose();
    super.dispose();
  }

  Future<void> _record(
    TransactionType type,
    List<String> ownerUids,
    Student? student,
  ) async {
    final amount = double.tryParse(_amountController.text.trim());
    final reason = _reasonController.text.trim();
    if (amount == null || amount <= 0 || reason.isEmpty || _recording) return;
    setState(() => _recording = true);
    await widget.classroomRepository.recordTransaction(
      contextId: widget.contextId,
      studentId: widget.studentId,
      type: type,
      amountCents: (amount * 100).round(),
      reason: reason,
      createdByUid: widget.user.uid,
      ownerUids: ownerUids,
      schoolId: student?.schoolId,
      gradeLevel: student?.gradeLevel,
    );
    _amountController.clear();
    _reasonController.clear();
    if (mounted) setState(() => _recording = false);
  }

  Future<void> _renameStudent(String currentName) async {
    final controller = TextEditingController(text: currentName);
    final newName = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename student'),
        content: TextField(
          key: const Key('renameStudentField'),
          controller: controller,
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            key: const Key('saveStudentNameButton'),
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (newName != null && newName.isNotEmpty) {
      final (firstName, lastName) = splitDisplayName(newName);
      await widget.classroomRepository.updateStudent(
        widget.studentId,
        firstName: firstName,
        lastName: lastName,
      );
      if (mounted) setState(() {});
    }
  }

  Future<void> _sendLinkInvite() async {
    final email = _linkEmailController.text.trim();
    if (email.isEmpty || _linking) return;
    setState(() => _linking = true);
    await widget.classroomRepository.linkStudentAccount(
      studentId: widget.studentId,
      email: email,
      invitedByUid: widget.user.uid,
    );
    _linkEmailController.clear();
    if (mounted) setState(() => _linking = false);
  }

  Future<void> _deleteStudent() async {
    final confirmed = await showConfirmDeleteDialog(
      context,
      title: 'Delete this student?',
      message: "This can't be undone.",
    );
    if (!confirmed) return;
    await widget.classroomRepository.deleteStudent(widget.studentId);
    if (mounted) context.go('/classrooms/${widget.contextId}');
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Student>>(
      stream: widget.classroomRepository.studentsInClassroom(widget.contextId),
      builder: (context, studentSnapshot) {
        final student = _findStudent(studentSnapshot.data, widget.studentId);
        final ownerUids = student?.ownerUids ?? [widget.user.uid];
        final isOwner = ownerUids.contains(widget.user.uid);
        final schoolId = student?.schoolId;

        return StreamBuilder<SchoolMember?>(
          stream: schoolId == null
              ? Stream.value(null)
              : widget.schoolRepository.myMembership(schoolId, widget.user.uid),
          builder: (context, membershipSnapshot) {
            final membership = membershipSnapshot.data;
            // Same manage tier as ClassroomDetailScreen: owner, admin/
            // super_admin, or an explicit 'manage'-level grant on this
            // student's classroom. Award access (scope or an 'award'
            // grant) is enough to record a transaction, never enough to
            // rename/delete.
            final canManage =
                isOwner ||
                (membership != null && membership.role != MemberRole.teacher) ||
                membership?.classroomGrants[widget.contextId] ==
                    ClassroomGrantLevel.manage;

            return Scaffold(
              appBar: SproutAppBar(
                title: student?.displayName ?? 'Student',
                actions: canManage
                    ? [
                        IconButton(
                          key: const Key('renameStudentButton'),
                          icon: const Icon(Icons.edit),
                          tooltip: 'Rename student',
                          onPressed: student == null
                              ? null
                              : () => _renameStudent(student.displayName),
                        ),
                        IconButton(
                          key: const Key('deleteStudentButton'),
                          icon: const Icon(Icons.delete),
                          tooltip: 'Delete student',
                          onPressed: _deleteStudent,
                        ),
                      ]
                    : null,
              ),
              body: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      '\$${((student?.balanceCents ?? 0) / 100).toStringAsFixed(2)}',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                  ),
                  if (canManage)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: student?.linkedUid != null
                              ? Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Expanded(
                                      child: Text(
                                        'Linked — the student can sign in and see this on their own',
                                        style: TextStyle(
                                          color: SproutColors.brandBright,
                                        ),
                                      ),
                                    ),
                                    TextButton(
                                      key: const Key('unlinkStudentButton'),
                                      onPressed: () => widget
                                          .classroomRepository
                                          .unlinkStudentAccount(
                                            widget.studentId,
                                          ),
                                      child: const Text('Unlink'),
                                    ),
                                  ],
                                )
                              : StreamBuilder<PendingStudentLink?>(
                                  stream: widget.classroomRepository
                                      .pendingStudentLinkForStudent(
                                        widget.studentId,
                                      ),
                                  builder: (context, pendingSnapshot) {
                                    final pending = pendingSnapshot.data;
                                    if (pending != null) {
                                      return Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              'Invite sent to ${pending.email}',
                                            ),
                                          ),
                                          TextButton(
                                            key: const Key(
                                              'cancelStudentLinkButton',
                                            ),
                                            onPressed: () => widget
                                                .classroomRepository
                                                .cancelStudentLink(
                                                  pending.email,
                                                ),
                                            child: const Text('Cancel invite'),
                                          ),
                                        ],
                                      );
                                    }
                                    return Row(
                                      children: [
                                        Expanded(
                                          child: TextField(
                                            key: const Key(
                                              'linkStudentEmailField',
                                            ),
                                            controller: _linkEmailController,
                                            decoration: const InputDecoration(
                                              labelText:
                                                  "Student's school email",
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        ElevatedButton(
                                          key: const Key(
                                            'sendLinkInviteButton',
                                          ),
                                          onPressed: _linking
                                              ? null
                                              : _sendLinkInvite,
                                          child: const Text('Link'),
                                        ),
                                      ],
                                    );
                                  },
                                ),
                        ),
                      ),
                    ),
                  Expanded(
                    child: StreamBuilder<List<LedgerTransaction>>(
                      stream: widget.classroomRepository.transactionsForStudent(
                        contextId: widget.contextId,
                        studentId: widget.studentId,
                      ),
                      builder: (context, snapshot) {
                        if (!snapshot.hasData) {
                          return const Center(
                            child: CircularProgressIndicator(),
                          );
                        }
                        final transactions = snapshot.data!;
                        if (transactions.isEmpty) {
                          return const Center(
                            child: Text('No transactions yet.'),
                          );
                        }
                        return ListView.builder(
                          itemCount: transactions.length,
                          itemBuilder: (context, index) {
                            final transaction = transactions[index];
                            final sign =
                                transaction.type == TransactionType.earn
                                ? '+'
                                : '-';
                            return ListTile(
                              title: Text(transaction.reason),
                              trailing: Text(
                                '$sign\$${(transaction.amountCents / 100).toStringAsFixed(2)}',
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                key: const Key('amountField'),
                                controller: _amountController,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                decoration: const InputDecoration(
                                  labelText: 'Amount',
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                key: const Key('reasonField'),
                                controller: _reasonController,
                                decoration: const InputDecoration(
                                  labelText: 'Reason',
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton(
                                key: const Key('earnButton'),
                                onPressed: _recording
                                    ? null
                                    : () => _record(
                                        TransactionType.earn,
                                        ownerUids,
                                        student,
                                      ),
                                child: const Text('Earn'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: ElevatedButton(
                                key: const Key('spendButton'),
                                onPressed: _recording
                                    ? null
                                    : () => _record(
                                        TransactionType.spend,
                                        ownerUids,
                                        student,
                                      ),
                                child: const Text('Spend'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Student? _findStudent(List<Student>? students, String studentId) {
    if (students == null) return null;
    for (final student in students) {
      if (student.id == studentId) return student;
    }
    return null;
  }
}
