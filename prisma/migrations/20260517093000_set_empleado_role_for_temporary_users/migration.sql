-- Normalize temporary-user role naming to 'empleado'
UPDATE `User`
SET `role` = 'empleado'
WHERE `isTemporary` = true
  AND (`role` IS NULL OR `role` = '' OR LOWER(`role`) = 'temporal');
