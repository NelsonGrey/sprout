import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// Reads [text] aloud via on-device text-to-speech — the "optional
/// text-to-speech" pairing 01_EXPERIENCE_FOUNDATIONS.md §9 requires
/// alongside icon+text for early-reader controls. Dart mirror of
/// packages/web/src/features/student/ReadAloudButton.tsx (which uses the
/// browser's Web Speech API instead of a plugin).
class ReadAloudButton extends StatelessWidget {
  const ReadAloudButton({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      key: const Key('readAloudButton'),
      icon: const Icon(Icons.volume_up),
      tooltip: 'Read aloud: $text',
      onPressed: () async {
        final tts = FlutterTts();
        await tts.stop();
        await tts.speak(text);
      },
    );
  }
}
