import 'package:flutter/material.dart';

import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';

/// A single student's balance and transaction history, with an inline
/// earn/spend form. Handing the device to the student to view this screen
/// is this slice's stand-in for a separate student login (see plan notes on
/// deferred student auth).
class StudentLedgerScreen extends StatefulWidget {
  const StudentLedgerScreen({
    super.key,
    required this.classroomRepository,
    required this.user,
    required this.contextId,
    required this.studentId,
  });

  final ClassroomRepository classroomRepository;
  final AppUser user;
  final String contextId;
  final String studentId;

  @override
  State<StudentLedgerScreen> createState() => _StudentLedgerScreenState();
}

class _StudentLedgerScreenState extends State<StudentLedgerScreen> {
  final _amountController = TextEditingController();
  final _reasonController = TextEditingController();
  bool _recording = false;

  @override
  void dispose() {
    _amountController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _record(TransactionType type, List<String> ownerUids) async {
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
    );
    _amountController.clear();
    _reasonController.clear();
    if (mounted) setState(() => _recording = false);
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Student>>(
      stream: widget.classroomRepository.studentsInClassroom(widget.contextId),
      builder: (context, studentSnapshot) {
        final student = _findStudent(studentSnapshot.data, widget.studentId);
        final ownerUids = student?.ownerUids ?? [widget.user.uid];

        return Scaffold(
          appBar: AppBar(title: Text(student?.displayName ?? 'Student')),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  '\$${((student?.balanceCents ?? 0) / 100).toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.headlineMedium,
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
                      return const Center(child: CircularProgressIndicator());
                    }
                    final transactions = snapshot.data!;
                    if (transactions.isEmpty) {
                      return const Center(child: Text('No transactions yet.'));
                    }
                    return ListView.builder(
                      itemCount: transactions.length,
                      itemBuilder: (context, index) {
                        final transaction = transactions[index];
                        final sign = transaction.type == TransactionType.earn ? '+' : '-';
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
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(labelText: 'Amount'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            key: const Key('reasonField'),
                            controller: _reasonController,
                            decoration: const InputDecoration(labelText: 'Reason'),
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
                            onPressed:
                                _recording ? null : () => _record(TransactionType.earn, ownerUids),
                            child: const Text('Earn'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton(
                            key: const Key('spendButton'),
                            onPressed: _recording
                                ? null
                                : () => _record(TransactionType.spend, ownerUids),
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
  }

  Student? _findStudent(List<Student>? students, String studentId) {
    if (students == null) return null;
    for (final student in students) {
      if (student.id == studentId) return student;
    }
    return null;
  }
}
