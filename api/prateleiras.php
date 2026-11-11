<?php
/**
 * Prateleiras.
 *   GET    prateleiras.php          -> lista (com itens de cada uma)
 *   POST   prateleiras.php          {codigo, descricao, setor}
 *   DELETE prateleiras.php?id=1
 */
require_once __DIR__ . '/base.php';
exigirLogin();
$db = conexao();

switch (metodo()) {
    case 'GET':
        $prateleiras = $db->query('SELECT id, codigo, descricao, setor FROM prateleiras ORDER BY codigo')->fetchAll();
        $itens = $db->query('SELECT id, codigo, nome, quantidade, prateleira_id FROM itens ORDER BY nome')->fetchAll();
        foreach ($prateleiras as &$p) {
            $p['itens'] = array_values(array_filter($itens, fn($i) => (int) $i['prateleira_id'] === (int) $p['id']));
        }
        responder($prateleiras);

    case 'POST':
        $d = entrada();
        $codigo = strtoupper(texto($d, 'codigo'));
        if ($codigo === '') erro('Informe o código.');
        $st = $db->prepare('SELECT id FROM prateleiras WHERE codigo = ?');
        $st->execute([$codigo]);
        if ($st->fetch()) erro('Código já existe.');
        $db->prepare('INSERT INTO prateleiras (codigo, descricao, setor) VALUES (?, ?, ?)')
           ->execute([$codigo, texto($d, 'descricao'), texto($d, 'setor')]);
        responder(['id' => (int) $db->lastInsertId()], 201);

    case 'DELETE':
        $id = (int) ($_GET['id'] ?? 0);
        $st = $db->prepare('SELECT COUNT(*) FROM itens WHERE prateleira_id = ?');
        $st->execute([$id]);
        if ($st->fetchColumn() > 0) erro('A prateleira possui itens e não pode ser excluída.');
        $db->prepare('DELETE FROM prateleiras WHERE id = ?')->execute([$id]);
        responder(['ok' => true]);

    default:
        erro('Método não permitido.', 405);
}
