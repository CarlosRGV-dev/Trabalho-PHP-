// Configurações da conta
function preencher(u) {
  usuarioAtual = u;
  $("#subConta").textContent = `Conta de ${u.email}`;
  $("#usuarioNome").textContent = u.nome;
  const f = $("#formPerfil");
  f.elements.nome.value = u.nome;
  f.elements.posto.value = u.posto || "Soldado";
}

/** Liga um formulário a uma ação da API, com validação opcional. */
function ligar(idForm, acao, validar, aoSucesso) {
  const form = $(idForm);
  const msg = form.querySelector(".msg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = lerForm(form);
    const problema = validar?.(d);
    if (problema) return mensagem(msg, problema);
    try {
      const r = await api("auth", { metodo: "POST", params: `acao=${acao}`, dados: d });
      aoSucesso(r, form, msg);
    } catch (err) { mensagem(msg, err.message); }
  });
}

ligar("#formPerfil", "perfil",
  (d) => (!d.nome.trim() ? "Informe o nome." : ""),
  (r, f, msg) => { preencher(r.usuario); mensagem(msg, "Dados atualizados.", true); });

ligar("#formEmail", "email",
  (d) => (!d.email.includes("@") ? "Informe um e-mail válido." : ""),
  (r, f, msg) => { preencher(r.usuario); f.reset(); mensagem(msg, "E-mail alterado.", true); });

ligar("#formSenha", "senha",
  (d) => (d.nova.length < 6 ? "A nova senha precisa ter no mínimo 6 caracteres." : d.nova !== d.confirma ? "As senhas não conferem." : ""),
  (r, f, msg) => { f.reset(); mensagem(msg, "Senha alterada.", true); });

ligar("#formExcluir", "excluir",
  (d) => (d.confirma !== "EXCLUIR" ? "Digite EXCLUIR para confirmar." : ""),
  () => { location.href = "index.html"; });

paginaProtegida(preencher);
