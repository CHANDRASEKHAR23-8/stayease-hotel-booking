-- =====================================================================
-- STAYEASE HOTEL BOOKING PLATFORM - SEED DATA
-- Default Password for all seed users: Password123!
-- Bcrypt Hash: $2a$10$.Acc/ZQFTLsDz.NLdyv.gOR7PTXuOUyKWlrRfHnVt1ma3lVO3AO1y
-- =====================================================================

USE stayease_db;

-- 1. USERS
INSERT INTO users (id, name, email, password_hash, phone, role, status, avatar_url) VALUES
(1, 'Admin Sarah Jenkins', 'admin@stayease.com', '$2a$10$.Acc/ZQFTLsDz.NLdyv.gOR7PTXuOUyKWlrRfHnVt1ma3lVO3AO1y', '+1-555-0100', 'admin', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'),
(2, 'David Sterling', 'owner1@stayease.com', '$2a$10$.Acc/ZQFTLsDz.NLdyv.gOR7PTXuOUyKWlrRfHnVt1ma3lVO3AO1y', '+1-555-0101', 'owner', 'active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'),
(3, 'Elena Rostova', 'owner2@stayease.com', '$2a$10$.Acc/ZQFTLsDz.NLdyv.gOR7PTXuOUyKWlrRfHnVt1ma3lVO3AO1y', '+1-555-0102', 'owner', 'active', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400'),
(4, 'Michael Scott', 'customer1@stayease.com', '$2a$10$.Acc/ZQFTLsDz.NLdyv.gOR7PTXuOUyKWlrRfHnVt1ma3lVO3AO1y', '+1-555-0103', 'customer', 'active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'),
(5, 'Emma Watson', 'customer2@stayease.com', '$2a$10$.Acc/ZQFTLsDz.NLdyv.gOR7PTXuOUyKWlrRfHnVt1ma3lVO3AO1y', '+1-555-0104', 'customer', 'active', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'),
(6, 'James Miller', 'customer3@stayease.com', '$2a$10$.Acc/ZQFTLsDz.NLdyv.gOR7PTXuOUyKWlrRfHnVt1ma3lVO3AO1y', '+1-555-0105', 'customer', 'active', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. AMENITIES
INSERT INTO amenities (id, name, slug, icon, category) VALUES
(1, 'High-Speed Wi-Fi', 'wifi', 'wifi', 'hotel'),
(2, 'Swimming Pool', 'pool', 'pool', 'hotel'),
(3, 'Spa & Wellness', 'spa', 'spa', 'hotel'),
(4, 'Fitness Center', 'fitness', 'fitness_center', 'hotel'),
(5, 'Fine Dining Restaurant', 'restaurant', 'restaurant', 'hotel'),
(6, 'Cocktail Lounge & Bar', 'bar', 'local_bar', 'hotel'),
(7, 'Complimentary Parking', 'parking', 'local_parking', 'hotel'),
(8, 'Airport Shuttle', 'airport-shuttle', 'airport_shuttle', 'hotel'),
(9, 'Pet Friendly', 'pet-friendly', 'pets', 'hotel'),
(10, '24/7 Concierge', 'concierge', 'room_service', 'hotel'),
(11, 'Beachfront Access', 'beachfront', 'beach_access', 'hotel'),
(12, 'Air Conditioning', 'ac', 'ac_unit', 'room'),
(13, 'Private Balcony', 'balcony', 'balcony', 'room'),
(14, 'Panoramic Ocean View', 'ocean-view', 'water', 'room'),
(15, 'Gourmet Coffee Maker', 'coffee-maker', 'coffee', 'room'),
(16, 'Luxury Bathtub', 'bathtub', 'bathtub', 'room'),
(17, 'Smart Flat-Screen TV', 'smart-tv', 'tv', 'room'),
(18, 'In-Room Safe', 'in-room-safe', 'lock', 'room'),
(19, 'Executive Work Desk', 'work-desk', 'desk', 'room'),
(20, 'Complimentary Mini-Bar', 'mini-bar', 'kitchen', 'room')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 3. HOTELS
INSERT INTO hotels (id, owner_id, name, slug, description, address, city, state, country, postal_code, latitude, longitude, star_rating, average_rating, review_count, status, contact_email, contact_phone, check_in_time, check_out_time, cancellation_policy) VALUES
(1, 2, 'Grand Azure Resort & Spa', 'grand-azure-resort-spa', 'Experience unparalleled seaside luxury with private beach access, world-class dining, and holistic wellness treatments in vibrant Miami Beach.', '1201 Ocean Drive', 'Miami Beach', 'FL', 'United States', '33139', 25.7825453, -80.1313205, 5.0, 4.9, 142, 'approved', 'azure@stayease.com', '+1-305-555-0199', '15:00', '11:00', 'Free cancellation up to 48 hours before check-in. Non-refundable thereafter.'),
(2, 3, 'The Alpine Pinnacle Lodge', 'the-alpine-pinnacle-lodge', 'Nestled high in the Rockies, enjoy ski-in/ski-out access, cozy stone fireplaces, hot tubs, and panoramic snow-capped mountain views.', '450 Aspen Mountain Way', 'Aspen', 'CO', 'United States', '81611', 39.1910983, -106.8175387, 5.0, 4.8, 98, 'approved', 'pinnacle@stayease.com', '+1-970-555-0144', '16:00', '10:00', 'Free cancellation up to 7 days before check-in.'),
(3, 2, 'Skyline Metropolitan Hotel', 'skyline-metropolitan-hotel', 'A sleek architectural masterpiece in Midtown Manhattan with rooftop bar, executive lounge, and walking distance to Central Park.', '780 5th Avenue', 'New York', 'NY', 'United States', '10019', 40.7638445, -73.9729864, 4.5, 4.6, 215, 'approved', 'skyline@stayease.com', '+1-212-555-0177', '15:00', '12:00', 'Free cancellation up to 24 hours before check-in.'),
(4, 3, 'Coastal Serenity Haven', 'coastal-serenity-haven', 'Tranquil coastal resort overlooking the Pacific cliffs. Features heated infinity pools, organic farm-to-table cuisine, and morning yoga.', '2100 Coast Blvd', 'San Diego', 'CA', 'United States', '92037', 32.8426740, -117.2712717, 4.5, 4.7, 86, 'approved', 'serenity@stayease.com', '+1-858-555-0133', '14:00', '11:00', 'Free cancellation up to 48 hours before check-in.'),
(5, 2, 'Emerald Bay Luxury Villas', 'emerald-bay-luxury-villas', 'Exclusive overwater and beachfront villas on the pristine shores of Oahu. A newly submitted sanctuary awaiting platform review.', '3000 Kalakaua Ave', 'Honolulu', 'HI', 'United States', '96815', 21.2612340, -157.8184560, 5.0, 0.0, 0, 'pending_approval', 'emeraldbay@stayease.com', '+1-808-555-0188', '15:00', '11:00', 'Free cancellation up to 5 days before check-in.'),
(6, 3, 'Desert Mirage Oasis', 'desert-mirage-oasis', 'Under-construction desert sanctuary featuring natural mineral springs and luxury casitas.', '7200 E Camelback Rd', 'Scottsdale', 'AZ', 'United States', '85251', 33.5092110, -111.9260560, 4.5, 0.0, 0, 'draft', 'mirage@stayease.com', '+1-480-555-0166', '15:00', '11:00', 'Standard policy.')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 4. HOTEL IMAGES
INSERT INTO hotel_images (id, hotel_id, image_url, caption, is_primary, display_order) VALUES
(1, 1, 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200', 'Grand Azure Main Oceanfront Façade', TRUE, 1),
(2, 1, 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200', 'Ocean Infinity Pool at Sunset', FALSE, 2),
(3, 1, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200', 'Luxury Lobby & Lounge', FALSE, 3),
(4, 2, 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200', 'Alpine Pinnacle Snowside Lodge', TRUE, 1),
(5, 2, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200', 'Cozy Fireside Mountain Lounge', FALSE, 2),
(6, 3, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200', 'Skyline Manhattan Tower View', TRUE, 1),
(7, 3, 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200', 'Executive City View Suite', FALSE, 2),
(8, 4, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200', 'Coastal Haven Sunset Terrace', TRUE, 1),
(9, 5, 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200', 'Emerald Bay Beachfront Villa', TRUE, 1)
ON DUPLICATE KEY UPDATE caption=VALUES(caption);

-- 5. HOTEL AMENITIES
INSERT INTO hotel_amenities (hotel_id, amenity_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 10), (1, 11),
(2, 1), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 10),
(3, 1), (3, 4), (3, 5), (3, 6), (3, 10),
(4, 1), (4, 2), (4, 3), (4, 5), (4, 7), (4, 11),
(5, 1), (5, 2), (5, 3), (5, 5), (5, 11)
ON DUPLICATE KEY UPDATE hotel_id=VALUES(hotel_id);

-- 6. ROOMS
INSERT INTO rooms (id, hotel_id, room_name, room_type, description, base_price, max_guests, total_inventory, is_active, size_sqm, bed_type) VALUES
(1, 1, 'Ocean Deluxe King Room', 'deluxe', 'Spacious room with uninterrupted Atlantic views, marble bathroom, and plush king bed.', 289.00, 2, 8, TRUE, 42, '1 King Bed'),
(2, 1, 'Azure Presidential Suite', 'suite', 'Two-bedroom oceanfront haven with private plunge pool, dining room, and butler service.', 649.00, 4, 3, TRUE, 95, '2 King Beds'),
(3, 1, 'Classic Palms Double', 'double', 'Sunlit room overlooking tropical gardens with two comfortable queen beds.', 219.00, 4, 10, TRUE, 36, '2 Queen Beds'),

(4, 2, 'Pinnacle Fireplace King', 'deluxe', 'Rustic luxury room featuring real stone fireplace, pine wood accents, and heated floors.', 340.00, 2, 6, TRUE, 45, '1 King Bed'),
(5, 2, 'Alpine Summit Chalet Suite', 'suite', 'Two-level suite with loft bedroom, private hot tub on terrace, and mountain vistas.', 580.00, 5, 2, TRUE, 88, '1 King Bed + 2 Singles'),

(6, 3, 'Manhattan Classic Queen', 'double', 'Modern, acoustically insulated city retreat with high-speed desk workspace.', 229.00, 2, 15, TRUE, 30, '1 Queen Bed'),
(7, 3, 'Skyline Corner Suite', 'suite', 'Floor-to-ceiling glass wrapping around Manhattan cityscape with deep soaking tub.', 450.00, 3, 5, TRUE, 65, '1 King Bed + Sofa Bed'),

(8, 4, 'Sunset Cliff King Balcony', 'deluxe', 'Overlooking the Pacific surf with private teak balcony and artisan organic amenities.', 295.00, 2, 7, TRUE, 40, '1 King Bed'),
(9, 4, 'Pacific Family Retreat', 'family', 'Spacious dual-room layout ideal for families with direct garden path to the shoreline.', 420.00, 4, 4, TRUE, 72, '1 King Bed + 2 Twin Beds'),

(10, 5, 'Overwater Paradise Villa', 'penthouse', 'Direct ocean lagoon access, glass floor view panels, and private wrap-around sundeck.', 890.00, 2, 4, TRUE, 120, '1 California King')
ON DUPLICATE KEY UPDATE room_name=VALUES(room_name);

-- 7. ROOM IMAGES
INSERT INTO room_images (id, room_id, image_url, caption, is_primary, display_order) VALUES
(1, 1, 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1000', 'Ocean Deluxe King Bedroom', TRUE, 1),
(2, 2, 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=1000', 'Presidential Suite Master Living Space', TRUE, 1),
(3, 3, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1000', 'Classic Palms Double Bedroom', TRUE, 1),
(4, 4, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1000', 'Pinnacle Fireplace King', TRUE, 1),
(5, 5, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1000', 'Alpine Summit Chalet Suite', TRUE, 1),
(6, 6, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1000', 'Manhattan Classic Queen', TRUE, 1),
(7, 7, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1000', 'Skyline Corner Suite Living & Bed Area', TRUE, 1),
(8, 8, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1000', 'Sunset Cliff Balcony Room', TRUE, 1),
(9, 10, 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1000', 'Overwater Paradise Villa', TRUE, 1)
ON DUPLICATE KEY UPDATE caption=VALUES(caption);

-- 8. ROOM AMENITIES
INSERT INTO room_amenities (room_id, amenity_id) VALUES
(1, 12), (1, 13), (1, 14), (1, 15), (1, 16), (1, 17), (1, 18), (1, 20),
(2, 12), (2, 13), (2, 14), (2, 15), (2, 16), (2, 17), (2, 18), (2, 19), (2, 20),
(3, 12), (3, 15), (3, 17), (3, 18),
(4, 12), (4, 13), (4, 15), (4, 16), (4, 17), (4, 18), (4, 19),
(5, 12), (5, 13), (5, 15), (5, 16), (5, 17), (5, 18), (5, 20),
(6, 12), (6, 15), (6, 17), (6, 18), (6, 19),
(7, 12), (7, 15), (7, 16), (7, 17), (7, 18), (7, 19), (7, 20),
(8, 12), (8, 13), (8, 14), (8, 15), (8, 16), (8, 17), (8, 18)
ON DUPLICATE KEY UPDATE room_id=VALUES(room_id);

-- 9. BOOKINGS
INSERT INTO bookings (id, booking_reference, user_id, hotel_id, room_id, check_in_date, check_out_date, total_rooms, total_guests, total_nights, room_price_per_night, total_amount, tax_amount, discount_amount, grand_total, booking_status, payment_status, cancellation_reason, special_requests, idempotency_key) VALUES
(1, 'SE-202610-8842', 4, 1, 1, '2026-09-10', '2026-09-14', 1, 2, 4, 289.00, 1156.00, 138.72, 0.00, 1294.72, 'completed', 'paid', NULL, 'High floor requested if available.', 'idem-sample-001'),
(2, 'SE-202610-9124', 5, 2, 4, '2026-09-18', '2026-09-21', 1, 2, 3, 340.00, 1020.00, 122.40, 50.00, 1092.40, 'completed', 'paid', NULL, 'Late check-in around 8 PM.', 'idem-sample-002'),
(3, 'SE-202610-3371', 4, 3, 6, '2026-10-25', '2026-10-28', 1, 1, 3, 229.00, 687.00, 82.44, 0.00, 769.44, 'confirmed', 'paid', NULL, 'Quiet room away from elevator.', 'idem-sample-003'),
(4, 'SE-202610-4490', 6, 4, 8, '2026-11-05', '2026-11-09', 1, 2, 4, 295.00, 1180.00, 141.60, 0.00, 1321.60, 'confirmed', 'paid', NULL, 'Celebrating 5th wedding anniversary!', 'idem-sample-004'),
(5, 'SE-202610-5512', 5, 1, 3, '2026-12-01', '2026-12-05', 1, 3, 4, 219.00, 876.00, 105.12, 0.00, 981.12, 'pending', 'unpaid', NULL, 'Extra pillows please.', 'idem-sample-005')
ON DUPLICATE KEY UPDATE booking_reference=VALUES(booking_reference);

-- 10. BOOKING GUESTS
INSERT INTO booking_guests (id, booking_id, full_name, age, is_primary) VALUES
(1, 1, 'Michael Scott', 45, TRUE),
(2, 1, 'Holly Flax', 42, FALSE),
(3, 2, 'Emma Watson', 34, TRUE),
(4, 2, 'Alex Watson', 31, FALSE),
(5, 3, 'Michael Scott', 45, TRUE),
(6, 4, 'James Miller', 38, TRUE),
(7, 4, 'Sarah Miller', 36, FALSE),
(8, 5, 'Emma Watson', 34, TRUE)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- 11. PAYMENTS
INSERT INTO payments (id, booking_id, user_id, payment_reference, amount, currency, payment_method, status, gateway_response, paid_at) VALUES
(1, 1, 4, 'PAY-AZURE-202609-01', 1294.72, 'USD', 'mock_card_4242', 'succeeded', '{"gateway": "mock_pay", "transaction_id": "tx_8842", "brand": "Visa", "last4": "4242"}', '2026-09-08 14:22:10'),
(2, 2, 5, 'PAY-PINNACLE-202609-02', 1092.40, 'USD', 'mock_card_1234', 'succeeded', '{"gateway": "mock_pay", "transaction_id": "tx_9124", "brand": "Mastercard", "last4": "1234"}', '2026-09-15 09:12:45'),
(3, 3, 4, 'PAY-SKYLINE-202610-03', 769.44, 'USD', 'mock_card_4242', 'succeeded', '{"gateway": "mock_pay", "transaction_id": "tx_3371", "brand": "Visa", "last4": "4242"}', '2026-10-05 18:30:00'),
(4, 4, 6, 'PAY-SERENITY-202610-04', 1321.60, 'USD', 'mock_card_9999', 'succeeded', '{"gateway": "mock_pay", "transaction_id": "tx_4490", "brand": "Amex", "last4": "9999"}', '2026-10-08 11:45:22')
ON DUPLICATE KEY UPDATE payment_reference=VALUES(payment_reference);

-- 12. REVIEWS
INSERT INTO reviews (id, booking_id, hotel_id, user_id, rating, comment, status) VALUES
(1, 1, 1, 4, 5, 'Breathtaking ocean views and outstanding service from check-in to check-out. The infinity pool at sunset is unforgettable!', 'approved'),
(2, 2, 2, 5, 5, 'Cozy stone fireplace, snowy mountain slopes right at the doorstep, and amazing spa facilities. Will definitely return next winter!', 'approved')
ON DUPLICATE KEY UPDATE comment=VALUES(comment);

-- 13. WISHLISTS
INSERT INTO wishlists (id, user_id, hotel_id) VALUES
(1, 4, 2),
(2, 4, 4),
(3, 5, 1),
(4, 5, 3),
(5, 6, 1)
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);

-- 14. NOTIFICATIONS
INSERT INTO notifications (id, user_id, title, message, type, is_read, reference_id) VALUES
(1, 4, 'Booking Confirmed!', 'Your reservation at Skyline Metropolitan Hotel (SE-202610-3371) is confirmed for Oct 25 - 28.', 'booking', TRUE, 'SE-202610-3371'),
(2, 5, 'Stay Completed', 'We hope you enjoyed your stay at The Alpine Pinnacle Lodge! You can now leave a verified review.', 'review', TRUE, 'SE-202610-9124'),
(3, 6, 'Upcoming Getaway', 'Get ready for your upcoming stay at Coastal Serenity Haven starting Nov 5.', 'booking', FALSE, 'SE-202610-4490'),
(4, 2, 'New Hotel Submitted', 'Your hotel Emerald Bay Luxury Villas was submitted for admin review.', 'hotel_submission', FALSE, '5'),
(5, 1, 'Action Required', 'A new hotel submission (Emerald Bay Luxury Villas) requires review.', 'admin_alert', FALSE, '5')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- 15. AUDIT LOGS
INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address, details) VALUES
(1, 1, 'APPROVE_HOTEL', 'hotel', '1', '127.0.0.1', '{"hotel_name": "Grand Azure Resort & Spa", "approved_by": "admin@stayease.com"}'),
(2, 1, 'APPROVE_HOTEL', 'hotel', '2', '127.0.0.1', '{"hotel_name": "The Alpine Pinnacle Lodge", "approved_by": "admin@stayease.com"}'),
(3, 2, 'SUBMIT_HOTEL_FOR_APPROVAL', 'hotel', '5', '127.0.0.1', '{"hotel_name": "Emerald Bay Luxury Villas"}')
ON DUPLICATE KEY UPDATE action=VALUES(action);
