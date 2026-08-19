import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/design_system/sprout_theme.dart';

void main() {
  test(
    'uses one responsive gutter contract for phone, tablet, and wide layouts',
    () {
      expect(SproutLayout.pageGutterFor(390), 20);
      expect(SproutLayout.pageGutterFor(768), 32);
      expect(SproutLayout.pageGutterFor(1440), 48);
      expect(SproutLayout.isTablet(599), isFalse);
      expect(SproutLayout.isTablet(600), isTrue);
    },
  );

  test('Flutter theme matches the shared Sprout palette', () {
    final scheme = SproutTheme.light.colorScheme;

    expect(scheme.primary, SproutColors.brand);
    expect(scheme.secondary, SproutColors.accent);
    expect(scheme.surface, SproutColors.surface);
    expect(scheme.onSurface, SproutColors.ink);
    expect(scheme.error, SproutColors.danger);
    expect(SproutTheme.light.scaffoldBackgroundColor, SproutColors.canvas);
  });

  testWidgets('responsive body caps wide content at the universal width', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1600, 900);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      MaterialApp(
        theme: SproutTheme.light,
        home: Scaffold(
          body: SproutResponsiveBody(
            child: ColoredBox(
              key: const Key('responsive-content'),
              color: SproutColors.mint,
            ),
          ),
        ),
      ),
    );

    expect(
      tester.getSize(find.byKey(const Key('responsive-content'))).width,
      SproutLayout.contentMaxWidth,
    );
  });
}
