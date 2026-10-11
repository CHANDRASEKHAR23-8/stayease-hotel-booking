class AppUser {
  final int id;
  final String name;
  final String email;
  final String? phone;
  final String role;
  final String status;
  final String? avatarUrl;
  final String? createdAt;

  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    required this.status,
    this.avatarUrl,
    this.createdAt,
  });

  bool get isCustomer => role == 'customer';
  bool get isOwner => role == 'owner';
  bool get isAdmin => role == 'admin';

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as int,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      role: json['role'] as String? ?? 'customer',
      status: json['status'] as String? ?? 'active',
      avatarUrl: json['avatar_url'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'role': role,
      'status': status,
      'avatar_url': avatarUrl,
      'created_at': createdAt,
    };
  }
}
