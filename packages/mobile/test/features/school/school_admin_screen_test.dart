import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/school/fake_school_repository.dart';
import 'package:sprout/features/school/school_admin_screen.dart';

const _superAdmin = AppUser(uid: 'super-admin-1', displayName: 'Principal Lee', email: 'lee@example.com');
const _delegate = AppUser(uid: 'delegate-1', displayName: 'Office Manager', email: 'om@example.com');
const _teacher = AppUser(uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com');

Future<String> _foundSchool(FakeSchoolRepository repository, AppUser founder) async {
  final school = await repository.createSchool(
    name: 'Riverside Elementary',
    founderUid: founder.uid,
    founderDisplayName: founder.displayName,
    founderEmail: founder.email,
  );
  return school.id;
}

Future<void> _addMember(
  FakeSchoolRepository repository,
  String schoolId,
  AppUser user,
  MemberRole role, {
  MemberScope? scope,
}) async {
  await repository.inviteMember(
    schoolId: schoolId,
    email: user.email!,
    role: role,
    scope: scope,
    invitedByUid: 'someone',
  );
  await repository.claimPendingInviteIfAny(uid: user.uid, email: user.email!, displayName: user.displayName);
}

void main() {
  testWidgets('shows a plain teacher their own role and scope, with no admin tooling', (tester) async {
    final repository = FakeSchoolRepository();
    final schoolId = await _foundSchool(repository, _superAdmin);
    await _addMember(repository, schoolId, _teacher, MemberRole.teacher,
        scope: const MemberScope.grades(['3', '4']));

    await tester.pumpWidget(MaterialApp(
      home: SchoolAdminScreen(schoolRepository: repository, user: _teacher, schoolId: schoolId),
    ));
    await tester.pumpAndSettle();

    expect(find.textContaining('Teacher — Grades: 3, 4'), findsOneWidget);
    expect(find.text('Invite a teacher'), findsNothing);
    expect(find.text('Delegate admin access'), findsNothing);
  });

  testWidgets('lets a delegate admin invite a teacher but not another admin', (tester) async {
    final repository = FakeSchoolRepository();
    final schoolId = await _foundSchool(repository, _superAdmin);
    await _addMember(repository, schoolId, _delegate, MemberRole.admin);

    await tester.pumpWidget(MaterialApp(
      home: SchoolAdminScreen(schoolRepository: repository, user: _delegate, schoolId: schoolId),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Invite a teacher'), findsOneWidget);
    expect(find.text('Delegate admin access'), findsNothing);

    tester.widget<TextField>(find.byKey(const Key('inviteTeacherEmailField'))).controller!.text =
        'new@example.com';
    final sendButton =
        tester.widget<ElevatedButton>(find.byKey(const Key('sendTeacherInviteButton')));
    sendButton.onPressed!();
    await tester.pumpAndSettle();

    final invites = await repository.pendingInvitesForSchool(schoolId).first;
    expect(invites.any((i) => i.email == 'new@example.com' && i.role == MemberRole.teacher), isTrue);
  });

  testWidgets('lets a super admin see the delegate-admin section', (tester) async {
    final repository = FakeSchoolRepository();
    final schoolId = await _foundSchool(repository, _superAdmin);

    await tester.pumpWidget(MaterialApp(
      home: SchoolAdminScreen(schoolRepository: repository, user: _superAdmin, schoolId: schoolId),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Delegate admin access'), findsOneWidget);
  });

  testWidgets('hides the remove button for the sole remaining super admin', (tester) async {
    final repository = FakeSchoolRepository();
    final schoolId = await _foundSchool(repository, _superAdmin);
    await _addMember(repository, schoolId, _delegate, MemberRole.admin);

    await tester.pumpWidget(MaterialApp(
      home: SchoolAdminScreen(schoolRepository: repository, user: _superAdmin, schoolId: schoolId),
    ));
    await tester.pumpAndSettle();

    // Only the admin gets a Remove button — the sole super admin (including
    // self) can't be removed.
    expect(find.text('Remove'), findsOneWidget);
  });

  testWidgets('lets a super admin rename the school', (tester) async {
    final repository = FakeSchoolRepository();
    final schoolId = await _foundSchool(repository, _superAdmin);

    await tester.pumpWidget(MaterialApp(
      home: SchoolAdminScreen(schoolRepository: repository, user: _superAdmin, schoolId: schoolId),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Riverside Elementary'), findsOneWidget);

    final renameButton = tester.widget<IconButton>(find.byKey(const Key('renameSchoolButton')));
    renameButton.onPressed!();
    await tester.pumpAndSettle();

    tester.widget<TextField>(find.byKey(const Key('renameSchoolField'))).controller!.text =
        'Lakeside Elementary';
    final saveButton = tester.widget<TextButton>(find.byKey(const Key('saveSchoolNameButton')));
    saveButton.onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Lakeside Elementary'), findsOneWidget);
    expect((await repository.getSchool(schoolId))?.name, 'Lakeside Elementary');
  });

  testWidgets('does not let a plain admin rename the school', (tester) async {
    final repository = FakeSchoolRepository();
    final schoolId = await _foundSchool(repository, _superAdmin);
    await _addMember(repository, schoolId, _delegate, MemberRole.admin);

    await tester.pumpWidget(MaterialApp(
      home: SchoolAdminScreen(schoolRepository: repository, user: _delegate, schoolId: schoolId),
    ));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('renameSchoolButton')), findsNothing);
  });

  testWidgets('lets a delegate admin edit a teacher scope', (tester) async {
    final repository = FakeSchoolRepository();
    final schoolId = await _foundSchool(repository, _superAdmin);
    await _addMember(repository, schoolId, _delegate, MemberRole.admin);
    await _addMember(repository, schoolId, _teacher, MemberRole.teacher, scope: const MemberScope.own());

    await tester.pumpWidget(MaterialApp(
      home: SchoolAdminScreen(schoolRepository: repository, user: _delegate, schoolId: schoolId),
    ));
    await tester.pumpAndSettle();

    final editButton =
        tester.widget<IconButton>(find.byKey(Key('editScopeButton-${_teacher.uid}')));
    editButton.onPressed!();
    await tester.pumpAndSettle();

    // Whole school radio inside the inline scope editor — the Staff row
    // editor renders before the (always-visible) Invite-a-teacher
    // ScopePicker, so take the first match. Invoke the callback directly
    // rather than tester.tap() (documented gesture-simulation hang in this
    // sandbox).
    final wholeSchoolRadio = tester
        .widgetList<RadioListTile<MemberScopeType>>(find.byWidgetPredicate(
          (w) => w is RadioListTile<MemberScopeType> && w.value == MemberScopeType.school,
        ))
        .first;
    wholeSchoolRadio.onChanged!(MemberScopeType.school);
    await tester.pumpAndSettle();

    final saveButton = tester.widget<TextButton>(find.byKey(const Key('saveScopeButton')));
    saveButton.onPressed!();
    await tester.pumpAndSettle();

    final member = await repository.myMembership(schoolId, _teacher.uid).first;
    expect(member?.scope?.type, MemberScopeType.school);
  });

  testWidgets('lets an admin approve or decline a pending access request', (tester) async {
    final repository = FakeSchoolRepository();
    final schoolId = await _foundSchool(repository, _superAdmin);
    await _addMember(repository, schoolId, _delegate, MemberRole.admin);
    await _addMember(repository, schoolId, _teacher, MemberRole.teacher, scope: const MemberScope.own());
    await repository.createAccessRequest(
      schoolId: schoolId,
      contextId: 'ctx-1',
      contextName: '4th Grade',
      requestedByUid: 'owner-1',
      requestedByDisplayName: 'Ms. Owner',
      targetUid: _teacher.uid,
      targetDisplayName: _teacher.displayName!,
      level: ClassroomGrantLevel.manage,
    );

    await tester.pumpWidget(MaterialApp(
      home: SchoolAdminScreen(schoolRepository: repository, user: _delegate, schoolId: schoolId),
    ));
    await tester.pumpAndSettle();

    expect(find.textContaining('Ms. Owner wants Ms. Lord to have manage access to 4th Grade'), findsOneWidget);

    final requests = await repository.pendingAccessRequestsForSchool(schoolId).first;
    final requestId = requests.first.id;

    final approveButton =
        tester.widget<TextButton>(find.byKey(Key('approveRequestButton-$requestId')));
    approveButton.onPressed!();
    await tester.pumpAndSettle();

    final member = await repository.myMembership(schoolId, _teacher.uid).first;
    expect(member?.classroomGrants['ctx-1'], ClassroomGrantLevel.manage);

    final remaining = await repository.pendingAccessRequestsForSchool(schoolId).first;
    expect(remaining, isEmpty);
  });

  testWidgets("lets an admin revoke a teacher's classroom grant", (tester) async {
    final repository = FakeSchoolRepository();
    final schoolId = await _foundSchool(repository, _superAdmin);
    await _addMember(repository, schoolId, _delegate, MemberRole.admin);
    await _addMember(repository, schoolId, _teacher, MemberRole.teacher, scope: const MemberScope.own());
    await repository.approveAccessRequest(
      AccessRequest(
        id: 'req-1',
        schoolId: schoolId,
        contextId: 'ctx-1',
        contextName: '4th Grade',
        requestedByUid: 'owner-1',
        requestedByDisplayName: 'Ms. Owner',
        targetUid: _teacher.uid,
        targetDisplayName: _teacher.displayName!,
        level: ClassroomGrantLevel.manage,
        status: AccessRequestStatus.pending,
      ),
      resolvedByUid: _delegate.uid,
    );

    await tester.pumpWidget(MaterialApp(
      home: SchoolAdminScreen(schoolRepository: repository, user: _delegate, schoolId: schoolId),
    ));
    await tester.pumpAndSettle();

    final revokeButton =
        tester.widget<IconButton>(find.byKey(Key('revokeGrantButton-${_teacher.uid}-ctx-1')));
    revokeButton.onPressed!();
    await tester.pumpAndSettle();

    final member = await repository.myMembership(schoolId, _teacher.uid).first;
    expect(member?.classroomGrants.containsKey('ctx-1'), isFalse);
  });
}
