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

class SchoolMember {
  const SchoolMember({
    required this.uid,
    required this.role,
    required this.displayName,
    required this.email,
    this.scope,
  });

  final String uid;
  final MemberRole role;
  final String displayName;
  final String email;
  final MemberScope? scope;
}

/// Doc ID is the invitee's lowercased email. Claimed automatically the
/// first time that email signs in, on whichever platform they use.
class PendingInvite {
  const PendingInvite({
    required this.email,
    required this.schoolId,
    required this.role,
    this.scope,
  });

  final String email;
  final String schoolId;
  final MemberRole role;
  final MemberScope? scope;
}
