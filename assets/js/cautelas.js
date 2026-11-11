// Cautelas
const form = $("#formCautela");
let cautelas = [];
let itensPrevia = [];

async function carregar() {
  cautelas = await api("cautelas");
  $("#lista").innerHTML = cautelas.map((c) => `
    <tr>
      <td class="mono">${esc(c.numero)}</td><td>${esc(c.responsavel)}</td>
      <td>${fmtData(c.retirada)}</td><td>${fmtData(c.retorno)}</td>
      <td>${esc(c.itens.map((i) => `${i.item_nome} × ${i.quantidade}`).join(", "))}</td>
      <td><span class="${c.status === "Ativa" ? "badge-warn" : "badge-ok"}">${esc(c.status)}</span></td>
      <td class="acoes">
        <button class="btn-outline btn-sm" onclick="imprimirCautela(${c.id})">PDF</button>
        ${c.status === "Ativa" ? `<button class="btn-primary btn-sm" onclick="devolver(${c.id})">Devolver</button>` : ""}
      </td>
    </tr>`).join("") || `<tr><td colspan="7" class="muted">Nenhuma cautela gerada.</td></tr>`;
}

async function abrirForm() {
  const atiradores = await api("atiradores");
  form.reset();
  opcoes(form.elements.atirador_id, [["", "Selecione..."], ...atiradores.map((a) => [a.id, `${a.numero} - ${a.nome}`])]);
  form.elements.retirada.value = hoje();
  $("#previaItens").classList.add("oculto");
  itensPrevia = [];
  mensagem($("#msg"), "");
  form.classList.remove("oculto");
}

form.elements.atirador_id.addEventListener("change", async () => {
  const id = form.elements.atirador_id.value;
  const box = $("#previaItens");
  if (!id) { box.classList.add("oculto"); itensPrevia = []; return; }
  itensPrevia = await api("atiradores", { params: `itens=${id}` });
  box.innerHTML = `<p class="label">Itens vinculados ao atirador</p>` + (itensPrevia.length
    ? `<p class="muted" style="margin-bottom:4px">${itensPrevia.length} itens diferentes</p>
       <ul class="lista-itens">${itensPrevia.map((i) =>
        `<li>${esc(i.item_nome)} — recebido ${i.quantidade}${i.devolvido ? `, devolvido ${i.devolvido}` : ""}</li>`).join("")}</ul>`
    : `<p class="muted">Nenhum item vinculado.</p>`);
  box.classList.remove("oculto");
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = lerForm(form);
  const msg = $("#msg");
  if (!d.atirador_id || !d.retorno) return mensagem(msg, "Selecione o atirador e a data de retorno.");
  if (!itensPrevia.length) return mensagem(msg, "Este atirador não possui itens registrados em Entrada/Saída.");
  // abre a janela antes do await para o navegador não bloquear o pop-up
  const janela = window.open("", "_blank");
  try {
    const { id } = await api("cautelas", { metodo: "POST", dados: d });
    form.classList.add("oculto");
    await carregar();
    imprimirCautela(id, janela);
  } catch (err) {
    janela?.close();
    mensagem(msg, err.message);
  }
});

window.devolver = async (id) => {
  if (!confirm("Confirmar a devolução de todos os itens em posse desta cautela?")) return;
  try { await api("cautelas", { metodo: "POST", params: `devolver=${id}` }); carregar(); }
  catch (e) { alert(e.message); }
};

/** Gera o Termo de Cautela em uma janela para imprimir / salvar como PDF. */
window.imprimirCautela = async (id, janela = null) => {
  const w = janela || window.open("", "_blank");
  if (!w) return alert("Permita pop-ups para gerar o PDF.");
  const c = await api("cautelas", { params: `id=${id}` });
  const at = c.atirador || {};
  const linha = (k, v) => `<tr><th>${k}</th><td>${esc(v || "—")}</td></tr>`;
  w.document.write(`<html><head><meta charset="utf-8"><title>${esc(c.numero)}</title><style>
  body{font-family:Arial;padding:40px}h1{font-size:20px}h3{margin-top:24px}table{width:100%;border-collapse:collapse;margin:10px 0}
  td,th{border:1px solid #333;padding:6px;text-align:left}.sig{margin-top:80px;display:flex;justify-content:space-between}
  .sig div{border-top:1px solid #000;width:40%;text-align:center;padding-top:6px}</style></head><body>
  <h1>TIRO DE GUERRA 02-076 — ITAPETININGA</h1><h2>Termo de Cautela ${esc(c.numero)}</h2>
  <h3>Dados do atirador</h3>
  <table>${linha("Número", at.numero)}${linha("Nome", at.nome)}${linha("Contato", at.contato)}${linha("Data de nascimento", fmtData(at.nascimento))}
  ${linha("Tipo sanguíneo", at.tipo_sanguineo)}${linha("Altura", at.altura)}${linha("Tamanho do pé", at.calcado)}
  ${linha("Tamanho de roupa", at.roupa)}${linha("Tamanho da cabeça", at.cabeca)}${linha("Endereço", at.endereco)}</table>
  <h3>Itens cautelados</h3>
  <table><tr><th>#</th><th>Código</th><th>Item</th><th>Recebido</th><th>Devolvido</th><th>Em posse</th></tr>
  ${c.itens.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.item_codigo)}</td><td>${esc(i.item_nome)}</td><td>${i.quantidade}</td>
    <td>${i.devolvido}</td><td>${Math.max(0, i.quantidade - i.devolvido)}</td></tr>`).join("")}</table>
  <p>Total de itens diferentes: ${c.itens.length}</p>
  <p>Retirada: ${fmtData(c.retirada)} · Retorno previsto: ${fmtData(c.retorno)} · Status: ${esc(c.status)}</p>
  <p>Declaro ter recebido o(s) material(is) acima, comprometendo-me a zelar por sua conservação e devolvê-lo(s) na data prevista.</p>
  <div class="sig"><div>Atirador</div><div>Encarregado do Almoxarifado</div></div>
  <script>window.print()<\/script></body></html>`);
  w.document.close();
};

$("#btnNova").onclick = abrirForm;
$("#btnCancelar").onclick = () => form.classList.add("oculto");

paginaProtegida(async () => {
  await carregar();
  if (new URLSearchParams(location.search).has("novo")) await abrirForm();
});
