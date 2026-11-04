// ==========================================================
// APLICAÇÃO FRONT-END (HTML + CSS + JS PURO CONECTADO AO PHP)
// Conversão fiel de todas as rotas e regras do Projeto em Foco
// ==========================================================

const TIPOS_COMUNS = ["Limpeza", "Construção"];
const isComum = (item) => item && TIPOS_COMUNS.includes(item.tipo);

const state = {
  loaded: false,
  route: "login", // login | cadastro | redefinir | painel | atiradores | itens | prateleiras | cautelas | movimentacoes | configuracoes
  profile: null,
  items: [],
  shelves: [],
  atiradores: [],
  cautelas: [],
  movs: [],
  // Estados locais de UI por tela
  itemForm: null,
  itemSearch: "",
  atiradorForm: null,
  atiradorVer: null,
  cautelaOpen: false,
  cautelaForm: { atiradorId: "", retirada: new Date().toISOString().slice(0, 10), retorno: "" },
  movForm: { tipo: "Saída", itemId: "", quantidade: 1, atiradorId: "" },
};

// Utilitários de formatação e escape
function esc(v) {
  return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d.length === 10 ? d + "T00:00:00" : d);
  return isNaN(dt) ? d : dt.toLocaleDateString("pt-BR");
}

function fmtDateTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Calcula os itens vinculados ao atirador com base nas entradas/saídas */
function itensDoAtirador(atiradorId) {
  const m = new Map();
  // Percorre do mais antigo ao mais recente ou soma todos
  for (const mv of state.movs) {
    if (mv.atiradorId !== atiradorId) continue;
    const key = mv.itemId || mv.itemNome;
    const foundItem = state.items.find((i) => i.id === mv.itemId);
    const cur = m.get(key) || {
      itemId: mv.itemId || "—",
      itemNome: foundItem ? foundItem.nome : mv.itemNome,
      quantidade: 0,
      devolvido: 0,
    };
    if (mv.tipo === "Saída") cur.quantidade += Number(mv.quantidade);
    else cur.devolvido = (cur.devolvido || 0) + Number(mv.quantidade);
    m.set(key, cur);
  }
  return [...m.values()];
}

// ==========================================================
// COMUNICAÇÃO COM O BACKEND PHP (api.php)
// ==========================================================
async function api(action, payload = null) {
  const opts = {
    method: payload ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
  };
  if (payload) opts.body = JSON.stringify(payload);
  const res = await fetch(`api.php?action=${encodeURIComponent(action)}`, opts);
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || "Erro na comunicação com o servidor.");
  }
  return data;
}

function syncStateFromServer(data) {
  state.profile = data.profile ?? null;
  state.items = data.items ?? [];
  state.shelves = data.shelves ?? [];
  state.atiradores = data.atiradores ?? [];
  state.cautelas = data.cautelas ?? [];
  state.movs = data.movs ?? [];
  if (!state.movForm.itemId && state.items.length > 0) {
    state.movForm.itemId = state.items[0].id;
  }
}

function navigate(route, params = {}) {
  state.route = route;
  if (route === "itens" && params.novo) {
    state.itemForm = {
      nome: "",
      tipo: "Uniforme",
      quantidade: 1,
      prateleira: state.shelves[0]?.codigo ?? "",
      condicao: "Bom",
      situacao: "Disponível",
    };
  }
  if (route === "cautelas" && params.novo) {
    state.cautelaOpen = true;
  }
  window.location.hash = route;
  render();
}

// ==========================================================
// IMPRESSÃO DE TERMO DE CAUTELA (PDF)
// ==========================================================
function printCautela(c, a) {
  const w = window.open("", "_blank");
  if (!w) return alert("Permita pop-ups para visualizar o PDF da cautela.");
  const at = a || { nome: c.responsavel };
  const row = (k, v) => `<tr><th>${k}</th><td>${esc(v || "—")}</td></tr>`;
  w.document.write(`<html><head><title>${esc(c.numero)}</title><style>
    body{font-family:Arial,sans-serif;padding:40px;color:#111}
    h1{font-size:20px;margin-bottom:4px}
    h2{font-size:16px;margin-top:0;color:#333}
    h3{margin-top:24px;margin-bottom:8px;font-size:14px;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}
    td,th{border:1px solid #333;padding:6px;text-align:left}
    th{background:#f3f3f3}
    .sig{margin-top:80px;display:flex;justify-content:space-between}
    .sig div{border-top:1px solid #000;width:40%;text-align:center;padding-top:6px;font-size:13px}
  </style></head><body>
  <h1>TIRO DE GUERRA 02-076 — ITAPETININGA</h1>
  <h2>Termo de Cautela ${esc(c.numero)}</h2>
  <h3>Dados do atirador</h3>
  <table>
    ${row("Número", at.numero)}
    ${row("Nome", at.nome)}
    ${row("Contato", at.contato)}
    ${row("Data de nascimento", at.nascimento && fmtDate(at.nascimento))}
    ${row("Tipo sanguíneo", at.tipoSanguineo)}
    ${row("Altura", at.altura)}
    ${row("Tamanho do pé", at.calcado)}
    ${row("Tamanho de roupa", at.roupa)}
    ${row("Tamanho da cabeça", at.cabeca)}
    ${row("Endereço", at.endereco)}
  </table>
  <h3>Itens cautelados</h3>
  <table>
    <tr><th>#</th><th>Código</th><th>Item</th><th>Recebido</th><th>Devolvido</th><th>Em posse</th></tr>
    ${(c.itens || []).map((i, n) => `<tr>
      <td>${n + 1}</td>
      <td>${esc(i.itemId)}</td>
      <td>${esc(i.itemNome)}</td>
      <td>${i.quantidade}</td>
      <td>${i.devolvido ?? 0}</td>
      <td>${Math.max(0, i.quantidade - (i.devolvido ?? 0))}</td>
    </tr>`).join("")}
  </table>
  <p>Total de itens diferentes: ${(c.itens || []).length}</p>
  <p>Retirada: ${fmtDate(c.retirada)} · Retorno previsto: ${fmtDate(c.retorno)} · Status: ${esc(c.status)}</p>
  <p>Declaro ter recebido o(s) material(is) acima, comprometendo-me a zelar por sua conservação e devolvê-lo(s) na data prevista.</p>
  <div class="sig"><div>Atirador</div><div>Encarregado do Almoxarifado</div></div>
  <script>window.print()</script></body></html>`);
  w.document.close();
}

// ==========================================================
// COMPONENTES DE LAYOUT (EMBLEMA, AUTH SHELL, SIDEBAR, HEADER)
// ==========================================================
function renderEmblem() {
  return `<div class="emblem"><span>TG</span><span>02-076</span></div>`;
}

function renderAuthShell(title, innerHtml) {
  return `
    <div class="auth-wrapper">
      <div class="panel auth-card">
        <div class="auth-header">
          ${renderEmblem()}
          <div>
            <h1 class="font-display text-xl">${esc(title)}</h1>
            <p class="text-xs text-muted">Tiro de Guerra 02-076 · Itapetininga</p>
          </div>
        </div>
        ${innerHtml}
      </div>
    </div>
  `;
}

function renderPageHeader(title, sub, actionHtml = "") {
  return `
    <div class="page-header">
      <div>
        <h1 class="font-display text-2xl">${esc(title)}</h1>
        <p class="text-sm text-muted">${esc(sub)}</p>
      </div>
      ${actionHtml}
    </div>
  `;
}

// ==========================================================
// TELAS DE AUTENTICAÇÃO
// ==========================================================
function renderLogin() {
  return renderAuthShell(
    "Sistema de Almoxarifado",
    `
    <form id="form-login" class="space-y-4">
      <div>
        <label class="label">E-mail</label>
        <input class="field" name="email" type="email" placeholder="admin@tg.local" required />
      </div>
      <div>
        <label class="label">Senha</label>
        <input class="field" name="senha" type="password" placeholder="Digite sua senha" required />
      </div>
      <p id="login-err" class="text-sm text-destructive" style="display:none"></p>
      <button type="submit" class="btn-primary w-full" id="btn-login">Entrar</button>
      <button type="button" class="btn-outline w-full" data-nav="cadastro">Cadastrar novo usuário</button>
      <p class="text-xs text-muted" style="text-align:center; padding-top:0.25rem;">
        Acesso inicial padrão: <b>admin@tg.local</b> / Senha: <b>123456</b>
      </p>
    </form>
    `
  );
}

function renderCadastro() {
  const postos = ["Soldado", "Cabo", "Sargento", "Subtenente", "Tenente"];
  return renderAuthShell(
    "Cadastro de usuário",
    `
    <form id="form-cadastro" class="space-y-3">
      <div>
        <label class="label">Nome completo</label>
        <input class="field" name="nome" placeholder="Subtenente Monteiro" required />
      </div>
      <div>
        <label class="label">E-mail</label>
        <input class="field" name="email" type="email" placeholder="seu@email.com" required />
      </div>
      <div>
        <label class="label">Posto / Graduação</label>
        <select class="field" name="posto">
          ${postos.map((p) => `<option value="${p}">${p}</option>`).join("")}
        </select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">Senha</label>
          <input type="password" class="field" name="senha" required />
        </div>
        <div>
          <label class="label">Confirmar</label>
          <input type="password" class="field" name="confirma" required />
        </div>
      </div>
      <p id="cad-err" class="text-sm text-destructive" style="display:none"></p>
      <button type="submit" class="btn-primary w-full">Cadastrar</button>
      <button type="button" class="btn-outline w-full" data-nav="login">Voltar ao login</button>
    </form>
    `
  );
}

// ==========================================================
// TELAS INTERNAS DO SISTEMA (_app)
// ==========================================================
function renderPainel() {
  const totalEstoque = state.items.reduce((a, i) => a + Number(i.quantidade), 0);
  const cautelasAtivas = state.cautelas.filter((c) => c.status === "Ativa").length;
  const stats = [
    ["Itens em estoque", totalEstoque],
    ["Itens cadastrados", state.items.length],
    ["Prateleiras", state.shelves.length],
    ["Cautelas ativas", cautelasAtivas],
  ];
  const movs = [...state.movs].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);

  return `
    ${renderPageHeader("Painel de controle", "Resumo das operações do almoxarifado.")}
    <div class="grid grid-cols-2 gap-4 lg-grid-cols-4">
      ${stats
        .map(
          ([l, v]) => `
        <div class="panel">
          <p class="text-xs text-muted">${esc(l)}</p>
          <p class="mt-1 font-display text-3xl">${v}</p>
        </div>
      `
        )
        .join("")}
    </div>
    <div class="mt-4 grid gap-4 lg-grid-cols-2">
      <div class="panel">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-bold">Últimas movimentações</h2>
          <button class="btn-outline" data-nav="movimentacoes">Ver todas</button>
        </div>
        <ul class="space-y-1-5 text-sm" style="list-style:none;">
          ${
            movs.length === 0
              ? `<li class="text-muted">Nenhuma movimentação registrada.</li>`
              : movs
                  .map(
                    (m) => `
              <li>
                <span class="${m.tipo === "Entrada" ? "text-primary" : "text-accent"} font-semibold">${esc(m.tipo)}</span> — ${esc(m.itemNome)} (${m.quantidade}) · <span class="text-muted">${fmtDateTime(m.data)}</span>
              </li>
            `
                  )
                  .join("")
          }
        </ul>
      </div>
      <div class="panel">
        <h2 class="mb-3 font-bold">Ações rápidas</h2>
        <div class="grid grid-cols-2 gap-3">
          <button class="btn-primary" data-nav="itens" data-novo="1">Cadastrar item</button>
          <button class="btn-primary" data-nav="prateleiras">Nova prateleira</button>
          <button class="btn-accent" data-nav="cautelas" data-novo="1">Gerar cautela</button>
          <button class="btn-outline" data-nav="itens">Consultar itens</button>
        </div>
      </div>
    </div>
  `;
}

function renderItens() {
  const tipos = ["Uniforme", "Vestuário", "Acessório", "Equipamento", "Material de expediente", "Limpeza", "Construção"];
  const condicoes = ["Novo", "Bom", "Regular", "Inservível"];
  const situacoes = ["Disponível", "Em cautela", "Indisponível"];
  const q = state.itemSearch.toLowerCase();
  const list = state.items.filter((i) => (i.nome + i.tipo + i.id + i.prateleira).toLowerCase().includes(q));
  const f = state.itemForm;

  return `
    ${renderPageHeader(
      "Itens",
      "Materiais cadastrados e seus status.",
      `<button class="btn-primary" id="btn-novo-item">Cadastrar item</button>`
    )}

    ${
      f
        ? `
      <form id="form-item" class="panel mb-5 grid gap-3 md-grid-cols-3">
        <h2 class="font-bold md-col-span-3">${f.id ? `Editar ${esc(f.id)}` : "Cadastro de item"}</h2>
        <div>
          <label class="label">Nome</label>
          <input class="field" name="nome" value="${esc(f.nome)}" placeholder="Coturno" required />
        </div>
        <div>
          <label class="label">Tipo</label>
          <select class="field" name="tipo">
            ${tipos.map((t) => `<option value="${t}" ${f.tipo === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="label">Quantidade</label>
          <input type="number" min="0" class="field" name="quantidade" value="${Number(f.quantidade)}" required />
        </div>
        <div>
          <label class="label">Prateleira</label>
          <select class="field" name="prateleira">
            ${state.shelves.map((p) => `<option value="${esc(p.codigo)}" ${f.prateleira === p.codigo ? "selected" : ""}>${esc(p.codigo)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="label">Condição</label>
          <select class="field" name="condicao">
            ${condicoes.map((t) => `<option value="${t}" ${f.condicao === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="label">Situação</label>
          <select class="field" name="situacao">
            ${situacoes.map((t) => `<option value="${t}" ${f.situacao === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
        <div class="flex gap-2 md-col-span-3 md-justify-end">
          <button type="button" class="btn-outline" id="btn-cancel-item">Cancelar</button>
          <button type="submit" class="btn-primary">Salvar</button>
        </div>
      </form>
    `
        : ""
    }

    <div class="panel overflow-x-auto">
      <input class="field mb-3 max-w-xs" id="input-search-item" placeholder="Buscar item..." value="${esc(state.itemSearch)}" />
      <table class="tbl">
        <thead>
          <tr><th>Código</th><th>Nome</th><th>Tipo</th><th>Prateleira</th><th>Qtd.</th><th>Situação</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${list
            .map(
              (i) => `
            <tr>
              <td class="font-mono text-xs">${esc(i.id)}</td>
              <td>${esc(i.nome)}</td>
              <td>${esc(i.tipo)}</td>
              <td>${esc(i.prateleira)}</td>
              <td>${i.quantidade}</td>
              <td>
                <span class="${i.situacao === "Disponível" ? "badge-ok" : i.situacao === "Em cautela" ? "badge-warn" : "badge-off"}">
                  ${esc(i.situacao)}
                </span>
              </td>
              <td class="whitespace-nowrap">
                <button class="btn-outline btn-sm" data-edit-item="${esc(i.id)}" title="Editar">✎</button>
                <button class="btn-danger btn-sm" data-del-item="${esc(i.id)}" title="Excluir">×</button>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPrateleiras() {
  return `
    ${renderPageHeader("Prateleiras", "Locais de armazenamento e itens em cada um.")}
    <form id="form-shelf" class="panel mb-5 grid gap-3 md-grid-cols-4 md-items-end">
      <div>
        <label class="label">Código</label>
        <input class="field" name="codigo" placeholder="C-01" style="text-transform:uppercase" required />
      </div>
      <div>
        <label class="label">Descrição</label>
        <input class="field" name="descricao" placeholder="Equipamentos" />
      </div>
      <div>
        <label class="label">Setor</label>
        <input class="field" name="setor" placeholder="Geral" />
      </div>
      <button type="submit" class="btn-primary">Nova prateleira</button>
      <p id="shelf-err" class="text-sm text-destructive md-col-span-4" style="display:none"></p>
    </form>

    <div class="grid gap-4 md-grid-cols-2 xl-grid-cols-3">
      ${state.shelves
        .map((p) => {
          const its = state.items.filter((i) => i.prateleira === p.codigo);
          return `
          <div class="panel">
            <div class="flex items-start justify-between">
              <div>
                <p class="font-display text-2xl text-primary">${esc(p.codigo)}</p>
                <p class="text-sm">${esc(p.descricao)}</p>
                <p class="text-xs text-muted">${esc(p.setor)}</p>
              </div>
              <button class="btn-danger btn-sm" data-del-shelf="${esc(p.id)}" ${its.length > 0 ? 'disabled title="Possui itens"' : ""}>×</button>
            </div>
            <ul class="mt-3 space-y-1-5 border-t pt-3 text-sm" style="list-style:none;">
              ${its.length === 0 ? `<li class="text-muted">Sem itens</li>` : ""}
              ${its.map((i) => `<li class="flex justify-between"><span>${esc(i.nome)}</span><span class="text-muted">${i.quantidade}</span></li>`).join("")}
            </ul>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function renderAtiradores() {
  const f = state.atiradorForm;
  const sangues = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const roupas = ["PP", "P", "M", "G", "GG", "XG"];

  return `
    ${renderPageHeader(
      "Atiradores",
      "Dados essenciais e medidas de cada atirador.",
      `<button class="btn-primary" id="btn-novo-atirador">Cadastrar atirador</button>`
    )}

    ${
      f
        ? `
      <form id="form-atirador" class="panel mb-5 grid gap-3 md-grid-cols-3">
        <h2 class="font-bold md-col-span-3">${f.id ? "Editar atirador" : "Novo atirador"}</h2>
        <div>
          <label class="label">Número</label>
          <input class="field" name="numero" value="${esc(f.numero)}" required />
        </div>
        <div class="md-col-span-2">
          <label class="label">Nome completo</label>
          <input class="field" name="nome" value="${esc(f.nome)}" required />
        </div>
        <div>
          <label class="label">Contato (telefone)</label>
          <input class="field" name="contato" value="${esc(f.contato)}" required />
        </div>
        <div>
          <label class="label">Data de nascimento</label>
          <input type="date" class="field" name="nascimento" value="${esc(f.nascimento)}" />
        </div>
        <div>
          <label class="label">Altura (m)</label>
          <input class="field" name="altura" value="${esc(f.altura)}" />
        </div>
        <div>
          <label class="label">Tamanho do pé</label>
          <input class="field" name="calcado" value="${esc(f.calcado)}" />
        </div>
        <div>
          <label class="label">Tamanho da cabeça</label>
          <input class="field" name="cabeca" value="${esc(f.cabeca)}" />
        </div>
        <div class="md-col-span-2">
          <label class="label">Endereço</label>
          <input class="field" name="endereco" value="${esc(f.endereco)}" />
        </div>
        <div>
          <label class="label">Tipo sanguíneo</label>
          <select class="field" name="tipoSanguineo">
            ${sangues.map((t) => `<option value="${t}" ${f.tipoSanguineo === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="label">Tamanho de roupa</label>
          <select class="field" name="roupa">
            ${roupas.map((t) => `<option value="${t}" ${f.roupa === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
        <p id="atirador-err" class="text-sm text-destructive md-col-span-3" style="display:none"></p>
        <div class="flex gap-2 md-col-span-3 md-justify-end">
          <button type="button" class="btn-outline" id="btn-cancel-atirador">Cancelar</button>
          <button type="submit" class="btn-primary">Salvar</button>
        </div>
      </form>
    `
        : ""
    }

    <div class="panel overflow-x-auto">
      <table class="tbl">
        <thead>
          <tr><th>Nº</th><th>Nome</th><th>Contato</th><th>Sangue</th><th>Altura</th><th>Pé</th><th>Roupa</th><th>Cabeça</th><th>Nascimento</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${state.atiradores
            .map((a) => {
              const vinculados = itensDoAtirador(a.id);
              return `
              <tr>
                <td class="font-mono text-xs">${esc(a.numero)}</td>
                <td>${esc(a.nome)}</td>
                <td>${esc(a.contato)}</td>
                <td>${esc(a.tipoSanguineo)}</td>
                <td>${esc(a.altura)}</td>
                <td>${esc(a.calcado)}</td>
                <td>${esc(a.roupa)}</td>
                <td>${esc(a.cabeca)}</td>
                <td>${fmtDate(a.nascimento)}</td>
                <td class="whitespace-nowrap">
                  <button class="btn-outline btn-sm" data-ver-atirador="${esc(a.id)}">Itens</button>
                  <button class="btn-outline btn-sm" data-edit-atirador="${esc(a.id)}" title="Editar">✎</button>
                  <button class="btn-danger btn-sm" data-del-atirador="${esc(a.id)}" title="Excluir">×</button>
                </td>
              </tr>
              ${
                state.atiradorVer === a.id
                  ? `
                <tr>
                  <td colspan="10" style="background: var(--secondary-alpha);" class="text-sm">
                    <b>Endereço:</b> ${esc(a.endereco || "—")}<br/>
                    <b>Itens vinculados:</b> ${
                      vinculados.length
                        ? vinculados
                            .map((i) => `${esc(i.itemNome)} × ${i.quantidade}${i.devolvido ? ` (devolvido ${i.devolvido})` : ""}`)
                            .join(", ")
                        : "nenhum"
                    }
                  </td>
                </tr>
              `
                  : ""
              }
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCautelas() {
  const f = state.cautelaForm;
  const itens = f.atiradorId ? itensDoAtirador(f.atiradorId) : [];

  return `
    ${renderPageHeader(
      "Cautelas",
      "Cautela gerada a partir dos itens registrados para cada atirador.",
      `<button class="btn-accent" id="btn-open-cautela">Gerar cautela</button>`
    )}

    ${
      state.cautelaOpen
        ? `
      <form id="form-cautela" class="panel mb-5 grid gap-3 md-grid-cols-3">
        <h2 class="font-bold md-col-span-3">Nova cautela</h2>
        <div>
          <label class="label">Atirador</label>
          <select class="field" name="atiradorId" id="select-cautela-atirador">
            <option value="">Selecione...</option>
            ${state.atiradores.map((a) => `<option value="${esc(a.id)}" ${f.atiradorId === a.id ? "selected" : ""}>${esc(a.numero)} - ${esc(a.nome)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="label">Retirada</label>
          <input type="date" class="field" name="retirada" value="${esc(f.retirada)}" />
        </div>
        <div>
          <label class="label">Retorno previsto</label>
          <input type="date" class="field" name="retorno" value="${esc(f.retorno)}" />
        </div>
        ${
          f.atiradorId
            ? `
          <div class="md-col-span-3 text-sm">
            <p class="label">Itens vinculados ao atirador</p>
            ${
              itens.length
                ? `
              <p class="mb-1 text-muted">${itens.length} itens diferentes</p>
              <ul style="padding-left:1.25rem;">
                ${itens.map((i) => `<li>${esc(i.itemNome)} — recebido ${i.quantidade}${i.devolvido ? `, devolvido ${i.devolvido}` : ""}</li>`).join("")}
              </ul>
            `
                : `<p class="text-muted">Nenhum item vinculado.</p>`
            }
          </div>
        `
            : ""
        }
        <p id="cautela-err" class="text-sm text-destructive md-col-span-3" style="display:none"></p>
        <div class="flex gap-2 md-col-span-3 md-justify-end">
          <button type="button" class="btn-outline" id="btn-cancel-cautela">Cancelar</button>
          <button type="submit" class="btn-accent">Gerar</button>
        </div>
      </form>
    `
        : ""
    }

    <div class="panel overflow-x-auto">
      <table class="tbl">
        <thead>
          <tr><th>Número</th><th>Atirador</th><th>Retirada</th><th>Retorno</th><th>Itens</th><th>Status</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${[...state.cautelas]
            .reverse()
            .map(
              (c) => `
            <tr>
              <td class="font-mono text-xs">${esc(c.numero)}</td>
              <td>${esc(c.responsavel)}</td>
              <td>${fmtDate(c.retirada)}</td>
              <td>${fmtDate(c.retorno)}</td>
              <td>${(c.itens || []).map((i) => `${esc(i.itemNome)} × ${i.quantidade}`).join(", ")}</td>
              <td><span class="${c.status === "Ativa" ? "badge-warn" : "badge-ok"}">${esc(c.status)}</span></td>
              <td class="whitespace-nowrap">
                <button class="btn-outline btn-sm" data-pdf-cautela="${esc(c.id)}">PDF</button>
                ${c.status === "Ativa" ? `<button class="btn-primary btn-sm" data-devolver-cautela="${esc(c.id)}">Devolver</button>` : ""}
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMovimentacoes() {
  const f = state.movForm;
  const sel = state.items.find((i) => i.id === f.itemId) || state.items[0];
  const comum = sel ? isComum(sel) : false;
  const nomeAt = (id) => (id ? state.atiradores.find((a) => a.id === id)?.nome ?? "—" : "Uso comum");

  return `
    ${renderPageHeader("Entrada / Saída", "Itens não comuns são vinculados a um atirador.")}
    <form id="form-mov" class="panel mb-5 grid gap-3 md-grid-cols-5 md-items-end">
      <div>
        <label class="label">Tipo</label>
        <select class="field" name="tipo" id="mov-tipo">
          <option value="Entrada" ${f.tipo === "Entrada" ? "selected" : ""}>Entrada</option>
          <option value="Saída" ${f.tipo === "Saída" ? "selected" : ""}>Saída</option>
        </select>
      </div>
      <div>
        <label class="label">Item</label>
        <select class="field" name="itemId" id="mov-item">
          ${state.items
            .map(
              (i) => `
            <option value="${esc(i.id)}" ${(sel && sel.id === i.id) ? "selected" : ""}>
              ${esc(i.nome)} (${i.quantidade})${isComum(i) ? " · comum" : ""}
            </option>
          `
            )
            .join("")}
        </select>
      </div>
      <div>
        <label class="label">Atirador</label>
        <select class="field" name="atiradorId" id="mov-atirador" ${comum ? "disabled" : ""}>
          <option value="">${comum ? "Item de uso comum" : "Selecione..."}</option>
          ${state.atiradores.map((a) => `<option value="${esc(a.id)}" ${!comum && f.atiradorId === a.id ? "selected" : ""}>${esc(a.numero)} - ${esc(a.nome)}</option>`).join("")}
        </select>
      </div>
      <div>
        <label class="label">Quantidade</label>
        <input type="number" min="1" class="field" name="quantidade" value="${Number(f.quantidade)}" />
      </div>
      <button type="submit" class="${f.tipo === "Entrada" ? "btn-primary" : "btn-accent"}">Registrar</button>
      <p id="mov-err" class="text-sm text-destructive md-col-span-5" style="display:none"></p>
    </form>

    <div class="panel overflow-x-auto">
      <table class="tbl">
        <thead>
          <tr><th>Data</th><th>Tipo</th><th>Item</th><th>Atirador</th><th>Qtd.</th></tr>
        </thead>
        <tbody>
          ${[...state.movs]
            .sort((a, b) => b.data.localeCompare(a.data))
            .map(
              (m) => `
            <tr>
              <td>${fmtDateTime(m.data)}</td>
              <td><span class="${m.tipo === "Entrada" ? "badge-ok" : "badge-warn"}">${esc(m.tipo)}</span></td>
              <td>${esc(m.itemNome)}</td>
              <td>${esc(nomeAt(m.atiradorId))}</td>
              <td>${m.quantidade}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderConfiguracoes() {
  const user = state.profile;
  const postos = ["Soldado", "Cabo", "Sargento", "Subtenente", "Tenente"];

  return `
    ${renderPageHeader("Configurações", `Conta de ${user.email}`)}
    <div class="grid gap-4 lg-grid-cols-2">
      <div class="panel space-y-3">
        <h2 class="font-bold">Nome e posto</h2>
        <div>
          <label class="label">Nome completo</label>
          <input class="field" id="cfg-nome" value="${esc(user.nome)}" />
        </div>
        <div>
          <label class="label">Posto / Graduação</label>
          <select class="field" id="cfg-posto">
            ${postos.map((p) => `<option value="${p}" ${user.posto === p ? "selected" : ""}>${p}</option>`).join("")}
          </select>
        </div>
        <p id="cfg-msg-1" class="text-sm" style="display:none"></p>
        <button class="btn-primary" id="btn-cfg-perfil">Salvar</button>
      </div>

      <div class="panel space-y-3">
        <h2 class="font-bold">Trocar e-mail</h2>
        <div>
          <label class="label">Novo e-mail</label>
          <input class="field" id="cfg-email" type="email" placeholder="novo@email.com" />
        </div>
        <p id="cfg-msg-2" class="text-sm" style="display:none"></p>
        <button class="btn-primary" id="btn-cfg-email">Atualizar e-mail</button>
      </div>

      <div class="panel space-y-3">
        <h2 class="font-bold">Trocar senha</h2>
        <div>
          <label class="label">Nova senha (mín. 6 caracteres)</label>
          <input class="field" id="cfg-senha" type="password" placeholder="Nova senha" />
        </div>
        <p id="cfg-msg-3" class="text-sm" style="display:none"></p>
        <button class="btn-primary" id="btn-cfg-senha">Salvar nova senha</button>
      </div>

      <div class="panel space-y-3">
        <h2 class="font-bold text-destructive">Excluir minha conta</h2>
        <p class="text-sm text-muted">Sua conta será apagada. Os itens, atiradores e cautelas continuam no sistema.</p>
        <div>
          <label class="label">Digite EXCLUIR para confirmar</label>
          <input class="field" id="cfg-excluir" />
        </div>
        <p id="cfg-msg-4" class="text-sm text-destructive" style="display:none"></p>
        <button class="btn-accent" id="btn-cfg-excluir">Excluir conta</button>
      </div>
    </div>
  `;
}

// ==========================================================
// RENDERIZADOR PRINCIPAL E SHELL DO APP
// ==========================================================
function render() {
  const root = document.getElementById("app");
  if (!state.loaded) {
    root.innerHTML = `<p style="padding: 2rem; font-size: 0.875rem; color: var(--muted-foreground);">Carregando dados...</p>`;
    return;
  }

  if (!state.profile) {
    if (state.route === "cadastro") {
      root.innerHTML = renderCadastro();
    } else {
      state.route = "login";
      root.innerHTML = renderLogin();
    }
    bindEvents();
    return;
  }

  // Se estiver autenticado mas em rota pública, redireciona ao painel
  if (state.route === "login" || state.route === "cadastro") {
    state.route = "painel";
  }

  const links = [
    { to: "painel", label: "Painel" },
    { to: "atiradores", label: "Atiradores" },
    { to: "itens", label: "Itens" },
    { to: "prateleiras", label: "Prateleiras" },
    { to: "cautelas", label: "Cautelas" },
    { to: "movimentacoes", label: "Entrada/Saída" },
    { to: "configuracoes", label: "Configurações" },
  ];

  let pageHtml = "";
  switch (state.route) {
    case "atiradores": pageHtml = renderAtiradores(); break;
    case "itens": pageHtml = renderItens(); break;
    case "prateleiras": pageHtml = renderPrateleiras(); break;
    case "cautelas": pageHtml = renderCautelas(); break;
    case "movimentacoes": pageHtml = renderMovimentacoes(); break;
    case "configuracoes": pageHtml = renderConfiguracoes(); break;
    case "painel":
    default:
      pageHtml = renderPainel();
      break;
  }

  root.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar">
        ${renderEmblem()}
        <p class="mt-3 font-bold">Almoxarifado T.G.</p>
        <p class="mb-5 text-xs text-muted">Controle de materiais e cautelas</p>
        <nav class="sidebar-nav">
          ${links
            .map(
              (l) => `
            <button class="nav-link ${state.route === l.to ? "active" : ""}" data-nav="${l.to}">
              ${esc(l.label)}
            </button>
          `
            )
            .join("")}
          <button class="nav-link" id="btn-logout">Sair</button>
        </nav>
      </aside>
      <main class="main-content">
        <div class="top-bar">
          <span class="user-pill">Usuário: ${esc(state.profile.nome)} (${esc(state.profile.posto)})</span>
        </div>
        ${pageHtml}
      </main>
    </div>
  `;

  bindEvents();
}

// ==========================================================
// EVENT LISTENERS E HANDLERS
// ==========================================================
function showMsg(id, text, isOk = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "block";
  el.className = `text-sm ${isOk ? "text-primary" : "text-destructive"}`;
  el.textContent = text;
}

function bindEvents() {
  // Navegação por data-nav
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      const novo = btn.getAttribute("data-novo") === "1";
      navigate(target, { novo });
    });
  });

  // Logout
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await api("logout", {});
      state.profile = null;
      navigate("login");
    });
  }

  // Login
  const formLogin = document.getElementById("form-login");
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(formLogin);
      const btn = document.getElementById("btn-login");
      try {
        btn.disabled = true;
        btn.textContent = "Entrando...";
        const data = await api("login", Object.fromEntries(fd.entries()));
        syncStateFromServer(data);
        navigate("painel");
      } catch (err) {
        showMsg("login-err", err.message);
        btn.disabled = false;
        btn.textContent = "Entrar";
      }
    });
  }

  // Cadastro
  const formCad = document.getElementById("form-cadastro");
  if (formCad) {
    formCad.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(formCad).entries());
      if (fd.senha !== fd.confirma) {
        return showMsg("cad-err", "As senhas não conferem.");
      }
      try {
        const data = await api("register", fd);
        syncStateFromServer(data);
        navigate("painel");
      } catch (err) {
        showMsg("cad-err", err.message);
      }
    });
  }

  // Itens
  const btnNovoItem = document.getElementById("btn-novo-item");
  if (btnNovoItem) {
    btnNovoItem.addEventListener("click", () => {
      state.itemForm = {
        nome: "",
        tipo: "Uniforme",
        quantidade: 1,
        prateleira: state.shelves[0]?.codigo ?? "",
        condicao: "Bom",
        situacao: "Disponível",
      };
      render();
    });
  }

  const btnCancelItem = document.getElementById("btn-cancel-item");
  if (btnCancelItem) {
    btnCancelItem.addEventListener("click", () => {
      state.itemForm = null;
      render();
    });
  }

  const formItem = document.getElementById("form-item");
  if (formItem) {
    formItem.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(formItem).entries());
      const payload = { ...state.itemForm, ...fd, quantidade: Number(fd.quantidade) };
      try {
        const data = await api("save_item", payload);
        syncStateFromServer(data);
        state.itemForm = null;
        render();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  const inputSearchItem = document.getElementById("input-search-item");
  if (inputSearchItem) {
    inputSearchItem.addEventListener("input", (e) => {
      state.itemSearch = e.target.value;
      render();
      const el = document.getElementById("input-search-item");
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }

  document.querySelectorAll("[data-edit-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit-item");
      const found = state.items.find((x) => x.id === id);
      if (found) {
        state.itemForm = { ...found };
        render();
      }
    });
  });

  document.querySelectorAll("[data-del-item]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del-item");
      const found = state.items.find((x) => x.id === id);
      if (found && confirm(`Excluir ${found.nome}?`)) {
        const data = await api("delete_item", { id });
        syncStateFromServer(data);
        render();
      }
    });
  });

  // Prateleiras
  const formShelf = document.getElementById("form-shelf");
  if (formShelf) {
    formShelf.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(formShelf).entries());
      try {
        const data = await api("add_shelf", fd);
        syncStateFromServer(data);
        render();
      } catch (err) {
        showMsg("shelf-err", err.message);
      }
    });
  }

  document.querySelectorAll("[data-del-shelf]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del-shelf");
      const data = await api("delete_shelf", { id });
      syncStateFromServer(data);
      render();
    });
  });

  // Atiradores
  const btnNovoAtirador = document.getElementById("btn-novo-atirador");
  if (btnNovoAtirador) {
    btnNovoAtirador.addEventListener("click", () => {
      state.atiradorForm = {
        numero: "",
        nome: "",
        contato: "",
        tipoSanguineo: "O+",
        altura: "",
        calcado: "",
        roupa: "M",
        cabeca: "",
        endereco: "",
        nascimento: "",
      };
      render();
    });
  }

  const btnCancelAtirador = document.getElementById("btn-cancel-atirador");
  if (btnCancelAtirador) {
    btnCancelAtirador.addEventListener("click", () => {
      state.atiradorForm = null;
      render();
    });
  }

  const formAtirador = document.getElementById("form-atirador");
  if (formAtirador) {
    formAtirador.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(formAtirador).entries());
      try {
        const data = await api("save_atirador", { ...state.atiradorForm, ...fd });
        syncStateFromServer(data);
        state.atiradorForm = null;
        render();
      } catch (err) {
        showMsg("atirador-err", err.message);
      }
    });
  }

  document.querySelectorAll("[data-ver-atirador]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-ver-atirador");
      state.atiradorVer = state.atiradorVer === id ? null : id;
      render();
    });
  });

  document.querySelectorAll("[data-edit-atirador]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit-atirador");
      const found = state.atiradores.find((a) => a.id === id);
      if (found) {
        state.atiradorForm = { ...found };
        render();
      }
    });
  });

  document.querySelectorAll("[data-del-atirador]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del-atirador");
      const found = state.atiradores.find((a) => a.id === id);
      if (found && confirm(`Excluir ${found.nome}?`)) {
        const data = await api("delete_atirador", { id });
        syncStateFromServer(data);
        render();
      }
    });
  });

  // Cautelas
  const btnOpenCautela = document.getElementById("btn-open-cautela");
  if (btnOpenCautela) {
    btnOpenCautela.addEventListener("click", () => {
      state.cautelaOpen = true;
      render();
    });
  }

  const btnCancelCautela = document.getElementById("btn-cancel-cautela");
  if (btnCancelCautela) {
    btnCancelCautela.addEventListener("click", () => {
      state.cautelaOpen = false;
      render();
    });
  }

  const selCauAtirador = document.getElementById("select-cautela-atirador");
  if (selCauAtirador) {
    selCauAtirador.addEventListener("change", (e) => {
      const form = document.getElementById("form-cautela");
      const fd = new FormData(form);
      state.cautelaForm = {
        atiradorId: e.target.value,
        retirada: fd.get("retirada") || state.cautelaForm.retirada,
        retorno: fd.get("retorno") || state.cautelaForm.retorno,
      };
      render();
    });
  }

  const formCautela = document.getElementById("form-cautela");
  if (formCautela) {
    formCautela.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(formCautela).entries());
      const itens = fd.atiradorId ? itensDoAtirador(fd.atiradorId) : [];
      try {
        const data = await api("create_cautela", { ...fd, itens });
        syncStateFromServer(data);
        state.cautelaOpen = false;
        state.cautelaForm = { atiradorId: "", retirada: new Date().toISOString().slice(0, 10), retorno: "" };
        render();
        const created = state.cautelas.find((c) => c.id === data.createdCautelaId);
        if (created) {
          printCautela(created, state.atiradores.find((a) => a.id === created.atiradorId));
        }
      } catch (err) {
        showMsg("cautela-err", err.message);
      }
    });
  }

  document.querySelectorAll("[data-pdf-cautela]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-pdf-cautela");
      const c = state.cautelas.find((x) => x.id === id);
      if (c) {
        printCautela(c, state.atiradores.find((a) => a.id === c.atiradorId));
      }
    });
  });

  document.querySelectorAll("[data-devolver-cautela]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-devolver-cautela");
      try {
        const data = await api("devolver_cautela", { id });
        syncStateFromServer(data);
        render();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  // Movimentações
  const movTipo = document.getElementById("mov-tipo");
  const movItem = document.getElementById("mov-item");
  if (movTipo && movItem) {
    const syncMovForm = () => {
      const form = document.getElementById("form-mov");
      const fd = new FormData(form);
      state.movForm = {
        tipo: fd.get("tipo") || "Saída",
        itemId: fd.get("itemId") || "",
        atiradorId: fd.get("atiradorId") || "",
        quantidade: Number(fd.get("quantidade") || 1),
      };
      render();
    };
    movTipo.addEventListener("change", syncMovForm);
    movItem.addEventListener("change", syncMovForm);
  }

  const formMov = document.getElementById("form-mov");
  if (formMov) {
    formMov.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(formMov).entries());
      try {
        const data = await api("add_mov", {
          tipo: fd.tipo,
          itemId: fd.itemId,
          atiradorId: fd.atiradorId || "",
          quantidade: Number(fd.quantidade),
        });
        syncStateFromServer(data);
        render();
      } catch (err) {
        showMsg("mov-err", err.message);
      }
    });
  }

  // Configurações
  const btnCfgPerfil = document.getElementById("btn-cfg-perfil");
  if (btnCfgPerfil) {
    btnCfgPerfil.addEventListener("click", async () => {
      const nome = document.getElementById("cfg-nome").value;
      const posto = document.getElementById("cfg-posto").value;
      try {
        const res = await api("update_profile", { nome, posto });
        state.profile = res.profile;
        render();
        showMsg("cfg-msg-1", "Dados atualizados.", true);
      } catch (err) {
        showMsg("cfg-msg-1", err.message, false);
      }
    });
  }

  const btnCfgEmail = document.getElementById("btn-cfg-email");
  if (btnCfgEmail) {
    btnCfgEmail.addEventListener("click", async () => {
      const email = document.getElementById("cfg-email").value;
      try {
        const res = await api("update_email", { email });
        state.profile = res.profile;
        render();
        showMsg("cfg-msg-2", res.message, true);
      } catch (err) {
        showMsg("cfg-msg-2", err.message, false);
      }
    });
  }

  const btnCfgSenha = document.getElementById("btn-cfg-senha");
  if (btnCfgSenha) {
    btnCfgSenha.addEventListener("click", async () => {
      const senha = document.getElementById("cfg-senha").value;
      try {
        const res = await api("update_password", { senha });
        document.getElementById("cfg-senha").value = "";
        showMsg("cfg-msg-3", res.message, true);
      } catch (err) {
        showMsg("cfg-msg-3", err.message, false);
      }
    });
  }

  const btnCfgExcluir = document.getElementById("btn-cfg-excluir");
  if (btnCfgExcluir) {
    btnCfgExcluir.addEventListener("click", async () => {
      const conf = document.getElementById("cfg-excluir").value;
      if (conf !== "EXCLUIR") {
        return showMsg("cfg-msg-4", "Digite EXCLUIR para confirmar.", false);
      }
      try {
        await api("delete_account", {});
        state.profile = null;
        navigate("login");
      } catch (err) {
        showMsg("cfg-msg-4", err.message, false);
      }
    });
  }
}

// Inicialização da aplicação
(async function init() {
  const hash = window.location.hash.replace("#", "");
  if (hash) state.route = hash;
  try {
    const data = await api("bootstrap");
    syncStateFromServer(data);
  } catch (err) {
    console.error("Falha ao inicializar:", err);
  } finally {
    state.loaded = true;
    render();
  }
})();
