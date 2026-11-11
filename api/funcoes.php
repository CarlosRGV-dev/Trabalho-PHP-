<?php
/**
 * Regras de negócio compartilhadas.
 */

/** Tipos de item de uso comum: não precisam ser vinculados a um atirador. */
const TIPOS_COMUNS = ['Limpeza', 'Construção'];

/**
 * Todos os itens vinculados ao atirador, a partir das movimentações:
 * quantidade = total recebido (saídas), devolvido = total de entradas.
 */
function itensDoAtirador(PDO $db, int $atiradorId): array
{
    $st = $db->prepare(
        "SELECT m.item_id,
                COALESCE(i.codigo, '—')            AS item_codigo,
                COALESCE(i.nome, MAX(m.item_nome)) AS item_nome,
                SUM(CASE WHEN m.tipo = 'Saída'   THEN m.quantidade ELSE 0 END) AS quantidade,
                SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE 0 END) AS devolvido
           FROM movimentacoes m
           LEFT JOIN itens i ON i.id = m.item_id
          WHERE m.atirador_id = ?
          GROUP BY m.item_id, i.codigo, i.nome, CASE WHEN m.item_id IS NULL THEN m.item_nome END
          ORDER BY item_nome"
    );
    $st->execute([$atiradorId]);
    return array_map(fn($r) => [
        'item_id'     => $r['item_id'] !== null ? (int) $r['item_id'] : null,
        'item_codigo' => $r['item_codigo'],
        'item_nome'   => $r['item_nome'],
        'quantidade'  => (int) $r['quantidade'],
        'devolvido'   => (int) $r['devolvido'],
    ], $st->fetchAll());
}
