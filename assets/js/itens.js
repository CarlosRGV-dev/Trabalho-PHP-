// Itens (materiais)
const TIPOS = ["Uniforme", "Vestuário", "Acessório", "Equipamento", "Material de expediente", "Limpeza", "Construção"];
const CONDICOES = ["Novo", "Bom", "Regular", "Inservível"];
const SITUACOES = ["Disponível", "Em cautela", "Indisponível"];

let itens = [];
let prateleiras = [];
const form = $("#formItem");

async function carregar() {
  [itens, prateleiras] = await Promise.all([api("itens"), api("prateleiras")]);
  desenhar();
}

function desenhar() {
  const q = $("#busca").value.toLowerCase();
  const lista = itens.filter((i) => (i.nome + i.tipo + i.codigo + (i.prateleira ?? "")).toLowerCase().includes(q));
  $("#lista").innerHTML = lista.map((i) => `
    <tr>
      <td class="mono">${esc(i.codigo)}</td><td>${esc(i.nome)}</td><td>${esc(i.tipo)}</td>
      <td>${esc(i.prateleira ?? "—")}</td><td>${i.quantidade}</td>
      <td><span class="${classeSituacao(i.situacao)}">${esc(i.situacao)}</span></td>
      <td class="acoes">
        <button class="btn-outline btn-sm" title="Editar" onclick="editar(${i.id})">✎</button>
        <button class="btn-danger btn-sm" title="Excluir" onclick="excluir(${i.id})">×</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="7" class="muted">Nenhum item encontrado.</td></tr>`;
}

function abrirForm(item = null) {
  form.reset();
  opcoes(form.elements.tipo, TIPOS, item?.tipo ?? "Uniforme");
  opcoes(form.elements.condicao, CONDICOES, item?.condicao ?? "Bom");
  opcoes(form.elements.situacao, SITUACOES, item?.situacao ?? "Disponível");
  opcoes(form.elements.prateleira_id, prateleiras.map((p) => [p.id, p.codigo]), item?.prateleira_id ?? prateleiras[0]?.id);
  form.elements.id.value = item?.id ?? "";
  form.elements.nome.value = item?.nome ?? "";
  form.elements.quantidade.value = item?.quantidade ?? 1;
  $("#tituloForm").textContent = item ? `Editar ${item.codigo}` : "Cadastro de item";
  mensagem($("#msg"), "");
  form.classList.remove("oculto");
  form.elements.nome.focus();
}

window.editar = (id) => abrirForm(itens.find((i) => i.id == id));
window.excluir = async (id) => {
  const i = itens.find((x) => x.id == id);
  if (!confirm(`Excluir ${i.nome}?`)) return;
  try { await api("itens", { metodo: "DELETE", params: `id=${id}` }); carregar(); }
  catch (e) { alert(e.message); }
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = lerForm(form);
  if (!d.nome.trim()) return mensagem($("#msg"), "Informe o nome do item.");
  try {
    await api("itens", d.id ? { metodo: "PUT", params: `id=${d.id}`, dados: d } : { metodo: "POST", dados: d });
    form.classList.add("oculto");
    carregar();
  } catch (err) { mensagem($("#msg"), err.message); }
});

$("#btnNovo").onclick = () => abrirForm();
$("#btnCancelar").onclick = () => form.classList.add("oculto");
$("#busca").oninput = desenhar;

$("#btnRelatorio").onclick = () => {
  const ordenados = [...itens].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome));
  imprimirRelatorio(
    "Relatório geral de estoque",
    [`Itens cadastrados: ${itens.length}`],
    ["Código", "Nome", "Tipo", "Prateleira", "Qtd. em estoque", "Condição", "Situação"],
    ordenados.map((i) => [i.codigo, i.nome, i.tipo, i.prateleira ?? "—", i.quantidade, i.condicao, i.situacao]),
    [`Total de unidades em estoque: ${itens.reduce((n, i) => n + i.quantidade, 0)}`,
      ...SITUACOES.map((x) => `${x}: ${itens.filter((i) => i.situacao === x).length} item(ns)`)],
  );
};

paginaProtegida(async () => {
  await carregar();
  if (new URLSearchParams(location.search).has("novo")) abrirForm();
});
