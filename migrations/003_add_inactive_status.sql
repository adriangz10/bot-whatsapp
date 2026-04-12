-- Add 'inactive' to the chat status enum
ALTER TABLE `chats` MODIFY COLUMN `status` ENUM('active', 'inactive', 'pending', 'resolved', 'archived') DEFAULT 'active';