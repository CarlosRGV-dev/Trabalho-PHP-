<?php
/**
 * Funções comuns a todos os endpoints da API.
 */
require_once __DIR__ . '/../config/conexao.php';

session_start();
header('Content-Type: application/json; charset=utf-8');

set_exception_handler(function (Throwable $e) {
    http_response_code(500);
    echo json_encode(['erro' => 'Erro no servidor: ' . $e->getMessage()]);
    exit;
});

/** Envia resposta JSON e encerra. */
function responder($dados, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function erro(string $mensagem, int $status = 400): void
{
    responder(['erro' => $mensagem], $status);
}

/** Lê o corpo JSON da requisição. */
function entrada(): array
{
    $dados = json_decode(file_get_contents('php://input'), true);
    return is_array($dados) ? $dados : [];
}

function metodo(): string
{
    return $_SERVER['REQUEST_METHOD'];
}

/** Bloqueia acesso de quem não está logado e devolve o id do usuário. */
function exigirLogin(): int
{
    if (empty($_SESSION['usuario_id'])) {
        erro('Sessão expirada. Faça login novamente.', 401);
    }
    return (int) $_SESSION['usuario_id'];
}

function texto(array $d, string $campo): string
{
    return trim((string) ($d[$campo] ?? ''));
}
