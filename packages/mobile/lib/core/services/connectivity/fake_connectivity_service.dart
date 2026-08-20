import 'dart:async';

import 'package:sprout/core/services/connectivity/connectivity_service.dart';

/// In-memory [ConnectivityService] for widget tests — mirrors
/// FakeAuthService's role for AuthService. Starts online; call [setOnline]
/// to simulate a connectivity change.
class FakeConnectivityService implements ConnectivityService {
  bool _online = true;
  final _controller = StreamController<bool>.broadcast();

  @override
  Future<bool> get isOnline async => _online;

  @override
  Stream<bool> get onConnectivityChanged => _controller.stream;

  void setOnline(bool online) {
    _online = online;
    _controller.add(online);
  }

  void dispose() => _controller.close();
}
