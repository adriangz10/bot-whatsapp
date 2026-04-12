-- Agregar columna para URL de foto de perfil del contacto
ALTER TABLE `chats` ADD COLUMN `profilePictureUrl` text DEFAULT NULL AFTER `userName`;