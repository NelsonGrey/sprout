/// Device online/offline state — see 01_EXPERIENCE_FOUNDATIONS.md §8.1's
/// "offline with cache"/"offline without cache" view states and
/// 05_IMPLEMENTATION_HANDOFF.md's Slice 2 stop condition: until real
/// idempotent offline queueing is built and tested, a transaction composer
/// must not accept a submission it can't actually send, or imply queued
/// success. Behind an interface (mirroring AuthService/ClassroomRepository)
/// so screens can be tested against [FakeConnectivityService] without a
/// real platform channel.
abstract class ConnectivityService {
  /// Current state, read once (e.g. for initial widget state).
  Future<bool> get isOnline;

  /// Emits on every connectivity change. Does not necessarily emit an
  /// initial value — callers combine this with [isOnline] for a starting
  /// value, same convention as AuthService.authStateChanges.
  Stream<bool> get onConnectivityChanged;
}
