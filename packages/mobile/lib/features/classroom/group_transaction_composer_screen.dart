import 'dart:async';

import 'package:flutter/material.dart';

import 'package:sprout/core/models/bulk_transaction_result.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/connectivity/connectivity_service.dart';
import 'package:sprout/widgets/offline_notice.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

/// The group/mass transaction composer (`M-CLASS-02` group mode) — pushed
/// as its own screen from ClassroomDetailScreen's select mode. Recipient
/// selection itself lives in the caller (checkbox selection on the
/// roster); this only covers action/tags/review/submit, calling
/// [ClassroomRepository.recordBulkTransaction] rather than looping
/// recordTransaction client-side, which has neither the idempotency nor
/// the server-rechecked authorization a retry-safe group write requires.
/// Mirrors packages/web/src/features/classroom/components/transaction-
/// composer/GroupTransactionComposer.tsx.
class GroupTransactionComposerScreen extends StatefulWidget {
  const GroupTransactionComposerScreen({
    super.key,
    required this.classroomRepository,
    required this.connectivityService,
    required this.contextId,
    required this.students,
  });

  final ClassroomRepository classroomRepository;
  final ConnectivityService connectivityService;
  final String contextId;
  final List<Student> students;

  @override
  State<GroupTransactionComposerScreen> createState() =>
      _GroupTransactionComposerScreenState();
}

class _GroupTransactionComposerScreenState
    extends State<GroupTransactionComposerScreen> {
  // Stable for the screen's whole lifetime, including a "retry failed
  // only" — reusing the same key keeps every attempt one idempotent
  // operation rather than risking a fresh key re-crediting a recipient a
  // prior attempt already succeeded for. Timestamp + this State object's
  // identity hash is enough entropy for this purpose (one teacher's one
  // classroom, not a distributed-uniqueness requirement) without adding a
  // uuid package dependency just for this.
  late final String _idempotencyKey =
      '${DateTime.now().microsecondsSinceEpoch}-${identityHashCode(this)}';
  final _amountController = TextEditingController();
  final _reasonController = TextEditingController();
  TransactionType _type = TransactionType.earn;
  SavingsLabel? _savingsLabel;
  SpendCategory? _spendCategory;
  bool _submitting = false;
  BulkTransactionResult? _result;
  String? _submitError;
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
    super.dispose();
  }

  Future<void> _submit(List<String> targetStudentIds) async {
    final amount = double.tryParse(_amountController.text.trim());
    final reason = _reasonController.text.trim();
    if (amount == null ||
        amount <= 0 ||
        reason.isEmpty ||
        _submitting ||
        !_online) {
      return;
    }
    setState(() {
      _submitting = true;
      _submitError = null;
    });
    try {
      final outcome = await widget.classroomRepository.recordBulkTransaction(
        contextId: widget.contextId,
        idempotencyKey: _idempotencyKey,
        type: _type,
        amountCentsEach: (amount * 100).round(),
        reason: reason,
        recipientStudentIds: targetStudentIds,
        savingsLabel: _type == TransactionType.earn ? _savingsLabel : null,
        spendCategory: _type == TransactionType.spend ? _spendCategory : null,
      );
      setState(() {
        final prev = _result;
        _result = prev == null
            ? outcome
            : BulkTransactionResult(
                succeeded: [...prev.succeeded, ...outcome.succeeded],
                failed: outcome.failed,
              );
      });
    } catch (error) {
      setState(() => _submitError = error.toString());
    }
    if (mounted) setState(() => _submitting = false);
  }

  @override
  Widget build(BuildContext context) {
    final result = _result;
    return Scaffold(
      appBar: SproutAppBar(
        title: 'Record for ${widget.students.length} students',
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: result != null ? _buildResult(result) : _buildForm(),
      ),
    );
  }

  Widget _buildResult(BulkTransactionResult result) {
    final total = result.succeeded.length + result.failed.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${result.succeeded.length} of $total recorded${result.failed.isNotEmpty ? ', ${result.failed.length} failed' : ''}.',
          key: const Key('bulkResultSummary'),
        ),
        if (result.failed.isNotEmpty) ...[
          const SizedBox(height: 8),
          for (final f in result.failed)
            Text(
              '${_studentName(f.studentId)}: ${f.error}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
        ],
        if (_submitError != null) ...[
          const SizedBox(height: 8),
          Text(_submitError!, style: const TextStyle(color: Colors.red)),
        ],
        if (!_online && result.failed.isNotEmpty) ...[
          const SizedBox(height: 8),
          const OfflineNotice(),
        ],
        const SizedBox(height: 16),
        Row(
          children: [
            if (result.failed.isNotEmpty)
              ElevatedButton(
                key: const Key('retryFailedOnlyButton'),
                onPressed: (_submitting || !_online)
                    ? null
                    : () => _submit(
                        result.failed.map((f) => f.studentId).toList(),
                      ),
                child: Text(_submitting ? 'Retrying…' : 'Retry failed only'),
              ),
            const SizedBox(width: 8),
            OutlinedButton(
              key: const Key('returnToClassroomButton'),
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Return to classroom'),
            ),
          ],
        ),
      ],
    );
  }

  String _studentName(String id) =>
      widget.students.where((s) => s.id == id).firstOrNull?.displayName ?? id;

  Widget _buildForm() {
    final recipientStudentIds = widget.students.map((s) => s.id).toList();
    final amount = double.tryParse(_amountController.text.trim());
    final amountCents = amount != null ? (amount * 100).round() : null;
    final validAmount = amountCents != null && amountCents > 0;
    final canSubmit =
        validAmount &&
        _reasonController.text.trim().isNotEmpty &&
        !_submitting &&
        _online;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final s in widget.students) Chip(label: Text(s.displayName)),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: ChoiceChip(
                key: const Key('groupEarnChip'),
                label: const Text('Earn'),
                selected: _type == TransactionType.earn,
                onSelected: (_) => setState(() => _type = TransactionType.earn),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ChoiceChip(
                key: const Key('groupSpendChip'),
                label: const Text('Spend'),
                selected: _type == TransactionType.spend,
                onSelected: (_) =>
                    setState(() => _type = TransactionType.spend),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        TextField(
          key: const Key('groupAmountField'),
          controller: _amountController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            labelText: 'Amount for each student',
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 8),
        TextField(
          key: const Key('groupReasonField'),
          controller: _reasonController,
          decoration: const InputDecoration(labelText: 'Reason'),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 8),
        if (_type == TransactionType.earn)
          DropdownButtonFormField<SavingsLabel?>(
            key: const Key('groupSavingsLabelField'),
            initialValue: _savingsLabel,
            decoration: const InputDecoration(labelText: 'Save as… (optional)'),
            items: const [
              DropdownMenuItem(value: null, child: Text('No label')),
              DropdownMenuItem(
                value: SavingsLabel.justInCase,
                child: Text('☂️ Just in case'),
              ),
            ],
            onChanged: (v) => setState(() => _savingsLabel = v),
          ),
        if (_type == TransactionType.spend)
          DropdownButtonFormField<SpendCategory?>(
            key: const Key('groupSpendCategoryField'),
            initialValue: _spendCategory,
            decoration: const InputDecoration(
              labelText: 'This is a… (optional)',
            ),
            items: const [
              DropdownMenuItem(value: null, child: Text('No label')),
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
            onChanged: (v) => setState(() => _spendCategory = v),
          ),
        if (validAmount) ...[
          const SizedBox(height: 12),
          Text(
            '${widget.students.length} students × \$${(amountCents / 100).toStringAsFixed(2)} each',
            style: Theme.of(context).textTheme.labelLarge,
          ),
          for (final s in widget.students)
            Text(
              '${s.displayName}: \$${(s.balanceCents / 100).toStringAsFixed(2)} → '
              '\$${((s.balanceCents + (_type == TransactionType.earn ? amountCents : -amountCents)) / 100).toStringAsFixed(2)}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
        ],
        if (_submitError != null) ...[
          const SizedBox(height: 8),
          Text(_submitError!, style: const TextStyle(color: Colors.red)),
        ],
        if (!_online) ...[const SizedBox(height: 8), const OfflineNotice()],
        const SizedBox(height: 16),
        ElevatedButton(
          key: const Key('recordGroupTransactionButton'),
          onPressed: canSubmit ? () => _submit(recipientStudentIds) : null,
          child: Text(
            _submitting
                ? 'Recording…'
                : 'Record ${widget.students.length} transactions',
          ),
        ),
      ],
    );
  }
}
