-- ==========================================================
-- BANCO DE DADOS MYSQL: Almoxarifado TG 02-076 (Itapetininga)
-- Conversão completa do schema PostgreSQL/Supabase original
-- ==========================================================

CREATE DATABASE IF NOT EXISTS tg_almoxarifado
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE tg_almoxarifado;

-- 1. Tabela de Usuários / Perfis (Substitui auth.users + public.profiles)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    posto ENUM('Soldado', 'Cabo', 'Sargento', 'Subtenente', 'Tenente') NOT NULL DEFAULT 'Soldado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Prateleiras (Substitui public.shelves)
CREATE TABLE IF NOT EXISTS shelves (
    id VARCHAR(32) PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    descricao VARCHAR(150) NOT NULL DEFAULT '',
    setor VARCHAR(100) NOT NULL DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Itens do Almoxarifado (Substitui public.items)
CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(20) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    tipo VARCHAR(80) NOT NULL DEFAULT 'Uniforme',
    quantidade INT NOT NULL DEFAULT 0,
    prateleira VARCHAR(20) NOT NULL DEFAULT '',
    condicao VARCHAR(50) NOT NULL DEFAULT 'Bom',
    situacao VARCHAR(50) NOT NULL DEFAULT 'Disponível',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Atiradores (Substitui public.atiradores)
CREATE TABLE IF NOT EXISTS atiradores (
    id VARCHAR(32) PRIMARY KEY,
    numero VARCHAR(20) NOT NULL,
    nome VARCHAR(150) NOT NULL,
    contato VARCHAR(50) NOT NULL,
    tipo_sanguineo VARCHAR(10) NOT NULL DEFAULT 'O+',
    altura VARCHAR(20) NOT NULL DEFAULT '',
    calcado VARCHAR(10) NOT NULL DEFAULT '',
    roupa VARCHAR(10) NOT NULL DEFAULT 'M',
    cabeca VARCHAR(10) NOT NULL DEFAULT '',
    endereco VARCHAR(255) NOT NULL DEFAULT '',
    nascimento DATE NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Movimentações Entrada/Saída (Substitui public.movs)
CREATE TABLE IF NOT EXISTS movs (
    id VARCHAR(32) PRIMARY KEY,
    tipo ENUM('Entrada', 'Saída') NOT NULL,
    item_id VARCHAR(20) NULL,
    item_nome VARCHAR(150) NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    data DATETIME NOT NULL,
    atirador_id VARCHAR(32) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY (atirador_id) REFERENCES atiradores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela de Cautelas (Substitui public.cautelas)
CREATE TABLE IF NOT EXISTS cautelas (
    id VARCHAR(32) PRIMARY KEY,
    numero VARCHAR(30) NOT NULL UNIQUE,
    atirador_id VARCHAR(32) NOT NULL,
    responsavel VARCHAR(150) NOT NULL,
    retirada DATE NOT NULL,
    retorno DATE NOT NULL,
    status ENUM('Ativa', 'Devolvida') NOT NULL DEFAULT 'Ativa',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (atirador_id) REFERENCES atiradores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabela de Itens da Cautela (Normalização do array JSONB itens de public.cautelas)
CREATE TABLE IF NOT EXISTS cautela_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cautela_id VARCHAR(32) NOT NULL,
    item_id VARCHAR(20) NOT NULL,
    item_nome VARCHAR(150) NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    devolvido INT NOT NULL DEFAULT 0,
    FOREIGN KEY (cautela_id) REFERENCES cautelas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- DADOS INICIAIS (SEED ORIGINAL DA MIGRATION 0000_migration.sql)
-- ==========================================================

-- Usuário padrão para acesso imediato (Senha: 123456)
INSERT INTO users (nome, email, senha, posto) VALUES
('Subtenente Monteiro', 'admin@tg.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Subtenente')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO shelves (id, codigo, descricao, setor) VALUES
('s1', 'A-01', 'Calçados', 'Vestuário'),
('s2', 'A-02', 'Calças', 'Uniforme'),
('s3', 'A-03', 'Gandolas', 'Uniforme'),
('s4', 'B-01', 'Acessórios', 'Acessórios')
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao), setor = VALUES(setor);

INSERT INTO items (id, nome, tipo, quantidade, prateleira, condicao, situacao) VALUES
('ITM-001', 'Coturno', 'Vestuário', 43, 'A-01', 'Bom', 'Disponível'),
('ITM-002', 'Gandola', 'Uniforme', 18, 'A-03', 'Bom', 'Em cautela'),
('ITM-003', 'Calça camuflada', 'Uniforme', 24, 'A-02', 'Bom', 'Disponível'),
('ITM-004', 'Boné', 'Acessório', 31, 'B-01', 'Bom', 'Disponível'),
('ITM-005', 'Desinfetante', 'Limpeza', 12, 'B-01', 'Novo', 'Disponível')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), quantidade = VALUES(quantidade);

INSERT INTO atiradores (id, numero, nome, contato, tipo_sanguineo, altura, calcado, roupa, cabeca, endereco, nascimento) VALUES
('a1', '001', 'Gabriel Vaz de Lima Correa', '(15) 99999-0001', 'O+', '1,78', '41', 'M', '57', 'Rua Exemplo, 100 - Itapetininga/SP', '2007-03-12'),
('a2', '002', 'Gustavo', '(15) 99999-0002', 'A+', '1,82', '42', 'G', '58', 'Rua Exemplo, 200 - Itapetininga/SP', '2007-08-30')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO movs (id, tipo, item_id, item_nome, quantidade, data, atirador_id) VALUES
('m1', 'Saída', 'ITM-003', 'Calça camuflada', 1, '2026-05-24 09:00:00', 'a1'),
('m2', 'Saída', 'ITM-001', 'Coturno', 1, '2026-05-25 09:20:00', 'a1'),
('m3', 'Saída', 'ITM-002', 'Gandola', 1, '2026-05-25 10:15:00', 'a2')
ON DUPLICATE KEY UPDATE quantidade = VALUES(quantidade);
