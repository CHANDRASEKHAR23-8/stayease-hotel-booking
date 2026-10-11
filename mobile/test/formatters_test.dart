import 'package:flutter_test/flutter_test.dart';
import 'package:stayease_mobile/core/utils/date_formatters.dart';

void main() {
  group('DateFormatters Unit Tests', () {
    test('formatCurrency formats USD amounts properly', () {
      expect(DateFormatters.formatCurrency(150), '\$150.00');
      expect(DateFormatters.formatCurrency(1294.72), '\$1,294.72');
      expect(DateFormatters.formatCurrency(0), '\$0.00');
      expect(DateFormatters.formatCurrency(null), '\$0.00');
    });

    test('formatDate formats ISO strings and DateTime', () {
      final dt = DateTime(2026, 10, 15);
      expect(DateFormatters.formatDate(dt), 'Oct 15, 2026');
      expect(DateFormatters.formatDate('2026-10-15'), 'Oct 15, 2026');
    });

    test('calculateNights calculates difference in days', () {
      final start = DateTime(2026, 10, 15);
      final end = DateTime(2026, 10, 19);
      expect(DateFormatters.calculateNights(start, end), 4);
    });

    test('toIsoDate outputs YYYY-MM-DD', () {
      final dt = DateTime(2026, 12, 25);
      expect(DateFormatters.toIsoDate(dt), '2026-12-25');
    });
  });
}
