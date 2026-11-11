<?php
/**
 * Resumo para o painel de controle.
 *   GET painel.php
 */
require_once __DIR__ . '/base.php';
exigirLogin();
$db = conexao();

responder([
    'em_estoque'     => (int) $db->query('SELECT COALESCE(SUM(quantidade), 0) FROM itens')->fetchColumn(),
    'cadastrados'    => (int) $db->query('SELECT COUNT(*) FROM itens')->fetchColumn(),
    'prateleiras'    => (int) $db->query('SELECT COUNT(*) FROM prateleiras')->fetchColumn(),
    'cautelas_ativas'=> (int) $db->query("SELECT COUNT(*) FROM cautelas WHERE status = 'Ativa'")->fetchColumn(),
    'ultimas'        => $db->query('SELECT tipo, item_nome, quantidade, data FROM movimentacoes ORDER BY data DESC, id DESC LIMIT 5')->fetchAll(),
]);
