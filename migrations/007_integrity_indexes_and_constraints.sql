-- chats.tags debe ser json nativo (ChatsService usa JSON_OVERLAPS)
ALTER TABLE `chats` MODIFY COLUMN `tags` json DEFAULT NULL;

-- 003 dejó status sin NOT NULL
UPDATE `chats` SET `status` = 'active' WHERE `status` IS NULL;
ALTER TABLE `chats`
  MODIFY COLUMN `status` ENUM('active', 'inactive', 'pending', 'resolved', 'archived') NOT NULL DEFAULT 'active';

-- Listado del panel: filtra por estado y ordena por último mensaje (cubre al índice solo de status)
ALTER TABLE `chats`
  DROP INDEX `idx_status`,
  ADD INDEX `idx_chats_status_lastMessageAt` (`status`, `lastMessageAt`);

-- getHistory filtra por usuario y ordena por fecha (cubre al índice solo de userId)
ALTER TABLE `messages`
  DROP INDEX `idx_userId`,
  ADD INDEX `idx_messages_user_created` (`userId`, `createdAt`);

-- appointments: índices para recordatorios (cada 60 s) y búsqueda por usuario
ALTER TABLE `appointments`
  DROP INDEX `idx_appointments_userId`,
  ADD INDEX `idx_appointments_status_start` (`status`, `startDateTime`),
  ADD INDEX `idx_appointments_user_status_start` (`userId`, `status`, `startDateTime`);

-- appointments.chatId sin integridad referencial
UPDATE `appointments` a
LEFT JOIN `chats` c ON c.`id` = a.`chatId`
SET a.`chatId` = NULL
WHERE a.`chatId` IS NOT NULL AND c.`id` IS NULL;

ALTER TABLE `appointments`
  ADD CONSTRAINT `fk_appointments_chat` FOREIGN KEY (`chatId`) REFERENCES `chats` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `chk_appointments_range` CHECK (`endDateTime` > `startDateTime`);

-- Un teléfono = un cliente (los NULL no cuentan). Falla si ya hay duplicados: depurarlos antes.
ALTER TABLE `clients` ADD UNIQUE INDEX `idx_clients_phone` (`phone`);
