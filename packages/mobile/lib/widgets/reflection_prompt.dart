import 'package:flutter/material.dart';

/// A discussion-only reflection prompt — no text input, nothing stored.
/// Dart mirror of packages/web/src/features/student/ReflectionPrompt.tsx —
/// see that file's doc comment for why this can never become a text
/// field. Mirrors the same "Discuss aloud, nothing saved" pattern already
/// used by the Learn guided runner's Reflect step.
class ReflectionPrompt extends StatefulWidget {
  const ReflectionPrompt({
    super.key,
    required this.prompts,
    this.defaultOpen = false,
  });

  final List<String> prompts;
  final bool defaultOpen;

  @override
  State<ReflectionPrompt> createState() => _ReflectionPromptState();
}

class _ReflectionPromptState extends State<ReflectionPrompt> {
  late bool _open = widget.defaultOpen;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InkWell(
              key: const Key('reflectionPromptToggle'),
              onTap: () => setState(() => _open = !_open),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome, size: 16),
                  const SizedBox(width: 6),
                  const Expanded(
                    child: Text(
                      'What would you try next?',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  Icon(_open ? Icons.expand_less : Icons.expand_more),
                ],
              ),
            ),
            if (_open) ...[
              const SizedBox(height: 8),
              Text(
                'Discuss aloud with an adult — nothing typed here is saved.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              for (final prompt in widget.prompts)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('→ $prompt'),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
