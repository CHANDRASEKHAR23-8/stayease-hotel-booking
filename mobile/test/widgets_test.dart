import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayease_mobile/core/widgets/custom_button.dart';
import 'package:stayease_mobile/core/widgets/custom_text_field.dart';
import 'package:stayease_mobile/core/widgets/rating_badge.dart';
import 'package:stayease_mobile/core/widgets/state_views.dart';

void main() {
  Widget wrapWidget(Widget child) {
    return MaterialApp(
      home: Scaffold(
        body: child,
      ),
    );
  }

  group('Core Widget Tests', () {
    testWidgets('CustomButton displays text and triggers callback', (WidgetTester tester) async {
      bool tapped = false;

      await tester.pumpWidget(wrapWidget(
        CustomButton(
          text: 'Confirm Booking',
          onPressed: () => tapped = true,
        ),
      ));

      expect(find.text('Confirm Booking'), findsOneWidget);

      await tester.tap(find.text('Confirm Booking'));
      expect(tapped, true);
    });

    testWidgets('CustomButton shows loading indicator when isLoading is true', (WidgetTester tester) async {
      await tester.pumpWidget(wrapWidget(
        CustomButton(
          text: 'Submit',
          isLoading: true,
          onPressed: () {},
        ),
      ));

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Submit'), findsNothing);
    });

    testWidgets('RatingBadge displays numeric rating and review count', (WidgetTester tester) async {
      await tester.pumpWidget(wrapWidget(
        const RatingBadge(rating: 4.8, reviewCount: 120),
      ));

      expect(find.text('4.8'), findsOneWidget);
      expect(find.text('(120 reviews)'), findsOneWidget);
      expect(find.byIcon(Icons.star_rounded), findsOneWidget);
    });

    testWidgets('EmptyStateView displays title, description, and calls action', (WidgetTester tester) async {
      bool actionTriggered = false;

      await tester.pumpWidget(wrapWidget(
        EmptyStateView(
          title: 'No hotels found',
          description: 'Try adjusting your search criteria.',
          actionText: 'Reset Filters',
          onAction: () => actionTriggered = true,
        ),
      ));

      expect(find.text('No hotels found'), findsOneWidget);
      expect(find.text('Try adjusting your search criteria.'), findsOneWidget);
      expect(find.text('Reset Filters'), findsOneWidget);

      await tester.tap(find.text('Reset Filters'));
      expect(actionTriggered, true);
    });

    testWidgets('ErrorStateView displays error message and triggers retry', (WidgetTester tester) async {
      bool retried = false;

      await tester.pumpWidget(wrapWidget(
        ErrorStateView(
          message: 'Network connection failed',
          onRetry: () => retried = true,
        ),
      ));

      expect(find.text('Network connection failed'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);

      await tester.tap(find.text('Try Again'));
      expect(retried, true);
    });

    testWidgets('CustomTextField accepts input and validates', (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(wrapWidget(
        CustomTextField(
          label: 'Email',
          hint: 'Enter your email',
          controller: controller,
        ),
      ));

      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Enter your email'), findsOneWidget);

      await tester.enterText(find.byType(TextFormField), 'test@example.com');
      expect(controller.text, 'test@example.com');
    });
  });
}
