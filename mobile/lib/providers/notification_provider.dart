import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/app_notification.dart';
import 'auth_provider.dart';

final notificationsProvider = FutureProvider.autoDispose<List<AppNotification>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final res = await api.get('/notifications');
  final list = res.data['data'] as List<dynamic>;
  return list.map((item) => AppNotification.fromJson(item as Map<String, dynamic>)).toList();
});

class NotificationNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;

  NotificationNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<void> markAsRead(int notificationId) async {
    final api = _ref.read(apiServiceProvider);
    try {
      await api.patch('/notifications/$notificationId/read');
      _ref.invalidate(notificationsProvider);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> markAllAsRead() async {
    final api = _ref.read(apiServiceProvider);
    try {
      await api.patch('/notifications/read-all');
      _ref.invalidate(notificationsProvider);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final notificationOperationsProvider = StateNotifierProvider<NotificationNotifier, AsyncValue<void>>((ref) {
  return NotificationNotifier(ref);
});
