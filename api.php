<?php
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true) ?? [];

// Helper para buscar todo o estado do banco no formato idêntico ao store.ts original
function fetchAllState(PDO $pdo, ?array $user): array {
    if (!$user) {
        return [
            'ok' => true,
            'profile' => null,
            'items' => [],
            'shelves' => [],
            'atiradores' => [],
            'cautelas' => [],
            'movs' => []
        ];
    }

    // 1. Items
    $items = $pdo->query("SELECT id, nome, tipo, quantidade, prateleira, condicao, situacao FROM items ORDER BY id ASC")->fetchAll();
    foreach ($items as &$i) {
        $i['quantidade'] = (int)$i['quantidade'];
    }

    // 2. Shelves
    $shelves = $pdo->query("SELECT id, codigo, descricao, setor FROM shelves ORDER BY codigo ASC")->fetchAll();

    // 3. Atiradores
    $rowsAt = $pdo->query("SELECT * FROM atiradores ORDER BY numero ASC")->fetchAll();
    $atiradores = array_map(fn($a) => [
        'id' => $a['id'],
        'numero' => $a['numero'],
        'nome' => $a['nome'],
        'contato' => $a['contato'],
        'tipoSanguineo' => $a['tipo_sanguineo'],
        'altura' => $a['altura'],
        'calcado' => $a['calcado'],
        'roupa' => $a['roupa'],
        'cabeca' => $a['cabeca'],
        'endereco' => $a['endereco'],
        'nascimento' => $a['nascimento'] ?? ''
    ], $rowsAt);

    // 4. Movs
    $rowsMov = $pdo->query("SELECT * FROM movs ORDER BY data DESC")->fetchAll();
    $movs = array_map(fn($m) => [
        'id' => $m['id'],
        'tipo' => $m['tipo'],
        'itemId' => $m['item_id'],
        'itemNome' => $m['item_nome'],
        'quantidade' => (int)$m['quantidade'],
        'data' => date('Y-m-d\TH:i:s', strtotime($m['data'])),
        'atiradorId' => $m['atirador_id']
    ], $rowsMov);

    // 5. Cautelas + Itens da Cautela
    $rowsCau = $pdo->query("SELECT * FROM cautelas ORDER BY numero ASC")->fetchAll();
    $rowsCauItens = $pdo->query("SELECT * FROM cautela_itens ORDER BY id ASC")->fetchAll();
    $itensPorCautela = [];
    foreach ($rowsCauItens as $ci) {
        $itensPorCautela[$ci['cautela_id']][] = [
            'itemId' => $ci['item_id'],
            'itemNome' => $ci['item_nome'],
            'quantidade' => (int)$ci['quantidade'],
            'devolvido' => (int)$ci['devolvido']
        ];
    }

    $cautelas = array_map(fn($c) => [
        'id' => $c['id'],
        'numero' => $c['numero'],
        'atiradorId' => $c['atirador_id'],
        'responsavel' => $c['responsavel'],
        'retirada' => $c['retirada'],
        'retorno' => $c['retorno'],
        'status' => $c['status'],
        'itens' => $itensPorCautela[$c['id']] ?? []
    ], $rowsCau);

    return [
        'ok' => true,
        'profile' => $user,
        'items' => $items,
        'shelves' => $shelves,
        'atiradores' => $atiradores,
        'cautelas' => $cautelas,
        'movs' => $movs
    ];
}

switch ($action) {
    // ==========================================================
    // SESSÃO E ESTADO INICIAL
    // ==========================================================
    case 'bootstrap':
        $user = $_SESSION['user'] ?? null;
        if ($user) {
            // Sincroniza dados atualizados do banco
            $stmt = $pdo->prepare("SELECT id, nome, email, posto FROM users WHERE id = ?");
            $stmt->execute([$user['id']]);
            $fresh = $stmt->fetch();
            if ($fresh) {
                $_SESSION['user'] = $fresh;
                $user = $fresh;
            } else {
                unset($_SESSION['user']);
                $user = null;
            }
        }
        jsonResponse(fetchAllState($pdo, $user));

    // ==========================================================
    // AUTENTICAÇÃO (LOGIN, CADASTRO, LOGOUT, CONTA)
    // ==========================================================
    case 'login':
        $email = trim($body['email'] ?? '');
        $senha = $body['senha'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $u = $stmt->fetch();

        if (!$u || !password_verify($senha, $u['senha'])) {
            jsonResponse(['ok' => false, 'error' => 'E-mail ou senha inválidos.'], 401);
        }

        $_SESSION['user'] = [
            'id' => (string)$u['id'],
            'nome' => $u['nome'],
            'email' => $u['email'],
            'posto' => $u['posto']
        ];
        jsonResponse(fetchAllState($pdo, $_SESSION['user']));

    case 'register':
        $nome = trim($body['nome'] ?? '');
        $email = trim($body['email'] ?? '');
        $posto = trim($body['posto'] ?? 'Soldado');
        $senha = $body['senha'] ?? '';

        if (!$nome || !$email || strlen($senha) < 6) {
            jsonResponse(['ok' => false, 'error' => 'Preencha todos os campos (senha mínima de 6 caracteres).'], 400);
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            jsonResponse(['ok' => false, 'error' => 'E-mail já cadastrado.'], 409);
        }

        $hash = password_hash($senha, PASSWORD_DEFAULT);
        $ins = $pdo->prepare("INSERT INTO users (nome, email, senha, posto) VALUES (?, ?, ?, ?)");
        $ins->execute([$nome, $email, $hash, $posto]);
        $newId = (string)$pdo->lastInsertId();

        $_SESSION['user'] = [
            'id' => $newId,
            'nome' => $nome,
            'email' => $email,
            'posto' => $posto
        ];
        jsonResponse(fetchAllState($pdo, $_SESSION['user']));

    case 'logout':
        session_destroy();
        jsonResponse(['ok' => true]);

    case 'update_profile':
        $user = requireAuth();
        $nome = trim($body['nome'] ?? '');
        $posto = trim($body['posto'] ?? 'Soldado');
        if (!$nome) {
            jsonResponse(['ok' => false, 'error' => 'Informe o nome.'], 400);
        }
        $stmt = $pdo->prepare("UPDATE users SET nome = ?, posto = ? WHERE id = ?");
        $stmt->execute([$nome, $posto, $user['id']]);
        $_SESSION['user']['nome'] = $nome;
        $_SESSION['user']['posto'] = $posto;
        jsonResponse(['ok' => true, 'profile' => $_SESSION['user']]);

    case 'update_email':
        $user = requireAuth();
        $novoEmail = trim($body['email'] ?? '');
        if (!filter_var($novoEmail, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['ok' => false, 'error' => 'Informe um e-mail válido.'], 400);
        }
        $check = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $check->execute([$novoEmail, $user['id']]);
        if ($check->fetch()) {
            jsonResponse(['ok' => false, 'error' => 'Este e-mail já está em uso por outra conta.'], 409);
        }
        $stmt = $pdo->prepare("UPDATE users SET email = ? WHERE id = ?");
        $stmt->execute([$novoEmail, $user['id']]);
        $_SESSION['user']['email'] = $novoEmail;
        jsonResponse(['ok' => true, 'profile' => $_SESSION['user'], 'message' => 'E-mail atualizado com sucesso no banco de dados.']);

    case 'update_password':
        $user = requireAuth();
        $novaSenha = $body['senha'] ?? '';
        if (strlen($novaSenha) < 6) {
            jsonResponse(['ok' => false, 'error' => 'Senha mínima de 6 caracteres.'], 400);
        }
        $hash = password_hash($novaSenha, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("UPDATE users SET senha = ? WHERE id = ?");
        $stmt->execute([$hash, $user['id']]);
        jsonResponse(['ok' => true, 'message' => 'Senha atualizada com sucesso.']);

    case 'delete_account':
        $user = requireAuth();
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$user['id']]);
        session_destroy();
        jsonResponse(['ok' => true]);

    // ==========================================================
    // ITENS DO ALMOXARIFADO
    // ==========================================================
    case 'save_item':
        $user = requireAuth();
        $id = trim($body['id'] ?? '');
        $nome = trim($body['nome'] ?? '');
        $tipo = trim($body['tipo'] ?? 'Uniforme');
        $quantidade = max(0, (int)($body['quantidade'] ?? 0));
        $prateleira = trim($body['prateleira'] ?? '');
        $condicao = trim($body['condicao'] ?? 'Bom');
        $situacao = trim($body['situacao'] ?? 'Disponível');

        if (!$nome) {
            jsonResponse(['ok' => false, 'error' => 'Informe o nome do item.'], 400);
        }

        if ($id) {
            $stmt = $pdo->prepare("UPDATE items SET nome=?, tipo=?, quantidade=?, prateleira=?, condicao=?, situacao=? WHERE id=?");
            $stmt->execute([$nome, $tipo, $quantidade, $prateleira, $condicao, $situacao, $id]);
        } else {
            // Gera código ITM-XXX igual ao original
            $rows = $pdo->query("SELECT id FROM items")->fetchAll();
            $max = 0;
            foreach ($rows as $r) {
                $parts = explode('-', $r['id']);
                $num = isset($parts[1]) ? (int)$parts[1] : 0;
                if ($num > $max) $max = $num;
            }
            $newId = 'ITM-' . str_pad((string)($max + 1), 3, '0', STR_PAD_LEFT);
            $stmt = $pdo->prepare("INSERT INTO items (id, nome, tipo, quantidade, prateleira, condicao, situacao) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$newId, $nome, $tipo, $quantidade, $prateleira, $condicao, $situacao]);
        }
        jsonResponse(fetchAllState($pdo, $user));

    case 'delete_item':
        $user = requireAuth();
        $id = $body['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM items WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(fetchAllState($pdo, $user));

    // ==========================================================
    // PRATELEIRAS
    // ==========================================================
    case 'add_shelf':
        $user = requireAuth();
        $codigo = strtoupper(trim($body['codigo'] ?? ''));
        $descricao = trim($body['descricao'] ?? '');
        $setor = trim($body['setor'] ?? '');

        if (!$codigo) {
            jsonResponse(['ok' => false, 'error' => 'Informe o código.'], 400);
        }
        $check = $pdo->prepare("SELECT id FROM shelves WHERE codigo = ?");
        $check->execute([$codigo]);
        if ($check->fetch()) {
            jsonResponse(['ok' => false, 'error' => 'Código já existe.'], 409);
        }

        $stmt = $pdo->prepare("INSERT INTO shelves (id, codigo, descricao, setor) VALUES (?, ?, ?, ?)");
        $stmt->execute([uid(), $codigo, $descricao, $setor]);
        jsonResponse(fetchAllState($pdo, $user));

    case 'delete_shelf':
        $user = requireAuth();
        $id = $body['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM shelves WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(fetchAllState($pdo, $user));

    // ==========================================================
    // ATIRADORES
    // ==========================================================
    case 'save_atirador':
        $user = requireAuth();
        $id = trim($body['id'] ?? '');
        $numero = trim($body['numero'] ?? '');
        $nome = trim($body['nome'] ?? '');
        $contato = trim($body['contato'] ?? '');
        $tipoSanguineo = trim($body['tipoSanguineo'] ?? 'O+');
        $altura = trim($body['altura'] ?? '');
        $calcado = trim($body['calcado'] ?? '');
        $roupa = trim($body['roupa'] ?? 'M');
        $cabeca = trim($body['cabeca'] ?? '');
        $endereco = trim($body['endereco'] ?? '');
        $nascimento = !empty($body['nascimento']) ? $body['nascimento'] : null;

        if (!$nome || !$numero || !$contato) {
            jsonResponse(['ok' => false, 'error' => 'Preencha número, nome e contato.'], 400);
        }

        if ($id) {
            $stmt = $pdo->prepare("UPDATE atiradores SET numero=?, nome=?, contato=?, tipo_sanguineo=?, altura=?, calcado=?, roupa=?, cabeca=?, endereco=?, nascimento=? WHERE id=?");
            $stmt->execute([$numero, $nome, $contato, $tipoSanguineo, $altura, $calcado, $roupa, $cabeca, $endereco, $nascimento, $id]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO atiradores (id, numero, nome, contato, tipo_sanguineo, altura, calcado, roupa, cabeca, endereco, nascimento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([uid(), $numero, $nome, $contato, $tipoSanguineo, $altura, $calcado, $roupa, $cabeca, $endereco, $nascimento]);
        }
        jsonResponse(fetchAllState($pdo, $user));

    case 'delete_atirador':
        $user = requireAuth();
        $id = $body['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM atiradores WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(fetchAllState($pdo, $user));

    // ==========================================================
    // MOVIMENTAÇÕES (ENTRADA / SAÍDA)
    // ==========================================================
    case 'add_mov':
        $user = requireAuth();
        $tipo = ($body['tipo'] ?? 'Saída') === 'Entrada' ? 'Entrada' : 'Saída';
        $itemId = trim($body['itemId'] ?? '');
        $quantidade = (int)($body['quantidade'] ?? 1);
        $atiradorId = !empty($body['atiradorId']) ? $body['atiradorId'] : null;

        $stmtItem = $pdo->prepare("SELECT * FROM items WHERE id = ?");
        $stmtItem->execute([$itemId]);
        $item = $stmtItem->fetch();

        if (!$item || $quantidade < 1) {
            jsonResponse(['ok' => false, 'error' => 'Selecione um item e quantidade válida.'], 400);
        }

        $comum = in_array($item['tipo'], ['Limpeza', 'Construção'], true);
        if (!$comum && !$atiradorId) {
            jsonResponse(['ok' => false, 'error' => 'Este item deve ser vinculado a um atirador.'], 400);
        }

        if ($tipo === 'Saída' && $quantidade > (int)$item['quantidade']) {
            jsonResponse(['ok' => false, 'error' => "Estoque insuficiente ({$item['quantidade']})."], 400);
        }

        $delta = $tipo === 'Entrada' ? $quantidade : -$quantidade;
        $pdo->beginTransaction();
        try {
            $up = $pdo->prepare("UPDATE items SET quantidade = quantidade + ? WHERE id = ?");
            $up->execute([$delta, $item['id']]);

            $ins = $pdo->prepare("INSERT INTO movs (id, tipo, item_id, item_nome, quantidade, data, atirador_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $ins->execute([
                uid(),
                $tipo,
                $item['id'],
                $item['nome'],
                $quantidade,
                date('Y-m-d H:i:s'),
                $comum ? null : $atiradorId
            ]);
            $pdo->commit();
        } catch (Throwable $t) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'error' => 'Erro ao registrar movimentação.'], 500);
        }

        jsonResponse(fetchAllState($pdo, $user));

    // ==========================================================
    // CAUTELAS (GERAR E DEVOLVER)
    // ==========================================================
    case 'create_cautela':
        $user = requireAuth();
        $atiradorId = trim($body['atiradorId'] ?? '');
        $retirada = trim($body['retirada'] ?? '');
        $retorno = trim($body['retorno'] ?? '');
        $itens = $body['itens'] ?? [];

        $stmtAt = $pdo->prepare("SELECT * FROM atiradores WHERE id = ?");
        $stmtAt->execute([$atiradorId]);
        $at = $stmtAt->fetch();

        if (!$at || !$retorno) {
            jsonResponse(['ok' => false, 'error' => 'Selecione o atirador e a data de retorno.'], 400);
        }
        if (empty($itens)) {
            jsonResponse(['ok' => false, 'error' => 'Este atirador não possui itens registrados em Entrada/Saída.'], 400);
        }

        $count = (int)$pdo->query("SELECT COUNT(*) FROM cautelas")->fetchColumn();
        $numero = 'CAU-' . str_pad((string)($count + 1), 4, '0', STR_PAD_LEFT);
        $cautelaId = uid();

        $pdo->beginTransaction();
        try {
            $ins = $pdo->prepare("INSERT INTO cautelas (id, numero, atirador_id, responsavel, retirada, retorno, status) VALUES (?, ?, ?, ?, ?, ?, 'Ativa')");
            $ins->execute([$cautelaId, $numero, $at['id'], $at['nome'], $retirada, $retorno]);

            $insItem = $pdo->prepare("INSERT INTO cautela_itens (cautela_id, item_id, item_nome, quantidade, devolvido) VALUES (?, ?, ?, ?, ?)");
            foreach ($itens as $it) {
                $insItem->execute([
                    $cautelaId,
                    $it['itemId'] ?? '—',
                    $it['itemNome'] ?? '',
                    (int)($it['quantidade'] ?? 1),
                    (int)($it['devolvido'] ?? 0)
                ]);
            }
            $pdo->commit();
        } catch (Throwable $t) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'error' => 'Erro ao gerar cautela: ' . $t->getMessage()], 500);
        }

        $state = fetchAllState($pdo, $user);
        $state['createdCautelaId'] = $cautelaId;
        jsonResponse($state);

    case 'devolver_cautela':
        $user = requireAuth();
        $cautelaId = trim($body['id'] ?? '');

        $stmtC = $pdo->prepare("SELECT * FROM cautelas WHERE id = ?");
        $stmtC->execute([$cautelaId]);
        $cautela = $stmtC->fetch();
        if (!$cautela || $cautela['status'] === 'Devolvida') {
            jsonResponse(['ok' => false, 'error' => 'Cautela não encontrada ou já devolvida.'], 400);
        }

        $stmtItens = $pdo->prepare("SELECT * FROM cautela_itens WHERE cautela_id = ?");
        $stmtItens->execute([$cautelaId]);
        $cItens = $stmtItens->fetchAll();

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE cautelas SET status = 'Devolvida' WHERE id = ?")->execute([$cautelaId]);

            $upItem = $pdo->prepare("UPDATE items SET quantidade = quantidade + ? WHERE id = ?");
            $insMov = $pdo->prepare("INSERT INTO movs (id, tipo, item_id, item_nome, quantidade, data, atirador_id) VALUES (?, 'Entrada', ?, ?, ?, ?, ?)");

            foreach ($cItens as $ci) {
                $restante = max(0, (int)$ci['quantidade'] - (int)$ci['devolvido']);
                if ($restante > 0) {
                    $upItem->execute([$restante, $ci['item_id']]);
                    $insMov->execute([
                        uid(),
                        $ci['item_id'],
                        $ci['item_nome'],
                        $restante,
                        date('Y-m-d H:i:s'),
                        $cautela['atirador_id']
                    ]);
                }
            }
            $pdo->commit();
        } catch (Throwable $t) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'error' => 'Erro ao devolver cautela.'], 500);
        }

        jsonResponse(fetchAllState($pdo, $user));

    default:
        jsonResponse(['ok' => false, 'error' => 'Ação inválida.'], 400);
}
