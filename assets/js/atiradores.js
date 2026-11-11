// Atiradores
const form = $("#formAtirador");
const CAMPOS = ["id", "numero", "nome", "contato", "nascimento", "altura", "calcado", "cabeca", "tipo_sanguineo", "endereco", "roupa"];
let atiradores = [];
let aberto = null; // id do atirador com a linha de itens aberta

async function carregar() {
  atiradores = await api("atiradores");
  $("#lista").innerHTML = atiradores.map((a) => `
    <tr>
      <td class="mono">${esc(a.numero)}</td><td>${esc(a.nome)}</td><td>${esc(a.contato)}</td>
      <td>${esc(a.tipo_sanguineo)}</td><td>${esc(a.altura)}</td><td>${esc(a.calcado)}</td>
      <td>${esc(a.roupa)}</td><td>${esc(a.cabeca)}</td><td>${fmtData(a.nascimento)}</td>
      <td class="acoes">
        <button class="btn-outline btn-sm" onclick="verItens(${a.id})">Itens</button>
        <button class="btn-outline btn-sm" title="Editar" onclick="editar(${a.id})">✎</button>
        <button class="btn-danger btn-sm" title="Excluir" onclick="excluir(${a.id})">×</button>
      </td>
    </tr>
    <tr class="detalhe oculto" id="det-${a.id}"><td colspan="10"></td></tr>`).join("")
    || `<tr><td colspan="10" class="muted">Nenhum atirador cadastrado.</td></tr>`;
  aberto = null;
}

window.verItens = async (id) => {
  if (aberto) $(`#det-${aberto}`)?.classList.add("oculto");
  if (aberto === id) { aberto = null; return; }
  aberto = id;
  const a = atiradores.find((x) => x.id == id);
  const linha = $(`#det-${id}`);
  const itens = await api("atiradores", { params: `itens=${id}` });
  const txt = itens.map((i) => `${i.item_nome} × ${i.quantidade}${i.devolvido ? ` (devolvido ${i.devolvido})` : ""}`).join(", ");
  linha.firstElementChild.innerHTML = `<b>Endereço:</b> ${esc(a.endereco || "—")}<br><b>Itens vinculados:</b> ${esc(txt || "nenhum")}`;
  linha.classList.remove("oculto");
};

function abrirForm(a = null) {
  form.reset();
  if (a) CAMPOS.forEach((c) => { form.elements[c].value = a[c] ?? ""; });
  else form.elements.id.value = "";
  $("#tituloForm").textContent = a ? "Editar atirador" : "Novo atirador";
  mensagem($("#msg"), "");
  form.classList.remove("oculto");
  form.elements.numero.focus();
}

window.editar = (id) => abrirForm(atiradores.find((a) => a.id == id));
window.excluir = async (id) => {
  const a = atiradores.find((x) => x.id == id);
  if (!confirm(`Excluir ${a.nome}?`)) return;
  try { await api("atiradores", { metodo: "DELETE", params: `id=${id}` }); carregar(); }
  catch (e) { alert(e.message); }
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = lerForm(form);
  if (!d.nome.trim() || !d.numero.trim() || !d.contato.trim()) return mensagem($("#msg"), "Preencha número, nome e contato.");
  try {
    await api("atiradores", d.id ? { metodo: "PUT", params: `id=${d.id}`, dados: d } : { metodo: "POST", dados: d });
    form.classList.add("oculto");
    carregar();
  } catch (err) { mensagem($("#msg"), err.message); }
});

$("#btnNovo").onclick = () => abrirForm();
$("#btnCancelar").onclick = () => form.classList.add("oculto");

paginaProtegida(carregar);
