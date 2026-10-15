CREATE DATABASE IF NOT EXISTS `psf` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `psf`;

CREATE TABLE IF NOT EXISTS `clientespsf` (
  `codigoc` int(10) NOT NULL,
  `razonsocial` varchar(50) NOT NULL,
  `etiquetas` varchar(100) NOT NULL,
  `vendedor` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `productospsf` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigop` varchar(50) DEFAULT NULL,
  `tipo` varchar(100) DEFAULT NULL,
  `medida` varchar(100) DEFAULT NULL,
  `peso` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `comandas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codc` varchar(50) DEFAULT NULL,
  `vendedor` varchar(100) DEFAULT NULL,
  `etiqueta` varchar(100) DEFAULT NULL,
  `codp` varchar(50) DEFAULT NULL,
  `cantidad` int(11) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario` varchar(50) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `rol` varchar(50) NOT NULL DEFAULT 'user',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
