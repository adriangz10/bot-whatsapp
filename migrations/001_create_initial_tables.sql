-- Tabla de chats (conversaciones)
CREATE TABLE IF NOT EXISTS `chats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` varchar(100) NOT NULL,
  `userName` varchar(255) DEFAULT NULL,
  `lastMessage` text,
  `lastMessageAt` datetime DEFAULT NULL,
  `status` enum('active','pending','resolved','archived') NOT NULL DEFAULT 'active',
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `tags` json DEFAULT NULL,
  `notes` text,
  `unreadCount` int NOT NULL DEFAULT 0,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_userId` (`userId`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_createdAt` (`createdAt`),
  KEY `idx_updatedAt` (`updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` varchar(100) NOT NULL,
  `role` varchar(20) NOT NULL,
  `content` text NOT NULL,
  `chatId` int DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`),
  KEY `idx_chatId` (`chatId`),
  KEY `idx_createdAt` (`createdAt`),
  CONSTRAINT `fk_messages_chat` FOREIGN KEY (`chatId`) REFERENCES `chats` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;