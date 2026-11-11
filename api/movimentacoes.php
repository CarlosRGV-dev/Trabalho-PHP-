<?php
/**
 * Entradas e saídas de estoque.
 *   GET  movimentacoes.php?limite=5   -> lista (mais recentes primeiro)
 *   POST movimentacoes.php            {tipo, item_id, quantidade, atirador_id}
 */
require_once __DIR__ . '/base.php';
require_once __DIR__ . '/funcoes.php';
$usuarioId = exigirLogin();
$db = conexao();

switch (metodo()) {
    case 'GET':
        $limite = (int) ($_GET['limite'] ?? 0);
        $sql = 'SELECT m.id, m.tipo, m.item_id, i.codigo AS item_codigo, m.item_nome, i.tipo AS item_tipo,
                       m.quantidade, m.data, m.atirador_id, a.numero AS atirador_numero, a.nome AS atirador_nome
                  FROM movimentacoes m
                  LEFT JOIN itens i ON i.id = m.item_id
                  LEFT JOIN atiradores a ON a.id = m.atirador_id
                 ORDER BY m.data DESC, m.id DESC';
        if ($limite > 0) $sql .= ' LIMIT ' . $limite;
        responder($db->query($sql)->fetchAll());

    case 'POST':
        $d = entrada();
        $tipo = texto($d, 'tipo');
        $qtd = (int) ($d['quantidade'] ?? 0);
        $atiradorId = !empty($d['atirador_id']) ? (int) $d['atirador_id'] : null;
        if (!in_array($tipo, ['Entrada', 'Saída'], true)) erro('Tipo inválido.');
        if ($qtd < 1) erro('Selecione um item e quantidade válida.');

        $db->beginTransaction();
        $st = $db->prepare('SELECT * FROM itens WHERE id = ? FOR UPDATE');
        $st->execute([(int) ($d['item_id'] ?? 0)]);
        $item = $st->fetch();
        if (!$item) { $db->rollBack(); erro('Selecione um item válido.'); }

        $comum = in_array($item['tipo'], TIPOS_COMUNS, true);
        if ($comum) $atiradorId = null;
        elseif (!$atiradorId) { $db->rollBack(); erro('Este item deve ser vinculado a um atirador.'); }
        if ($tipo === 'Saída' && $qtd > (int) $item['quantidade']) {
            $db->rollBack();
            erro('Estoque insuficiente (' . $item['quantidade'] . ').');
        }

        $delta = $tipo === 'Entrada' ? $qtd : -$qtd;
        $db->prepare('UPDATE itens SET quantidade = quantidade + ? WHERE id = ?')->execute([$delta, $item['id']]);
        $db->prepare('INSERT INTO movimentacoes (tipo, item_id, item_nome, quantidade, atirador_id, usuario_id) VALUES (?, ?, ?, ?, ?, ?)')
           ->execute([$tipo, $item['id'], $item['nome'], $qtd, $atiradorId, $usuarioId]);
        $db->commit();
        responder(['ok' => true], 201);

    default:
        erro('Método não permitido.', 405);
}
