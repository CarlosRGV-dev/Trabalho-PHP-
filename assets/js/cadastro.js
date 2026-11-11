// Cadastro de novo usuário
$("#formCadastro").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = lerForm(e.target);
  const msg = $("#msg");
  f.email = f.email.trim();

  if (!f.nome.trim() || !f.email || f.senha.length < 6) return mensagem(msg, "Preencha todos os campos (senha mínima de 6 caracteres).");
  if (!/^[^\s@]+@(gmail|hotmail|outlook)\.com$/i.test(f.email))
    return mensagem(msg, "Use um e-mail válido com domínio gmail.com, hotmail.com ou outlook.com (ex.: nome@gmail.com).");
  if (f.senha !== f.confirma) return mensagem(msg, "As senhas não conferem.");

  try {
    await api("auth", { metodo: "POST", params: "acao=cadastro", dados: f });
    location.href = "painel.html";
  } catch (err) {
    mensagem(msg, err.message);
  }
});
