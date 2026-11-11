<?php
/**
 * Atiradores.
 *   GET    atiradores.php                -> lista
 *   GET    atiradores.php?itens=ID       -> itens vinculados ao atirador (recebido x devolvido)
 *   POST   atiradores.php                {numero, nome, contato, ...}
 *   PUT    atiradores.php?id=1
 *   DELETE atiradores.php?id=1
 */
require_once __DIR__ . '/base.php';
require_once __DIR__ . '/funcoes.php';
exigirLogin();
$db = conexao();

const SANGUE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ROUPAS = ['PP', 'P', 'M', 'G', 'GG', 'XG'];

function validarAtirador(array $d): array
{
    $numero = texto($d, 'numero');
    $nome = texto($d, 'nome');
    $contato = texto($d, 'contato');
    if ($numero === '' || $nome === '' || $contato === '') erro('Preencha número, nome e contato.');
    $sangue = in_array(texto($d, 'tipo_sanguineo'), SANGUE, true) ? texto($d, 'tipo_sanguineo') : 'O+';
    $roupa = in_array(texto($d, 'roupa'), ROUPAS, true) ? texto($d, 'roupa') : 'M';
    $nasc = texto($d, 'nascimento');
    $nasc = preg_match('/^\d{4}-\d{2}-\d{2}$/', $nasc) ? $nasc : null;
    return [$numero, $nome, $contato, $sangue, texto($d, 'altura'), texto($d, 'calcado'), $roupa,
            texto($d, 'cabeca'), texto($d, 'endereco'), $nasc];
}

function numeroDuplicado(PDO $db, string $numero, int $ignorarId = 0): bool
{
    $st = $db->prepare('SELECT id FROM atiradores WHERE numero = ? AND id <> ?');
    $st->execute([$numero, $ignorarId]);
    return (bool) $st->fetch();
}

switch (metodo()) {
    case 'GET':
        if (isset($_GET['itens'])) {
            responder(itensDoAtirador($db, (int) $_GET['itens']));
        }
        responder($db->query(
            'SELECT id, numero, nome, contato, tipo_sanguineo, altura, calcado, roupa, cabeca, endereco, nascimento
               FROM atiradores ORDER BY numero'
        )->fetchAll());

    case 'POST':
        $v = validarAtirador(entrada());
        if (numeroDuplicado($db, $v[0])) erro('Já existe um atirador com esse número.');
        $db->prepare('INSERT INTO atiradores (numero, nome, contato, tipo_sanguineo, altura, calcado, roupa, cabeca, endereco, nascimento)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute($v);
        responder(['id' => (int) $db->lastInsertId()], 201);

    case 'PUT':
        $id = (int) ($_GET['id'] ?? 0);
        $v = validarAtirador(entrada());
        if (numeroDuplicado($db, $v[0], $id)) erro('Já existe um atirador com esse número.');
        $v[] = $id;
        $db->prepare('UPDATE atiradores SET numero = ?, nome = ?, contato = ?, tipo_sanguineo = ?, altura = ?, calcado = ?,
                      roupa = ?, cabeca = ?, endereco = ?, nascimento = ? WHERE id = ?')->execute($v);
        responder(['ok' => true]);

    case 'DELETE':
        $db->prepare('DELETE FROM atiradores WHERE id = ?')->execute([(int) ($_GET['id'] ?? 0)]);
        responder(['ok' => true]);

    default:
        erro('Método não permitido.', 405);
}
