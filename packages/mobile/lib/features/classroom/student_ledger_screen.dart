import 'dart:async';

import 'package:flutter/material.dart';

import 'package:sprout/design_system/sprout_theme.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/goal.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/models/store_item.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/connectivity/connectivity_service.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/widgets/confirm_delete_dialog.dart';
import 'package:sprout/widgets/goal_progress_card.dart';
import 'package:sprout/widgets/offline_notice.dart';
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
    required this.connectivityService,
    required this.user,
    required this.contextId,
    required this.studentId,
  });

  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
  final ConnectivityService connectivityService;
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

  // Encodes the "Save as…" selector's value: '' (none), 'just_in_case', or
  // a specific goal's id — mirrors web StudentDetailPane's `saveAs` state.
  // Only meaningful for Earn; _record splits it back into
  // savingsLabel/goalId. Cleared after every recorded transaction, same as
  // amount/reason.
  String _saveAs = '';
  SpendCategory? _spendCategory;

  bool _addingGoal = false;
  final _goalNameController = TextEditingController();
  final _goalTargetController = TextEditingController();
  bool _savingGoal = false;

  bool _online = true;
  StreamSubscription<bool>? _connectivitySubscription;

  @override
  void initState() {
    super.initState();
    widget.connectivityService.isOnline.then((online) {
      if (mounted) setState(() => _online = online);
    });
    _connectivitySubscription = widget.connectivityService.onConnectivityChanged
        .listen((online) {
          if (mounted) setState(() => _online = online);
        });
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    _amountController.dispose();
    _reasonController.dispose();
    _linkEmailController.dispose();
    _goalNameController.dispose();
    _goalTargetController.dispose();
    super.dispose();
  }

  Future<void> _record(
    TransactionType type,
    List<String> ownerUids,
    Student? student,
    List<Goal> goals,
  ) async {
    final amount = double.tryParse(_amountController.text.trim());
    final reason = _reasonController.text.trim();
    if (amount == null ||
        amount <= 0 ||
        reason.isEmpty ||
        _recording ||
        !_online) {
      return;
    }
    setState(() => _recording = true);
    final targetGoal = goals.where((g) => g.id == _saveAs).firstOrNull;
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
      goalId: type == TransactionType.earn ? targetGoal?.id : null,
      savingsLabel:
          type == TransactionType.earn &&
              targetGoal == null &&
              _saveAs == 'just_in_case'
          ? SavingsLabel.justInCase
          : null,
      spendCategory: type == TransactionType.spend ? _spendCategory : null,
    );
    _amountController.clear();
    _reasonController.clear();
    if (mounted) {
      setState(() {
        _recording = false;
        _saveAs = '';
        _spendCategory = null;
      });
    }
  }

  Future<void> _applyInterest(
    Goal goal,
    double ratePercent,
    Student? student,
    List<String> ownerUids,
  ) async {
    if (!ratePercent.isFinite || ratePercent <= 0 || goal.savedCents <= 0) {
      return;
    }
    final interestCents = (goal.savedCents * (ratePercent / 100)).round();
    if (interestCents <= 0) return;
    await widget.classroomRepository.recordTransaction(
      contextId: widget.contextId,
      studentId: widget.studentId,
      type: TransactionType.earn,
      amountCents: interestCents,
      reason: 'Interest',
      goalId: goal.id,
      createdByUid: widget.user.uid,
      ownerUids: ownerUids,
      schoolId: student?.schoolId,
      gradeLevel: student?.gradeLevel,
    );
  }

  Future<void> _addGoal() async {
    final name = _goalNameController.text.trim();
    final target = double.tryParse(_goalTargetController.text.trim());
    if (name.isEmpty || target == null || target <= 0 || _savingGoal) return;
    setState(() => _savingGoal = true);
    await widget.classroomRepository.createGoal(
      studentId: widget.studentId,
      name: name,
      targetCents: (target * 100).round(),
      createdByUid: widget.user.uid,
    );
    _goalNameController.clear();
    _goalTargetController.clear();
    if (mounted) setState(() => _savingGoal = false);
    if (mounted) setState(() => _addingGoal = false);
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
    // pop, not go('/classrooms/$contextId'): this screen was pushed on top
    // of the classroom detail screen (a live StreamBuilder that will
    // reflect the delete on its own), so popping back to it preserves the
    // rest of the stack (e.g. Home) instead of replacing it outright.
    if (mounted) context.pop();
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

            return StreamBuilder<List<Goal>>(
              stream: widget.classroomRepository.goalsForStudent(
                widget.studentId,
              ),
              builder: (context, goalsSnapshot) {
                final goals = goalsSnapshot.data ?? const <Goal>[];
                final unachievedGoals = goals
                    .where((g) => !g.achieved)
                    .toList();
                return _buildScaffold(
                  context,
                  student,
                  ownerUids,
                  canManage,
                  goals,
                  unachievedGoals,
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildScaffold(
    BuildContext context,
    Student? student,
    List<String> ownerUids,
    bool canManage,
    List<Goal> goals,
    List<Goal> unachievedGoals,
  ) {
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
      body: SingleChildScrollView(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                '\$${((student?.balanceCents ?? 0) / 100).toStringAsFixed(2)}',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Goals',
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                      if (canManage && !_addingGoal)
                        TextButton.icon(
                          key: const Key('newGoalButton'),
                          onPressed: () => setState(() => _addingGoal = true),
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('New goal'),
                        ),
                    ],
                  ),
                  if (canManage && _addingGoal)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          children: [
                            TextField(
                              key: const Key('goalNameField'),
                              controller: _goalNameController,
                              autofocus: true,
                              decoration: const InputDecoration(
                                labelText: 'Goal name',
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              key: const Key('goalTargetField'),
                              controller: _goalTargetController,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              decoration: const InputDecoration(
                                labelText: 'Target amount',
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                ElevatedButton(
                                  key: const Key('addGoalButton'),
                                  onPressed: _savingGoal ? null : _addGoal,
                                  child: const Text('Add goal'),
                                ),
                                const SizedBox(width: 8),
                                TextButton(
                                  onPressed: () =>
                                      setState(() => _addingGoal = false),
                                  child: const Text('Cancel'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  for (final goal in goals)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: GoalProgressCard(
                        goal: goal,
                        onDelete: canManage
                            ? () => widget.classroomRepository.deleteGoal(
                                widget.studentId,
                                goal.id,
                              )
                            : null,
                        onApplyInterest: canManage
                            ? (rate) =>
                                  _applyInterest(goal, rate, student, ownerUids)
                            : null,
                      ),
                    ),
                ],
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
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                                onPressed: () => widget.classroomRepository
                                    .unlinkStudentAccount(widget.studentId),
                                child: const Text('Unlink'),
                              ),
                            ],
                          )
                        : StreamBuilder<PendingStudentLink?>(
                            stream: widget.classroomRepository
                                .pendingStudentLinkForStudent(widget.studentId),
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
                                      key: const Key('cancelStudentLinkButton'),
                                      onPressed: () => widget
                                          .classroomRepository
                                          .cancelStudentLink(pending.email),
                                      child: const Text('Cancel invite'),
                                    ),
                                  ],
                                );
                              }
                              return Row(
                                children: [
                                  Expanded(
                                    child: TextField(
                                      key: const Key('linkStudentEmailField'),
                                      controller: _linkEmailController,
                                      decoration: const InputDecoration(
                                        labelText: "Student's school email",
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    key: const Key('sendLinkInviteButton'),
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
            StreamBuilder<List<LedgerTransaction>>(
              stream: widget.classroomRepository.transactionsForStudent(
                contextId: widget.contextId,
                studentId: widget.studentId,
              ),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const SizedBox(
                    height: 120,
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                final transactions = snapshot.data!;
                if (transactions.isEmpty) {
                  return const SizedBox(
                    height: 80,
                    child: Center(child: Text('No transactions yet.')),
                  );
                }
                // shrinkWrap + NeverScrollableScrollPhysics: this list lives
                // inside the screen's outer SingleChildScrollView (added so
                // the Goals section + composer don't overflow a small
                // screen), so it must size to its content rather than try to
                // scroll independently within an unbounded height.
                return ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: transactions.length,
                  itemBuilder: (context, index) {
                    final transaction = transactions[index];
                    final sign = transaction.type == TransactionType.earn
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
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: StreamBuilder<List<StoreItem>>(
                stream: widget.classroomRepository.storeItemsForContext(
                  widget.contextId,
                ),
                builder: (context, storeSnapshot) {
                  final storeItems = storeSnapshot.data ?? const <StoreItem>[];
                  if (storeItems.isEmpty) return const SizedBox.shrink();
                  return Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final item in storeItems)
                        ActionChip(
                          label: Text(
                            '${item.name} — \$${(item.priceCents / 100).toStringAsFixed(2)}',
                          ),
                          onPressed: () {
                            _amountController.text = (item.priceCents / 100)
                                .toStringAsFixed(2);
                            _reasonController.text = item.name;
                          },
                        ),
                    ],
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
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: const InputDecoration(
                            labelText: 'Amount',
                          ),
                          // Only the opportunity-cost reminder below depends on
                          // amount changes triggering a rebuild — everything
                          // else here already re-evaluates the live controller
                          // text at submit time via _record.
                          onChanged: (_) => setState(() {}),
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
                  // Only meaningful for Earn — recordTransaction drops it
                  // for a Spend regardless (see _record).
                  DropdownButtonFormField<String>(
                    key: const Key('saveAsField'),
                    initialValue: _saveAs,
                    decoration: const InputDecoration(
                      labelText: 'Save as… (optional, for Earn)',
                    ),
                    items: [
                      const DropdownMenuItem(value: '', child: Text('None')),
                      const DropdownMenuItem(
                        value: 'just_in_case',
                        child: Text('☂️ Just in case'),
                      ),
                      for (final goal in goals)
                        DropdownMenuItem(
                          value: goal.id,
                          child: Text(
                            '🎯 ${goal.name} — \$${(goal.savedCents / 100).toStringAsFixed(2)} of '
                            '\$${(goal.targetCents / 100).toStringAsFixed(2)}',
                          ),
                        ),
                    ],
                    onChanged: (value) => setState(() => _saveAs = value ?? ''),
                  ),
                  const SizedBox(height: 8),
                  // Mirror image of the field above — only meaningful
                  // for Spend, dropped for an Earn regardless.
                  DropdownButtonFormField<SpendCategory?>(
                    key: const Key('spendCategoryField'),
                    initialValue: _spendCategory,
                    decoration: const InputDecoration(
                      labelText: 'This is a… (optional, for Spend)',
                    ),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('None')),
                      DropdownMenuItem(
                        value: SpendCategory.need,
                        child: Text('✅ Need'),
                      ),
                      DropdownMenuItem(
                        value: SpendCategory.want,
                        child: Text('💖 Want'),
                      ),
                      DropdownMenuItem(
                        value: SpendCategory.both,
                        child: Text('🔀 It depends'),
                      ),
                    ],
                    onChanged: (value) =>
                        setState(() => _spendCategory = value),
                  ),
                  if (unachievedGoals.isNotEmpty &&
                      (double.tryParse(_amountController.text) ?? 0) > 0)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '💭 Spending this now means less goes toward: '
                          '${unachievedGoals.map((g) => g.name).join(', ')}.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ),
                  if (!_online) ...[
                    const SizedBox(height: 8),
                    const OfflineNotice(),
                  ],
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          key: const Key('earnButton'),
                          onPressed: (_recording || !_online)
                              ? null
                              : () => _record(
                                  TransactionType.earn,
                                  ownerUids,
                                  student,
                                  goals,
                                ),
                          child: const Text('Earn'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton(
                          key: const Key('spendButton'),
                          onPressed: (_recording || !_online)
                              ? null
                              : () => _record(
                                  TransactionType.spend,
                                  ownerUids,
                                  student,
                                  goals,
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
      ),
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
