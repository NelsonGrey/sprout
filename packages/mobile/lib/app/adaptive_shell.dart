import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/app/capabilities.dart';
import 'package:sprout/app/feature_flags.dart';
import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/design_system/sprout_theme.dart';

class _NavDestinationSpec {
  const _NavDestinationSpec({
    required this.icon,
    required this.label,
    required this.path,
  });

  final IconData icon;
  final String label;
  final String path;
}

List<_NavDestinationSpec> _destinationsFor(Capabilities capabilities) => [
  const _NavDestinationSpec(icon: Icons.home_rounded, label: 'Home', path: '/'),
  if (isFeatureEnabled(AppFeature.authenticatedLearning))
    const _NavDestinationSpec(
      icon: Icons.menu_book_rounded,
      label: 'Learn',
      path: '/learn',
    ),
  if (capabilities.canViewAllSchoolStudents)
    const _NavDestinationSpec(
      icon: Icons.groups_rounded,
      label: 'Students',
      path: '/students',
    ),
  if (capabilities.canManageStaff)
    const _NavDestinationSpec(
      icon: Icons.school_rounded,
      label: 'School',
      path: '/school',
    ),
];

/// Role-aware navigation chrome wrapping Home/Students/School — the native
/// mirror of packages/web/src/components/layout/Sidebar.tsx (see
/// app/capabilities.dart), using the same three destinations because those
/// are the only current top-level routes with a persistent-nav destination
/// (classroom/student detail and the promote/archive/import flows stay
/// full-screen, matching 03_NATIVE_MOBILE_APPS.md's M-CLASS-03 "full-screen
/// detail" and M-SCHOOL-05 sub-flows).
///
/// Renders [child] with no chrome at all for an account with no staff
/// access (student-only), matching Sidebar's `hasAnyStaffAccess` gate and
/// preserving the "no navigation elsewhere" constraint from BR-1.3.3/1.4.1.
///
/// Width thresholds match [SproutLayout] / 03_NATIVE_MOBILE_APPS.md §1:
/// <600 a bottom [NavigationBar]; 600–839 a compact icon-only
/// [NavigationRail]; 840+ an extended labeled rail.
class AdaptiveShell extends StatelessWidget {
  const AdaptiveShell({
    super.key,
    required this.classroomRepository,
    required this.schoolRepository,
    required this.user,
    required this.currentPath,
    required this.child,
  });

  final ClassroomRepository classroomRepository;
  final SchoolRepository schoolRepository;
  final AppUser user;
  final String currentPath;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<String>>(
      stream: schoolRepository.schoolIdsForUser(user.uid),
      builder: (context, schoolIdsSnapshot) {
        final schoolIds = schoolIdsSnapshot.data ?? const <String>[];
        return StreamBuilder<List<ClassroomContext>>(
          stream: classroomRepository.myClassrooms(user.uid),
          builder: (context, classroomsSnapshot) {
            final ownClassroomCount =
                (classroomsSnapshot.data ?? const <ClassroomContext>[]).length;

            if (schoolIds.isEmpty) {
              final capabilities = deriveCapabilities(
                memberRole: null,
                hasSchoolMembership: false,
                ownClassroomCount: ownClassroomCount,
              );
              return _AdaptiveShellChrome(
                capabilities: capabilities,
                currentPath: currentPath,
                child: child,
              );
            }

            final schoolId = schoolIds.first;
            return StreamBuilder<SchoolMember?>(
              stream: schoolRepository.myMembership(schoolId, user.uid),
              builder: (context, memberSnapshot) {
                final capabilities = deriveCapabilities(
                  memberRole: memberSnapshot.data?.role,
                  hasSchoolMembership: true,
                  ownClassroomCount: ownClassroomCount,
                );
                return _AdaptiveShellChrome(
                  capabilities: capabilities,
                  currentPath: currentPath,
                  child: child,
                );
              },
            );
          },
        );
      },
    );
  }
}

class _AdaptiveShellChrome extends StatelessWidget {
  const _AdaptiveShellChrome({
    required this.capabilities,
    required this.currentPath,
    required this.child,
  });

  final Capabilities capabilities;
  final String currentPath;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!capabilities.hasAnyStaffAccess) return child;

    final destinations = _destinationsFor(capabilities);
    // A single destination (the common case: a plain teacher who sees only
    // Home) has nowhere else to switch to — Material's NavigationBar
    // actively rejects fewer than two destinations, and a one-item rail is
    // equally pointless chrome. Render the screen directly, same as the
    // no-staff-access case above.
    if (destinations.length < 2) return child;
    final selectedIndex = destinations.indexWhere((d) => d.path == currentPath);
    final index = selectedIndex == -1 ? 0 : selectedIndex;

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;

        if (width < SproutLayout.phoneBreakpoint) {
          return Scaffold(
            body: child,
            bottomNavigationBar: NavigationBar(
              selectedIndex: index,
              onDestinationSelected: (i) => context.go(destinations[i].path),
              destinations: [
                for (final d in destinations)
                  NavigationDestination(icon: Icon(d.icon), label: d.label),
              ],
            ),
          );
        }

        final extended = width >= SproutLayout.tabletBreakpoint;
        return Scaffold(
          body: Row(
            children: [
              NavigationRail(
                extended: extended,
                labelType: extended ? null : NavigationRailLabelType.none,
                selectedIndex: index,
                onDestinationSelected: (i) => context.go(destinations[i].path),
                destinations: [
                  for (final d in destinations)
                    NavigationRailDestination(
                      icon: Icon(d.icon),
                      label: Text(d.label),
                    ),
                ],
              ),
              const VerticalDivider(width: 1),
              Expanded(child: child),
            ],
          ),
        );
      },
    );
  }
}
