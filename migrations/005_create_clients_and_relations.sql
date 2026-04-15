CREATE TABLE IF NOT EXISTS `clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` varchar(100) DEFAULT NULL,
  `firstName` varchar(50) DEFAULT NULL,
  `lastName` varchar(50) DEFAULT NULL,
  `fullName` varchar(150) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `documentId` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `postalCode` varchar(20) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_clients_userId` (`userId`),
  KEY `idx_clients_email` (`email`),
  KEY `idx_clients_documentId` (`documentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `chats`
  ADD COLUMN `clientId` int DEFAULT NULL AFTER `notes`,
  ADD KEY `idx_chats_clientId` (`clientId`),
  ADD CONSTRAINT `fk_chats_client` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE SET NULL;

ALTER TABLE `appointments`
  ADD COLUMN `clientId` int DEFAULT NULL AFTER `chatId`,
  ADD KEY `idx_appointments_clientId` (`clientId`),
  ADD CONSTRAINT `fk_appointments_client` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE SET NULL;

UPDATE `clients`
SET `phone` = `userId`
WHERE `phone` IS NULL AND `userId` IS NOT NULL;

INSERT INTO `clients` (`userId`, `fullName`, `phone`, `createdAt`, `updatedAt`)
SELECT c.`userId`, c.`userName`, c.`userId`, NOW(6), NOW(6)
FROM `chats` c
LEFT JOIN `clients` cl ON cl.`userId` = c.`userId`
WHERE c.`userId` IS NOT NULL AND cl.`id` IS NULL;

UPDATE `chats` c
INNER JOIN `clients` cl ON cl.`userId` = c.`userId`
SET c.`clientId` = cl.`id`
WHERE c.`clientId` IS NULL;

INSERT INTO `clients` (`userId`, `fullName`, `phone`, `createdAt`, `updatedAt`)
SELECT a.`userId`, a.`contactName`, a.`userId`, NOW(6), NOW(6)
FROM `appointments` a
LEFT JOIN `clients` cl ON cl.`userId` = a.`userId`
WHERE a.`userId` IS NOT NULL AND cl.`id` IS NULL;

UPDATE `appointments` a
INNER JOIN `clients` cl ON cl.`userId` = a.`userId`
SET a.`clientId` = cl.`id`
WHERE a.`clientId` IS NULL;
