import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/features/classroom/classroom_detail_screen.dart';

const _user = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');

void main() {
  testWidgets('shows empty state with no students', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _user.uid);

    await tester.pumpWidget(MaterialApp(
      home: ClassroomDetailScreen(
        classroomRepository: repository,
        user: _user,
        contextId: classroom.id,
      ),
    ));
    await tester.pump();

    expect(find.text('No students yet — add one below.'), findsOneWidget);
  });

  testWidgets('adding a student shows them in the roster with a zero balance', (tester) async {
    final repository = FakeClassroomRepository();
    final classroom = await repository.createClassroom(name: '4th Grade', ownerUid: _user.uid);

    await tester.pumpWidget(MaterialApp(
      home: ClassroomDetailScreen(
        classroomRepository: repository,
        user: _user,
        contextId: classroom.id,
      ),
    ));
    await tester.pump();

    final field = tester.widget<TextField>(find.byKey(const Key('studentNameField')));
    field.controller!.text = 'Alex';

    final button = tester.widget<ElevatedButton>(find.byKey(const Key('addStudentButton')));
    button.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Alex'), findsOneWidget);
    expect(find.text('\$0.00'), findsOneWidget);
  });
}
