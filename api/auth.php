<?php
/**
 * Autenticação e conta do usuário.
 *   GET  auth.php?acao=sessao        -> usuário logado
 *   POST auth.php?acao=login         {email, senha}
 *   POST auth.php?acao=cadastro      {nome, email, posto, senha}
 *   POST auth.php?acao=sair
 *   POST auth.php?acao=perfil        {nome, posto}
 *   POST auth.php?acao=email         {email, senha}
 *   POST auth.php?acao=senha         {atual, nova}
 *   POST auth.php?acao=excluir       {senha}
 */
require_once __DIR__ . '/base.php';

const POSTOS = ['Soldado', 'Cabo', 'Sargento', 'Subtenente', 'Tenente'];
$db = conexao();
$acao = $_GET['acao'] ?? '';
$d = entrada();

function usuarioPublico(array $u): array
{
    return ['id' => (int) $u['id'], 'nome' => $u['nome'], 'email' => $u['email'], 'posto' => $u['posto']];
}

function emailValido(string $email): bool
{
    return (bool) preg_match('/^[^\s@]+@(gmail|hotmail|outlook)\.com$/i', $email);
}

function buscarUsuario(PDO $db, int $id): array
{
    $st = $db->prepare('SELECT * FROM usuarios WHERE id = ?');
    $st->execute([$id]);
    $u = $st->fetch();
    if (!$u) {
        session_destroy();
        erro('Usuário não encontrado.', 401);
    }
    return $u;
}

switch ($acao) {
    case 'sessao':
        if (empty($_SESSION['usuario_id'])) responder(['usuario' => null]);
        responder(['usuario' => usuarioPublico(buscarUsuario($db, (int) $_SESSION['usuario_id']))]);

    case 'login':
        $st = $db->prepare('SELECT * FROM usuarios WHERE email = ?');
        $st->execute([strtolower(texto($d, 'email'))]);
        $u = $st->fetch();
        if (!$u || !password_verify((string) ($d['senha'] ?? ''), $u['senha_hash'])) {
            erro('E-mail ou senha inválidos.', 401);
        }
        session_regenerate_id(true);
        $_SESSION['usuario_id'] = (int) $u['id'];
        responder(['usuario' => usuarioPublico($u)]);

    case 'cadastro':
        $nome = texto($d, 'nome');
        $email = strtolower(texto($d, 'email'));
        $posto = texto($d, 'posto');
        $senha = (string) ($d['senha'] ?? '');
        if ($nome === '' || $email === '' || strlen($senha) < 6) erro('Preencha todos os campos (senha mínima de 6 caracteres).');
        if (!emailValido($email)) erro('Use um e-mail válido com domínio gmail.com, hotmail.com ou outlook.com.');
        if (!in_array($posto, POSTOS, true)) $posto = 'Soldado';
        $st = $db->prepare('SELECT id FROM usuarios WHERE email = ?');
        $st->execute([$email]);
        if ($st->fetch()) erro('E-mail já cadastrado.');
        $db->prepare('INSERT INTO usuarios (nome, email, posto, senha_hash) VALUES (?, ?, ?, ?)')
           ->execute([$nome, $email, $posto, password_hash($senha, PASSWORD_DEFAULT)]);
        session_regenerate_id(true);
        $_SESSION['usuario_id'] = (int) $db->lastInsertId();
        responder(['usuario' => usuarioPublico(buscarUsuario($db, $_SESSION['usuario_id']))], 201);

    case 'sair':
        $_SESSION = [];
        session_destroy();
        responder(['ok' => true]);

    case 'perfil':
        $id = exigirLogin();
        $nome = texto($d, 'nome');
        $posto = texto($d, 'posto');
        if ($nome === '') erro('Informe o nome.');
        if (!in_array($posto, POSTOS, true)) erro('Posto inválido.');
        $db->prepare('UPDATE usuarios SET nome = ?, posto = ? WHERE id = ?')->execute([$nome, $posto, $id]);
        responder(['usuario' => usuarioPublico(buscarUsuario($db, $id))]);

    case 'email':
        $id = exigirLogin();
        $u = buscarUsuario($db, $id);
        $email = strtolower(texto($d, 'email'));
        if (!emailValido($email)) erro('Use um e-mail gmail.com, hotmail.com ou outlook.com.');
        if (!password_verify((string) ($d['senha'] ?? ''), $u['senha_hash'])) erro('Senha atual incorreta.');
        $st = $db->prepare('SELECT id FROM usuarios WHERE email = ? AND id <> ?');
        $st->execute([$email, $id]);
        if ($st->fetch()) erro('E-mail já está em uso.');
        $db->prepare('UPDATE usuarios SET email = ? WHERE id = ?')->execute([$email, $id]);
        responder(['usuario' => usuarioPublico(buscarUsuario($db, $id))]);

    case 'senha':
        $id = exigirLogin();
        $u = buscarUsuario($db, $id);
        $nova = (string) ($d['nova'] ?? '');
        if (!password_verify((string) ($d['atual'] ?? ''), $u['senha_hash'])) erro('Senha atual incorreta.');
        if (strlen($nova) < 6) erro('A nova senha precisa ter no mínimo 6 caracteres.');
        $db->prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')->execute([password_hash($nova, PASSWORD_DEFAULT), $id]);
        responder(['ok' => true]);

    case 'excluir':
        $id = exigirLogin();
        $u = buscarUsuario($db, $id);
        if (!password_verify((string) ($d['senha'] ?? ''), $u['senha_hash'])) erro('Senha incorreta.');
        $db->prepare('DELETE FROM usuarios WHERE id = ?')->execute([$id]);
        $_SESSION = [];
        session_destroy();
        responder(['ok' => true]);

    default:
        erro('Ação inválida.', 404);
}
