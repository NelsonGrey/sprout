import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/auth/fake_auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/features/classroom/classrooms_screen.dart';

const _user = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');

void main() {
  testWidgets('shows empty state with no classrooms', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: ClassroomsScreen(
        authService: FakeAuthService(),
        classroomRepository: FakeClassroomRepository(),
        user: _user,
      ),
    ));
    await tester.pump();

    expect(find.text('No classrooms yet — add one below.'), findsOneWidget);
  });

  testWidgets('creating a classroom adds it to the list', (tester) async {
    final repository = FakeClassroomRepository();
    await tester.pumpWidget(MaterialApp(
      home: ClassroomsScreen(
        authService: FakeAuthService(),
        classroomRepository: repository,
        user: _user,
      ),
    ));

    final field = tester.widget<TextField>(find.byKey(const Key('classroomNameField')));
    field.controller!.text = "Mrs. Lord's 4th Grade";

    final button = tester.widget<ElevatedButton>(find.byKey(const Key('createClassroomButton')));
    button.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text("Mrs. Lord's 4th Grade"), findsOneWidget);
  });
}
