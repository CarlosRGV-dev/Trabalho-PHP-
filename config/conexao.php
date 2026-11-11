<?php
/**
 * Configuração de conexão com o banco de dados MySQL.
 * Ajuste os dados abaixo conforme seu servidor (XAMPP/WAMP usam root sem senha).
 */
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NOME', 'almoxarifado_tg');
define('DB_USUARIO', 'root');
define('DB_SENHA', '');

function conexao(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NOME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USUARIO, DB_SENHA, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}
