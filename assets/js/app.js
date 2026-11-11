/* =====================================================================
   Funções comuns a todas as páginas
   ===================================================================== */

/** Chamada à API PHP. Lança Error com a mensagem do servidor em caso de falha. */
async function api(arquivo, { metodo = "GET", dados = null, params = "" } = {}) {
  const opcoes = { method: metodo, headers: {}, credentials: "same-origin" };
  if (dados) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(dados);
  }
  const resp = await fetch(`api/${arquivo}.php${params ? "?" + params : ""}`, opcoes);
  let json = null;
  try { json = await resp.json(); } catch { /* resposta vazia */ }
  if (resp.status === 401 && !location.pathname.endsWith("index.html") && arquivo !== "auth") {
    location.href = "index.html";
  }
  if (!resp.ok) throw new Error(json?.erro || "Falha na comunicação com o servidor.");
  return json;
}

/** Escapa texto para inserir em HTML. */
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const $ = (sel, raiz = document) => raiz.querySelector(sel);

function fmtData(d) {
  if (!d) return "";
  return new Date(d.length === 10 ? d + "T00:00" : d.replace(" ", "T")).toLocaleDateString("pt-BR");
}
function fmtDataHora(d) {
  return new Date(d.replace(" ", "T")).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Mostra mensagem num elemento .msg */
function mensagem(el, texto, ok = false) {
  el.textContent = texto || "";
  el.className = "msg " + (ok ? "ok" : "erro");
}

/** Lê os campos de um formulário como objeto. */
function lerForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

/** Preenche as <option> de um select. lista = [[valor, texto], ...] ou [texto, ...] */
function opcoes(select, lista, selecionado = "") {
  select.innerHTML = lista.map((o) => {
    const [v, t] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}"${String(v) === String(selecionado) ? " selected" : ""}>${esc(t)}</option>`;
  }).join("");
}

function classeSituacao(s) {
  return s === "Disponível" ? "badge-ok" : s === "Em cautela" ? "badge-warn" : "badge-off";
}

/* ---------------------------------------------------------------------
   Layout das páginas internas (menu lateral + usuário logado)
   --------------------------------------------------------------------- */
const MENU = [
  ["painel.html", "Painel"],
  ["atiradores.html", "Atiradores"],
  ["itens.html", "Itens"],
  ["prateleiras.html", "Prateleiras"],
  ["cautelas.html", "Cautelas"],
  ["movimentacoes.html", "Entrada/Saída"],
  ["configuracoes.html", "Configurações"],
];

let usuarioAtual = null;

/** Verifica a sessão, monta o menu e chama iniciar(usuario). */
async function paginaProtegida(iniciar) {
  const { usuario } = await api("auth", { params: "acao=sessao" });
  if (!usuario) { location.href = "index.html"; return; }
  usuarioAtual = usuario;
  const atual = location.pathname.split("/").pop() || "painel.html";
  $("#sidebar").innerHTML = `
    <div class="emblem"><span>TG</span><span>02-076</span></div>
    <p class="nome-sis">Almoxarifado T.G.</p>
    <p class="sub-sis">Controle de materiais e cautelas</p>
    <nav>
      ${MENU.map(([href, txt]) => `<a href="${href}" class="${href === atual ? "ativo" : ""}">${txt}</a>`).join("")}
      <button type="button" id="btnSair">Sair</button>
    </nav>`;
  $("#usuarioNome").textContent = usuario.nome;
  $("#btnSair").onclick = async () => {
    await api("auth", { metodo: "POST", params: "acao=sair" });
    location.href = "index.html";
  };
  try {
    await iniciar(usuario);
  } catch (e) {
    alert(e.message);
  }
  document.body.classList.remove("carregando");
}

/* ---------------------------------------------------------------------
   Relatório para impressão / "Salvar como PDF"
   --------------------------------------------------------------------- */
function imprimirRelatorio(titulo, filtros, cabecalho, linhas, resumo = []) {
  const w = window.open("", "_blank");
  if (!w) return alert("Permita pop-ups para gerar o PDF.");
  w.document.write(`<html><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
  body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:18px;margin:0}h2{font-size:13px;font-weight:normal;margin:4px 0 12px;color:#444}
  table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #999;padding:4px 6px;text-align:left}th{background:#e5e7e0}
  .meta{font-size:11px;margin-bottom:10px}.res{margin-top:12px;font-size:12px}</style></head><body>
  <h1>Tiro de Guerra 02-076 · Almoxarifado</h1><h2>${esc(titulo)} — gerado em ${new Date().toLocaleString("pt-BR")}</h2>
  <div class="meta">${filtros.map(esc).join(" · ")}</div>
  <table><thead><tr>${cabecalho.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>
  ${linhas.length ? linhas.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cabecalho.length}">Nenhum registro.</td></tr>`}
  </tbody></table><div class="res">${resumo.map((r) => `<div>${esc(r)}</div>`).join("")}</div>
  <script>window.print()<\/script></body></html>`);
  w.document.close();
}
