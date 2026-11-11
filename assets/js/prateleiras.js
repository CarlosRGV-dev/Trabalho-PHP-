// Prateleiras
const form = $("#formPrateleira");

async function carregar() {
  const lista = await api("prateleiras");
  $("#cards").innerHTML = lista.map((p) => `
    <div class="panel">
      <div class="prat-topo">
        <div>
          <p class="prat-codigo">${esc(p.codigo)}</p>
          <p class="txt-sm">${esc(p.descricao)}</p>
          <p class="txt-xs muted">${esc(p.setor)}</p>
        </div>
        <button class="btn-danger btn-sm" title="${p.itens.length ? "Possui itens" : "Excluir"}"
          ${p.itens.length ? "disabled" : ""} onclick="excluir(${p.id})">×</button>
      </div>
      <ul class="prat-itens">
        ${p.itens.length
          ? p.itens.map((i) => `<li><span>${esc(i.nome)}</span><span class="muted">${i.quantidade}</span></li>`).join("")
          : `<li class="muted">Sem itens</li>`}
      </ul>
    </div>`).join("");
}

window.excluir = async (id) => {
  try { await api("prateleiras", { metodo: "DELETE", params: `id=${id}` }); carregar(); }
  catch (e) { alert(e.message); }
};

form.elements.codigo.addEventListener("input", () => { form.elements.codigo.value = form.elements.codigo.value.toUpperCase(); });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = lerForm(form);
  if (!d.codigo.trim()) return mensagem($("#msg"), "Informe o código.");
  try {
    await api("prateleiras", { metodo: "POST", dados: d });
    form.reset();
    mensagem($("#msg"), "");
    carregar();
  } catch (err) { mensagem($("#msg"), err.message); }
});

paginaProtegida(carregar);
