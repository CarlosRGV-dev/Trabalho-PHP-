// Painel de controle
paginaProtegida(async () => {
  const p = await api("painel");
  $("#stEstoque").textContent = p.em_estoque;
  $("#stCadastrados").textContent = p.cadastrados;
  $("#stPrateleiras").textContent = p.prateleiras;
  $("#stCautelas").textContent = p.cautelas_ativas;
  $("#ultimas").innerHTML = p.ultimas.length
    ? p.ultimas.map((m) => `<li>
        <span class="${m.tipo === "Entrada" ? "txt-primary" : "txt-accent"}">${esc(m.tipo)}</span>
        — ${esc(m.item_nome)} (${m.quantidade}) · <span class="muted">${fmtDataHora(m.data)}</span></li>`).join("")
    : `<li class="muted">Nenhuma movimentação.</li>`;
});
