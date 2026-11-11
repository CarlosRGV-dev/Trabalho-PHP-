-- =====================================================================
--  Sistema de Almoxarifado - Tiro de Guerra 02-076 (Itapetininga)
--  Script de criação do banco de dados (MySQL 5.7+ / MariaDB 10.3+)
--  Uso: importe no phpMyAdmin ou rode:  mysql -u root -p < criar_banco.sql
-- =====================================================================

SET NAMES utf8mb4;

DROP DATABASE IF EXISTS almoxarifado_tg;
CREATE DATABASE almoxarifado_tg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE almoxarifado_tg;

-- ---------------------------------------------------------------------
-- Usuários do sistema (quem opera o almoxarifado)
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(160) NOT NULL UNIQUE,
    posto       ENUM('Soldado','Cabo','Sargento','Subtenente','Tenente') NOT NULL DEFAULT 'Soldado',
    senha_hash  VARCHAR(255) NOT NULL,
    criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Prateleiras (locais de armazenamento)
-- ---------------------------------------------------------------------
CREATE TABLE prateleiras (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo      VARCHAR(20)  NOT NULL UNIQUE,
    descricao   VARCHAR(150) NOT NULL DEFAULT '',
    setor       VARCHAR(80)  NOT NULL DEFAULT '',
    criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Itens (materiais). Código no formato ITM-001.
-- Tipos "Limpeza" e "Construção" são de uso comum (não vinculam atirador).
-- ---------------------------------------------------------------------
CREATE TABLE itens (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo        VARCHAR(20)  NOT NULL UNIQUE,
    nome          VARCHAR(120) NOT NULL,
    tipo          ENUM('Uniforme','Vestuário','Acessório','Equipamento','Material de expediente','Limpeza','Construção') NOT NULL DEFAULT 'Uniforme',
    quantidade    INT NOT NULL DEFAULT 0,
    prateleira_id INT UNSIGNED NULL,
    condicao      ENUM('Novo','Bom','Regular','Inservível') NOT NULL DEFAULT 'Bom',
    situacao      ENUM('Disponível','Em cautela','Indisponível') NOT NULL DEFAULT 'Disponível',
    criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_prateleira FOREIGN KEY (prateleira_id) REFERENCES prateleiras(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_item_qtd CHECK (quantidade >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Atiradores (dados pessoais e medidas)
-- ---------------------------------------------------------------------
CREATE TABLE atiradores (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero          VARCHAR(10)  NOT NULL UNIQUE,
    nome            VARCHAR(150) NOT NULL,
    contato         VARCHAR(30)  NOT NULL,
    tipo_sanguineo  ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL DEFAULT 'O+',
    altura          VARCHAR(10)  NOT NULL DEFAULT '',
    calcado         VARCHAR(5)   NOT NULL DEFAULT '',
    roupa           ENUM('PP','P','M','G','GG','XG') NOT NULL DEFAULT 'M',
    cabeca          VARCHAR(5)   NOT NULL DEFAULT '',
    endereco        VARCHAR(255) NOT NULL DEFAULT '',
    nascimento      DATE NULL,
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Movimentações (Entrada / Saída de estoque)
-- ---------------------------------------------------------------------
CREATE TABLE movimentacoes (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipo         ENUM('Entrada','Saída') NOT NULL,
    item_id      INT UNSIGNED NULL,
    item_nome    VARCHAR(120) NOT NULL,           -- guarda o nome mesmo se o item for excluído
    quantidade   INT NOT NULL,
    data         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atirador_id  INT UNSIGNED NULL,               -- NULL = item de uso comum
    usuario_id   INT UNSIGNED NULL,               -- quem registrou
    CONSTRAINT fk_mov_item     FOREIGN KEY (item_id)     REFERENCES itens(id)      ON DELETE SET NULL,
    CONSTRAINT fk_mov_atirador FOREIGN KEY (atirador_id) REFERENCES atiradores(id) ON DELETE SET NULL,
    CONSTRAINT fk_mov_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)   ON DELETE SET NULL,
    CONSTRAINT ck_mov_qtd CHECK (quantidade > 0),
    INDEX idx_mov_data (data)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Cautelas (termo de responsabilidade) e seus itens
-- ---------------------------------------------------------------------
CREATE TABLE cautelas (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero       VARCHAR(20)  NOT NULL UNIQUE,     -- CAU-0001
    atirador_id  INT UNSIGNED NULL,
    responsavel  VARCHAR(150) NOT NULL,            -- nome do atirador no momento
    retirada     DATE NOT NULL,
    retorno      DATE NOT NULL,
    status       ENUM('Ativa','Devolvida') NOT NULL DEFAULT 'Ativa',
    criado_em    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cau_atirador FOREIGN KEY (atirador_id) REFERENCES atiradores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE cautela_itens (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cautela_id  INT UNSIGNED NOT NULL,
    item_id     INT UNSIGNED NULL,
    item_codigo VARCHAR(20)  NOT NULL DEFAULT '—',
    item_nome   VARCHAR(120) NOT NULL,
    quantidade  INT NOT NULL DEFAULT 0,             -- total recebido
    devolvido   INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_ci_cautela FOREIGN KEY (cautela_id) REFERENCES cautelas(id) ON DELETE CASCADE,
    CONSTRAINT fk_ci_item    FOREIGN KEY (item_id)    REFERENCES itens(id)    ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
--  DADOS INICIAIS
-- =====================================================================

-- Usuário padrão:  admin@gmail.com  /  senha: admin123
INSERT INTO usuarios (nome, email, posto, senha_hash) VALUES
('Administrador', 'admin@gmail.com', 'Subtenente', '$2y$10$fCJ0V29VC/WsKTsQLmsIROjxsH3jRIzfSqyv9E9nQxZm3aeqpRgCa');

INSERT INTO prateleiras (id, codigo, descricao, setor) VALUES
(1, 'A-01', 'Calçados',   'Vestuário'),
(2, 'A-02', 'Calças',     'Uniforme'),
(3, 'A-03', 'Gandolas',   'Uniforme'),
(4, 'B-01', 'Acessórios', 'Acessórios');

INSERT INTO itens (id, codigo, nome, tipo, quantidade, prateleira_id, condicao, situacao) VALUES
(1, 'ITM-001', 'Coturno',         'Vestuário', 43, 1, 'Bom',  'Disponível'),
(2, 'ITM-002', 'Gandola',         'Uniforme',  18, 3, 'Bom',  'Em cautela'),
(3, 'ITM-003', 'Calça camuflada', 'Uniforme',  24, 2, 'Bom',  'Disponível'),
(4, 'ITM-004', 'Boné',            'Acessório', 31, 4, 'Bom',  'Disponível'),
(5, 'ITM-005', 'Desinfetante',    'Limpeza',   12, 4, 'Novo', 'Disponível');

INSERT INTO atiradores (id, numero, nome, contato, tipo_sanguineo, altura, calcado, roupa, cabeca, endereco, nascimento) VALUES
(1, '001', 'Gabriel Vaz de Lima Correa', '(15) 99999-0001', 'O+', '1,78', '41', 'M', '57', 'Rua Exemplo, 100 - Itapetininga/SP', '2007-03-12'),
(2, '002', 'Gustavo',                    '(15) 99999-0002', 'A+', '1,82', '42', 'G', '58', 'Rua Exemplo, 200 - Itapetininga/SP', '2007-08-30');

INSERT INTO movimentacoes (tipo, item_id, item_nome, quantidade, data, atirador_id) VALUES
('Saída', 3, 'Calça camuflada', 1, '2026-05-24 09:00:00', 1),
('Saída', 1, 'Coturno',         1, '2026-05-25 09:20:00', 1),
('Saída', 2, 'Gandola',         1, '2026-05-25 10:15:00', 2);
