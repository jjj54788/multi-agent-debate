CREATE TABLE `ai_provider_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('manus','openai','anthropic','custom') NOT NULL DEFAULT 'manus',
	`name` varchar(100) NOT NULL,
	`apiKey` text,
	`baseURL` text,
	`model` varchar(100),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_provider_configs_id` PRIMARY KEY(`id`)
);
