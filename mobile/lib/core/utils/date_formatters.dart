import 'package:intl/intl.dart';

class DateFormatters {
  static final DateFormat _displayFormat = DateFormat('MMM d, yyyy');
  static final DateFormat _shortFormat = DateFormat('MMM d');
  static final DateFormat _isoFormat = DateFormat('yyyy-MM-dd');
  static final NumberFormat _currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

  static String formatDate(dynamic date) {
    if (date == null) return '';
    if (date is String) {
      final parsed = DateTime.tryParse(date);
      return parsed != null ? _displayFormat.format(parsed) : date;
    }
    if (date is DateTime) {
      return _displayFormat.format(date);
    }
    return '';
  }

  static String formatShortDate(dynamic date) {
    if (date == null) return '';
    if (date is String) {
      final parsed = DateTime.tryParse(date);
      return parsed != null ? _shortFormat.format(parsed) : date;
    }
    if (date is DateTime) {
      return _shortFormat.format(date);
    }
    return '';
  }

  static String toIsoDate(DateTime date) {
    return _isoFormat.format(date);
  }

  static String formatCurrency(num? amount) {
    if (amount == null) return '\$0.00';
    return _currencyFormat.format(amount);
  }

  static int calculateNights(DateTime checkIn, DateTime checkOut) {
    return checkOut.difference(checkIn).inDays;
  }
}
