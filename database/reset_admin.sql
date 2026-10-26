-- ==============================================================================
-- KASIRPRO - SCRIPT RESET PASSWORD ADMINISTRATOR
-- Gunakan script ini jika lupa password admin atau gagal login di lokal
-- ==============================================================================

USE `kasirpro_db`;

-- Reset akun admin: username 'admin', password 'admin123', status 'active'
UPDATE `users`
SET 
  `password_hash` = '$2a$10$123456789012345678901u./zCLeARnBuyfsw17qkjYMfd7L4o2om',
  `status` = 'active',
  `failed_login_attempts` = 0,
  `updated_at` = NOW()
WHERE `username` = 'admin';

-- Tampilkan status user setelah reset
SELECT `id`, `username`, `name`, `status`, `failed_login_attempts`, `updated_at` 
FROM `users` 
WHERE `username` = 'admin';
