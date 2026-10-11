import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:stayease_mobile/app.dart';
import 'package:stayease_mobile/providers/auth_provider.dart';
import 'package:stayease_mobile/services/storage_service.dart';

void main() {
  testWidgets('StayEaseApp boots and displays SplashScreen', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final storageService = StorageService(prefs);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          storageServiceProvider.overrideWithValue(storageService),
        ],
        child: const StayEaseApp(),
      ),
    );

    expect(find.text('StayEase'), findsOneWidget);

    // Advance splash delay and settle animations
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();
  });
}
