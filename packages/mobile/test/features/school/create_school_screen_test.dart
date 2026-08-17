import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/features/school/create_school_screen.dart';

const _user = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');

Widget _routedHarness(SchoolRepository repository) {
  final router = GoRouter(
    initialLocation: '/school',
    routes: [
      GoRoute(
        path: '/school',
        builder: (context, state) => CreateSchoolScreen(schoolRepository: repository, user: _user),
      ),
    ],
  );
  return MaterialApp.router(routerConfig: router);
}

void main() {
  testWidgets('founds a school with the current user as founder', (tester) async {
    final repository = FakeSchoolRepository();

    await tester.pumpWidget(_routedHarness(repository));
    await tester.pump();

    tester.widget<TextField>(find.byKey(const Key('schoolNameField'))).controller!.text =
        'Riverside Elementary';
    final createButton = tester.widget<ElevatedButton>(find.byKey(const Key('createSchoolButton')));
    createButton.onPressed!();
    await tester.pumpAndSettle();

    final schoolIds = await repository.schoolIdsForUser(_user.uid).first;
    expect(schoolIds, isNotEmpty);
    final school = await repository.getSchool(schoolIds.first);
    expect(school?.name, 'Riverside Elementary');
    final membership = await repository.myMembership(schoolIds.first, _user.uid).first;
    expect(membership?.role.toString(), contains('superAdmin'));
  });
}
