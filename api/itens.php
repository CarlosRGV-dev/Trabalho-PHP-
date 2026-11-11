<?php
/**
 * Itens (materiais).
 *   GET    itens.php
 *   POST   itens.php            {nome, tipo, quantidade, prateleira_id, condicao, situacao}
 *   PUT    itens.php?id=1       (mesmos campos)
 *   DELETE itens.php?id=1
 */
require_once __DIR__ . '/base.php';
exigirLogin();
$db = conexao();

const TIPOS = ['Uniforme', 'Vestuário', 'Acessório', 'Equipamento', 'Material de expediente', 'Limpeza', 'Construção'];
const CONDICOES = ['Novo', 'Bom', 'Regular', 'Inservível'];
const SITUACOES = ['Disponível', 'Em cautela', 'Indisponível'];

function validarItem(array $d): array
{
    $nome = texto($d, 'nome');
    if ($nome === '') erro('Informe o nome do item.');
    $tipo = texto($d, 'tipo');
    $condicao = texto($d, 'condicao');
    $situacao = texto($d, 'situacao');
    if (!in_array($tipo, TIPOS, true)) erro('Tipo inválido.');
    if (!in_array($condicao, CONDICOES, true)) erro('Condição inválida.');
    if (!in_array($situacao, SITUACOES, true)) erro('Situação inválida.');
    $qtd = (int) ($d['quantidade'] ?? 0);
    if ($qtd < 0) erro('Quantidade não pode ser negativa.');
    $prat = !empty($d['prateleira_id']) ? (int) $d['prateleira_id'] : null;
    return [$nome, $tipo, $qtd, $prat, $condicao, $situacao];
}

switch (metodo()) {
    case 'GET':
        responder($db->query(
            'SELECT i.id, i.codigo, i.nome, i.tipo, i.quantidade, i.prateleira_id, p.codigo AS prateleira,
                    i.condicao, i.situacao
               FROM itens i LEFT JOIN prateleiras p ON p.id = i.prateleira_id
              ORDER BY i.codigo'
        )->fetchAll());

    case 'POST':
        $v = validarItem(entrada());
        // Próximo código ITM-xxx
        $max = (int) $db->query("SELECT COALESCE(MAX(CAST(SUBSTRING(codigo, 5) AS UNSIGNED)), 0) FROM itens")->fetchColumn();
        $codigo = sprintf('ITM-%03d', $max + 1);
        $db->prepare('INSERT INTO itens (codigo, nome, tipo, quantidade, prateleira_id, condicao, situacao) VALUES (?, ?, ?, ?, ?, ?, ?)')
           ->execute(array_merge([$codigo], $v));
        responder(['id' => (int) $db->lastInsertId(), 'codigo' => $codigo], 201);

    case 'PUT':
        $id = (int) ($_GET['id'] ?? 0);
        $v = validarItem(entrada());
        $v[] = $id;
        $db->prepare('UPDATE itens SET nome = ?, tipo = ?, quantidade = ?, prateleira_id = ?, condicao = ?, situacao = ? WHERE id = ?')
           ->execute($v);
        responder(['ok' => true]);

    case 'DELETE':
        $db->prepare('DELETE FROM itens WHERE id = ?')->execute([(int) ($_GET['id'] ?? 0)]);
        responder(['ok' => true]);

    default:
        erro('Método não permitido.', 405);
}
