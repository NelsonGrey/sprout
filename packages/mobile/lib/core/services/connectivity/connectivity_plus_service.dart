import 'package:connectivity_plus/connectivity_plus.dart';

import 'package:sprout/core/services/connectivity/connectivity_service.dart';

bool _isOnline(List<ConnectivityResult> results) => results.any((r) => r != ConnectivityResult.none);

class ConnectivityPlusService implements ConnectivityService {
  ConnectivityPlusService({Connectivity? connectivity}) : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  @override
  Future<bool> get isOnline async => _isOnline(await _connectivity.checkConnectivity());

  @override
  Stream<bool> get onConnectivityChanged => _connectivity.onConnectivityChanged.map(_isOnline);
}
