import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/services/school/fake_school_repository.dart';

/// Confirms the self-service account deletion methods added to
/// [FakeSchoolRepository] behave correctly — see delete_account_screen.dart
/// for the caller (self-service only, never for someone else's uid).
void main() {
  test('removeSchoolIdForSelf removes only the given school from the given user', () async {
    final repository = FakeSchoolRepository();
    final schoolA = await repository.createSchool(name: 'School A', founderUid: 'user-1');
    final schoolB = await repository.createSchool(name: 'School B', founderUid: 'user-1');

    await repository.removeSchoolIdForSelf(schoolA.id, 'user-1');

    final remaining = await repository.schoolIdsForUser('user-1').first;
    expect(remaining, [schoolB.id]);
  });

  test('removeSchoolIdForSelf is a no-op if the user has no schoolIds at all', () async {
    final repository = FakeSchoolRepository();
    await repository.removeSchoolIdForSelf('some-school', 'stranger-uid');
    final remaining = await repository.schoolIdsForUser('stranger-uid').first;
    expect(remaining, isEmpty);
  });

  test('deleteUserProfile clears every schoolId recorded for that user', () async {
    final repository = FakeSchoolRepository();
    await repository.createSchool(name: 'School A', founderUid: 'user-1');
    await repository.createSchool(name: 'School B', founderUid: 'user-1');

    await repository.deleteUserProfile('user-1');

    final remaining = await repository.schoolIdsForUser('user-1').first;
    expect(remaining, isEmpty);
  });
}
