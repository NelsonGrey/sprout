/// A school in the security matrix (BR-1.3.11/1.3.12). See firestore.rules
/// for the enforcement side of this model. `founderUid`/`superAdminCount`
/// are rules bootstrap/invariant plumbing, not app-facing — deliberately
/// not modeled here; [SchoolRepository] writes them directly.
class School {
  const School({required this.id, required this.name});

  final String id;
  final String name;
}

/// Hierarchical delegation: only a super_admin can create/remove another
/// super_admin or an admin. A school is never left without at least one
/// super_admin (enforced in firestore.rules, not just the UI).
enum MemberRole { superAdmin, admin, teacher }

enum MemberScopeType { own, grades, school }

/// Meaningless for admins (implicit whole-school access). For teachers:
/// [MemberScopeType.own] = only classrooms they directly own (the default);
/// [MemberScopeType.grades] = any classroom in the school whose gradeLevel
/// is in [grades]; [MemberScopeType.school] = every classroom in the school
/// (the PE/art/music case).
class MemberScope {
  const MemberScope.own() : type = MemberScopeType.own, grades = const [];
  const MemberScope.grades(this.grades) : type = MemberScopeType.grades;
  const MemberScope.school() : type = MemberScopeType.school, grades = const [];
  const MemberScope({required this.type, this.grades = const []});

  final MemberScopeType type;
  final List<String> grades;

  Map<String, dynamic> toJson() => {
        'type': type.name,
        if (type == MemberScopeType.grades) 'grades': grades,
      };

  static MemberScope fromJson(Map<String, dynamic> json) {
    final typeName = json['type'] as String;
    switch (typeName) {
      case 'grades':
        return MemberScope.grades(List<String>.from(json['grades'] as List? ?? const []));
      case 'school':
        return const MemberScope.school();
      default:
        return const MemberScope.own();
    }
  }
}

/// 'award' = record earn/spend transactions only; 'manage' = full
/// rename/delete/roster rights, same as the classroom's owner. Only ever
/// set via an admin approving an [AccessRequest] (or an admin editing it
/// directly) — an owner can only propose, never grant directly.
enum ClassroomGrantLevel { award, manage }

ClassroomGrantLevel _grantLevelFromJson(String value) =>
    value == 'manage' ? ClassroomGrantLevel.manage : ClassroomGrantLevel.award;

class SchoolMember {
  const SchoolMember({
    required this.uid,
    required this.role,
    required this.displayName,
    required this.email,
    this.firstName,
    this.lastName,
    this.staffId,
    this.scope,
    this.classroomGrants = const {},
  });

  final String uid;
  final MemberRole role;
  final String displayName;
  final String email;

  /// Pure supplementary roster metadata (manual edit or CSV import) —
  /// never overwrites displayName, never consulted by the invite/claim
  /// identity logic. displayName (auth-provider-sourced) stays the one
  /// authoritative name.
  final String? firstName;
  final String? lastName;
  final String? staffId;

  final MemberScope? scope;

  /// contextId -> grant level, for classrooms this member doesn't own and
  /// whose grade/scope wouldn't otherwise cover.
  final Map<String, ClassroomGrantLevel> classroomGrants;

  SchoolMember copyWith({MemberScope? scope, Map<String, ClassroomGrantLevel>? classroomGrants}) =>
      SchoolMember(
        uid: uid,
        role: role,
        displayName: displayName,
        email: email,
        firstName: firstName,
        lastName: lastName,
        staffId: staffId,
        scope: scope ?? this.scope,
        classroomGrants: classroomGrants ?? this.classroomGrants,
      );

  static Map<String, ClassroomGrantLevel> classroomGrantsFromJson(Object? value) {
    if (value is! Map) return const {};
    return value.map((key, v) => MapEntry(key as String, _grantLevelFromJson(v as String)));
  }
}

/// Doc ID is the invitee's lowercased email. Claimed automatically the
/// first time that email signs in, on whichever platform they use.
class PendingInvite {
  const PendingInvite({
    required this.email,
    required this.schoolId,
    required this.role,
    this.scope,
    this.firstName,
    this.lastName,
    this.staffId,
  });

  final String email;
  final String schoolId;
  final MemberRole role;
  final MemberScope? scope;
  final String? firstName;
  final String? lastName;
  final String? staffId;
}

/// Doc ID is the target student's real school email, lowercased. Created
/// by staff with manage access to the named student's classroom; claimed
/// automatically the first time that email signs in — mirrors
/// [PendingInvite], except the claim writes onto an EXISTING
/// students/{studentId} doc rather than creating a new doc under the
/// claimant's own uid. Deliberately carries no contextId/schoolId — those
/// are derived from studentId itself so there's no spoofable field for a
/// caller to lie about which classroom they manage.
class PendingStudentLink {
  const PendingStudentLink({
    required this.email,
    required this.studentId,
    required this.invitedByUid,
  });

  final String email;
  final String studentId;
  final String invitedByUid;
}

enum AccessRequestStatus { pending, approved, declined }

AccessRequestStatus _accessRequestStatusFromJson(String value) {
  switch (value) {
    case 'approved':
      return AccessRequestStatus.approved;
    case 'declined':
      return AccessRequestStatus.declined;
    default:
      return AccessRequestStatus.pending;
  }
}

/// A classroom owner's request that a colleague (an existing active
/// teacher member of the school) get 'award' or 'manage' access to
/// specifically their classroom — fulfilled only by an admin/super_admin,
/// who writes the resulting grant onto the target's classroomGrants. Keeps
/// "only admins/super_admins grant access" intact: an owner can only
/// propose.
class AccessRequest {
  const AccessRequest({
    required this.id,
    required this.schoolId,
    required this.contextId,
    required this.contextName,
    required this.requestedByUid,
    required this.requestedByDisplayName,
    required this.targetUid,
    required this.targetDisplayName,
    required this.level,
    required this.status,
    this.resolvedByUid,
  });

  final String id;
  final String schoolId;
  final String contextId;
  final String contextName;
  final String requestedByUid;
  final String requestedByDisplayName;
  final String targetUid;
  final String targetDisplayName;
  final ClassroomGrantLevel level;
  final AccessRequestStatus status;
  final String? resolvedByUid;

  AccessRequest copyWith({AccessRequestStatus? status, String? resolvedByUid}) => AccessRequest(
        id: id,
        schoolId: schoolId,
        contextId: contextId,
        contextName: contextName,
        requestedByUid: requestedByUid,
        requestedByDisplayName: requestedByDisplayName,
        targetUid: targetUid,
        targetDisplayName: targetDisplayName,
        level: level,
        status: status ?? this.status,
        resolvedByUid: resolvedByUid ?? this.resolvedByUid,
      );

  static AccessRequestStatus statusFromJson(String value) => _accessRequestStatusFromJson(value);
  static ClassroomGrantLevel levelFromJson(String value) => _grantLevelFromJson(value);
}
