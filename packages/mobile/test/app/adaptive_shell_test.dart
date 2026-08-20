import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/app/adaptive_shell.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/fake_classroom_repository.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';

const _teacher = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');
const _admin = AppUser(uid: 'admin-1', displayName: 'Office Manager', email: 'admin@example.com');

Future<String> _foundSchool(FakeSchoolRepository repository, AppUser founder) async {
  final school = await repository.createSchool(
    name: 'Riverside Elementary',
    founderUid: founder.uid,
    founderDisplayName: founder.displayName,
    founderEmail: founder.email,
  );
  return school.id;
}

/// The default flutter_test surface is 800×600 — already ≥ SproutLayout's
/// 600px phone breakpoint, which would silently exercise the rail branch
/// instead of the bottom-nav branch. Tests asserting phone behavior must
/// opt into an explicit phone-sized viewport.
void _setPhoneSize(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
}

Widget _wrap({
  required AppUser user,
  required FakeSchoolRepository schoolRepository,
  required FakeClassroomRepository classroomRepository,
  String currentPath = '/',
}) {
  return MaterialApp(
    home: AdaptiveShell(
      classroomRepository: classroomRepository,
      schoolRepository: schoolRepository,
      user: user,
      currentPath: currentPath,
      child: const Text('screen content'),
    ),
  );
}

void main() {
  testWidgets('renders the child with no chrome for an account with no staff access', (tester) async {
    await tester.pumpWidget(
      _wrap(user: _teacher, schoolRepository: FakeSchoolRepository(), classroomRepository: FakeClassroomRepository()),
    );
    await tester.pumpAndSettle();

    expect(find.text('screen content'), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(NavigationRail), findsNothing);
  });

  testWidgets(
    'renders the child with no chrome for a plain teacher with only Home to go to (NavigationBar rejects '
    'a single destination)',
    (tester) async {
      _setPhoneSize(tester);
      final classroomRepository = FakeClassroomRepository();
      await classroomRepository.createClassroom(name: '3rd Grade', ownerUid: _teacher.uid);

      await tester.pumpWidget(
        _wrap(user: _teacher, schoolRepository: FakeSchoolRepository(), classroomRepository: classroomRepository),
      );
      await tester.pumpAndSettle();

      expect(find.text('screen content'), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing);
      expect(find.byType(NavigationRail), findsNothing);
    },
  );

  testWidgets('shows Home, Students, and School on a bottom nav bar for an admin', (tester) async {
    _setPhoneSize(tester);
    final schoolRepository = FakeSchoolRepository();
    await _foundSchool(schoolRepository, _admin);

    await tester.pumpWidget(
      _wrap(user: _admin, schoolRepository: schoolRepository, classroomRepository: FakeClassroomRepository()),
    );
    await tester.pumpAndSettle();

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Students'), findsOneWidget);
    expect(find.text('School'), findsOneWidget);
  });

  testWidgets('uses a NavigationRail instead of a bottom bar at tablet width', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(900, 1024);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final schoolRepository = FakeSchoolRepository();
    await _foundSchool(schoolRepository, _admin);

    await tester.pumpWidget(
      _wrap(user: _admin, schoolRepository: schoolRepository, classroomRepository: FakeClassroomRepository()),
    );
    await tester.pumpAndSettle();

    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
  });

  testWidgets('marks Students as selected when currentPath is /students', (tester) async {
    _setPhoneSize(tester);
    final schoolRepository = FakeSchoolRepository();
    await _foundSchool(schoolRepository, _admin);

    await tester.pumpWidget(
      _wrap(
        user: _admin,
        schoolRepository: schoolRepository,
        classroomRepository: FakeClassroomRepository(),
        currentPath: '/students',
      ),
    );
    await tester.pumpAndSettle();

    final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
    expect(navBar.selectedIndex, 1);
  });
}
