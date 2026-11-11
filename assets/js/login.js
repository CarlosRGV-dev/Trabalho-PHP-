// Tela de login
(async () => {
  const { usuario } = await api("auth", { params: "acao=sessao" });
  if (usuario) location.href = "painel.html";
})();

$("#formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#btnEntrar");
  btn.disabled = true;
  btn.textContent = "Entrando...";
  mensagem($("#msg"), "");
  try {
    await api("auth", { metodo: "POST", params: "acao=login", dados: lerForm(e.target) });
    location.href = "painel.html";
  } catch (err) {
    mensagem($("#msg"), err.message);
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
});
