import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class RatingBadge extends StatelessWidget {
  final double rating;
  final int? reviewCount;
  final bool isCompact;

  const RatingBadge({
    super.key,
    required this.rating,
    this.reviewCount,
    this.isCompact = false,
  });

  @override
  Widget build(BuildContext context) {
    final displayRating = rating > 0 ? rating.toStringAsFixed(1) : 'New';

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: EdgeInsets.symmetric(
            horizontal: isCompact ? 6 : 8,
            vertical: isCompact ? 3 : 4,
          ),
          decoration: BoxDecoration(
            color: const Color(0xFFFEF3C7), // Warm light amber
            borderRadius: BorderRadius.circular(6),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.star_rounded, size: 14, color: AppColors.starRating),
              const SizedBox(width: 3),
              Text(
                displayRating,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF92400E), // Amber text
                ),
              ),
            ],
          ),
        ),
        if (reviewCount != null && reviewCount! > 0) ...[
          const SizedBox(width: 6),
          Text(
            '($reviewCount reviews)',
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ],
    );
  }
}
