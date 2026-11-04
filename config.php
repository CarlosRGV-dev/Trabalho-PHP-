<?php
// ==========================================================
// CONFIGURAÇÃO DE CONEXÃO PDO COM O MYSQL
// ==========================================================
session_start();

$db_host = getenv('DB_HOST') ?: '127.0.0.1';
$db_port = getenv('DB_PORT') ?: '3306';
$db_name = getenv('DB_NAME') ?: 'tg_almoxarifado';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: '';

try {
    $pdo = new PDO(
        "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok' => false,
        'error' => 'Erro ao conectar no MySQL. Verifique se o banco tg_almoxarifado foi importado em database.sql. Detalhe: ' . $e->getMessage()
    ]);
    exit;
}

function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAuth(): array {
    if (empty($_SESSION['user'])) {
        jsonResponse(['ok' => false, 'error' => 'Não autenticado.'], 401);
    }
    return $_SESSION['user'];
}

function uid(): string {
    return substr(bin2hex(random_bytes(8)), 0, 8);
}
