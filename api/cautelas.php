<?php
/**
 * Cautelas.
 *   GET  cautelas.php                      -> lista com itens
 *   GET  cautelas.php?id=1                 -> uma cautela + dados do atirador (para o PDF)
 *   POST cautelas.php                      {atirador_id, retirada, retorno}
 *   POST cautelas.php?devolver=1           -> devolve itens em posse e marca como Devolvida
 */
require_once __DIR__ . '/base.php';
require_once __DIR__ . '/funcoes.php';
$usuarioId = exigirLogin();
$db = conexao();

function carregarItens(PDO $db, array $ids): array
{
    if (!$ids) return [];
    $marc = implode(',', array_fill(0, count($ids), '?'));
    $st = $db->prepare("SELECT * FROM cautela_itens WHERE cautela_id IN ($marc) ORDER BY id");
    $st->execute($ids);
    $por = [];
    foreach ($st->fetchAll() as $r) {
        $r['quantidade'] = (int) $r['quantidade'];
        $r['devolvido'] = (int) $r['devolvido'];
        $por[$r['cautela_id']][] = $r;
    }
    return $por;
}

function dataValida(string $d): bool
{
    return (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $d);
}

if (metodo() === 'GET') {
    if (isset($_GET['id'])) {
        $st = $db->prepare('SELECT * FROM cautelas WHERE id = ?');
        $st->execute([(int) $_GET['id']]);
        $c = $st->fetch();
        if (!$c) erro('Cautela não encontrada.', 404);
        $c['itens'] = carregarItens($db, [$c['id']])[$c['id']] ?? [];
        $st = $db->prepare('SELECT * FROM atiradores WHERE id = ?');
        $st->execute([$c['atirador_id']]);
        $c['atirador'] = $st->fetch() ?: ['nome' => $c['responsavel']];
        responder($c);
    }
    $lista = $db->query('SELECT * FROM cautelas ORDER BY id DESC')->fetchAll();
    $itens = carregarItens($db, array_column($lista, 'id'));
    foreach ($lista as &$c) $c['itens'] = $itens[$c['id']] ?? [];
    responder($lista);
}

if (metodo() !== 'POST') erro('Método não permitido.', 405);

// ---- Devolução ----
if (isset($_GET['devolver'])) {
    $id = (int) $_GET['devolver'];
    $db->beginTransaction();
    $st = $db->prepare('SELECT * FROM cautelas WHERE id = ? FOR UPDATE');
    $st->execute([$id]);
    $c = $st->fetch();
    if (!$c || $c['status'] !== 'Ativa') { $db->rollBack(); erro('Cautela inexistente ou já devolvida.'); }

    foreach (carregarItens($db, [$id])[$id] ?? [] as $i) {
        $pendente = $i['quantidade'] - $i['devolvido'];
        if ($pendente <= 0) continue;
        if ($i['item_id']) {
            $db->prepare('UPDATE itens SET quantidade = quantidade + ? WHERE id = ?')->execute([$pendente, $i['item_id']]);
        }
        $db->prepare('INSERT INTO movimentacoes (tipo, item_id, item_nome, quantidade, atirador_id, usuario_id) VALUES (\'Entrada\', ?, ?, ?, ?, ?)')
           ->execute([$i['item_id'], $i['item_nome'], $pendente, $c['atirador_id'], $usuarioId]);
        $db->prepare('UPDATE cautela_itens SET devolvido = quantidade WHERE id = ?')->execute([$i['id']]);
    }
    $db->prepare("UPDATE cautelas SET status = 'Devolvida' WHERE id = ?")->execute([$id]);
    $db->commit();
    responder(['ok' => true]);
}

// ---- Nova cautela ----
$d = entrada();
$atiradorId = (int) ($d['atirador_id'] ?? 0);
$retirada = texto($d, 'retirada');
$retorno = texto($d, 'retorno');

$st = $db->prepare('SELECT * FROM atiradores WHERE id = ?');
$st->execute([$atiradorId]);
$a = $st->fetch();
if (!$a || !dataValida($retorno)) erro('Selecione o atirador e a data de retorno.');
if (!dataValida($retirada)) $retirada = date('Y-m-d');

$itens = itensDoAtirador($db, $atiradorId);
if (!$itens) erro('Este atirador não possui itens registrados em Entrada/Saída.');

$db->beginTransaction();
$prox = (int) $db->query('SELECT COALESCE(MAX(CAST(SUBSTRING(numero, 5) AS UNSIGNED)), 0) + 1 FROM cautelas')->fetchColumn();
$numero = sprintf('CAU-%04d', $prox);
$db->prepare('INSERT INTO cautelas (numero, atirador_id, responsavel, retirada, retorno) VALUES (?, ?, ?, ?, ?)')
   ->execute([$numero, $atiradorId, $a['nome'], $retirada, $retorno]);
$cid = (int) $db->lastInsertId();
$ins = $db->prepare('INSERT INTO cautela_itens (cautela_id, item_id, item_codigo, item_nome, quantidade, devolvido) VALUES (?, ?, ?, ?, ?, ?)');
foreach ($itens as $i) {
    $ins->execute([$cid, $i['item_id'], $i['item_codigo'], $i['item_nome'], $i['quantidade'], $i['devolvido']]);
}
$db->commit();
responder(['id' => $cid, 'numero' => $numero], 201);
