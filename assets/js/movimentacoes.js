// Entrada / Saída de materiais
const TIPOS_COMUNS = ["Limpeza", "Construção"];
const isComum = (i) => TIPOS_COMUNS.includes(i.tipo);

const form = $("#formMov");
let itens = [], atiradores = [], movs = [];

const nomeAt = (m) => (m.atirador_id ? m.atirador_nome ?? "—" : "Uso comum");
const itemSel = () => itens.find((i) => i.id == form.elements.item_id.value);

async function carregar() {
  const manterItem = form.elements.item_id.value;
  [itens, atiradores, movs] = await Promise.all([api("itens"), api("atiradores"), api("movimentacoes")]);

  opcoes(form.elements.item_id, itens.map((i) => [i.id, `${i.nome} (${i.quantidade})${isComum(i) ? " · comum" : ""}`]), manterItem || itens[0]?.id);
  ajustarAtirador();

  const ats = atiradores.map((a) => [a.id, `${a.numero} - ${a.nome}`]);
  const manter = (sel) => sel.value;
  const fi = manter($("#fItem")), ft = manter($("#fTipoItem")), fa = manter($("#fAtirador"));
  opcoes($("#fTipoItem"), [["", "Todos"], ...[...new Set(itens.map((i) => i.tipo))]], ft);
  opcoes($("#fItem"), [["", "Todos"], ...itens.map((i) => [i.id, i.nome])], fi);
  opcoes($("#fAtirador"), [["", "Todos"], ...ats], fa);
  desenhar();
}

/** Itens de uso comum não são vinculados a atirador. */
function ajustarAtirador() {
  const sel = form.elements.atirador_id;
  const atual = sel.value;
  const comum = itemSel() ? isComum(itemSel()) : false;
  sel.disabled = comum;
  opcoes(sel, [["", comum ? "Item de uso comum" : "Selecione..."], ...atiradores.map((a) => [a.id, `${a.numero} - ${a.nome}`])], comum ? "" : atual);
}

function filtrados() {
  const tm = $("#fTipoMov").value, ti = $("#fTipoItem").value, it = $("#fItem").value, at = $("#fAtirador").value;
  return movs.filter((m) => (!tm || m.tipo === tm) && (!ti || m.item_tipo === ti) && (!it || m.item_id == it) && (!at || m.atirador_id == at));
}

function desenhar() {
  const lista = filtrados();
  $("#btnPdf").textContent = `Gerar PDF (${lista.length})`;
  $("#lista").innerHTML = lista.map((m) => `
    <tr><td>${fmtDataHora(m.data)}</td>
      <td><span class="${m.tipo === "Entrada" ? "badge-ok" : "badge-warn"}">${esc(m.tipo)}</span></td>
      <td>${esc(m.item_nome)}</td><td>${esc(nomeAt(m))}</td><td>${m.quantidade}</td></tr>`).join("")
    || `<tr><td colspan="5" class="muted">Nenhuma movimentação.</td></tr>`;
}

form.elements.item_id.addEventListener("change", ajustarAtirador);
form.elements.tipo.addEventListener("change", () => {
  $("#btnRegistrar").className = form.elements.tipo.value === "Entrada" ? "btn-primary" : "btn-accent";
});
["#fTipoMov", "#fTipoItem", "#fItem", "#fAtirador"].forEach((s) => $(s).addEventListener("change", desenhar));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = lerForm(form);
  const item = itemSel();
  const qtd = Number(d.quantidade);
  const msg = $("#msg");
  if (!item || qtd < 1) return mensagem(msg, "Selecione um item e quantidade válida.");
  if (!isComum(item) && !d.atirador_id) return mensagem(msg, "Este item deve ser vinculado a um atirador.");
  if (d.tipo === "Saída" && qtd > item.quantidade) return mensagem(msg, `Estoque insuficiente (${item.quantidade}).`);
  try {
    await api("movimentacoes", { metodo: "POST", dados: d });
    mensagem(msg, "");
    carregar();
  } catch (err) { mensagem(msg, err.message); }
});

$("#btnPdf").onclick = () => {
  const lista = filtrados();
  const soma = (t) => lista.filter((m) => m.tipo === t).reduce((n, m) => n + m.quantidade, 0);
  const txt = (sel) => sel.options[sel.selectedIndex]?.text ?? "Todos";
  imprimirRelatorio("Relatório de entradas e saídas",
    [`Movimento: ${$("#fTipoMov").value || "Todos"}`, `Tipo de item: ${$("#fTipoItem").value || "Todos"}`,
      `Item: ${txt($("#fItem"))}`, `Atirador: ${txt($("#fAtirador"))}`],
    ["Data", "Movimento", "Código", "Item", "Tipo", "Qtd.", "Atirador", "Situação"],
    lista.map((m) => [fmtDataHora(m.data), m.tipo, m.item_codigo ?? "—", m.item_nome, m.item_tipo ?? "—", m.quantidade, nomeAt(m),
      m.atirador_id ? (m.tipo === "Saída" ? "Retirou" : "Devolveu") : "—"]),
    [`Registros: ${lista.length}`, `Total de saídas: ${soma("Saída")}`, `Total de entradas: ${soma("Entrada")}`]);
};

paginaProtegida(carregar);
