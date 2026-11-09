"use strict";

// Variáveis internas isoladas dos controles de tipos e acessos.
(() => {
  const campos = {"publicoAlvo": "Quem pode usar?", "procedimentoAcesso": "Como conseguir o acesso?", "orientacaoLogin": "Que login e senha usar?", "quemLiberaAcesso": "Quem libera o acesso?", "funcionaForaRede": "Funciona fora da rede?", "situacao": "Situação"};
  const controles = {};
  const formularioRespostas = document.querySelector("#formulario-admin");

  function preencher(campo, opcoes, selecionado = controles[campo].select.value) {
    const select = controles[campo].select;
    select.replaceChildren(new Option("Não informado", ""));
    opcoes.forEach(opcao => select.add(new Option(opcao, opcao)));
    if (opcoes.includes(selecionado)) select.value = selecionado;
  }

  for (const campo of Object.keys(campos)) {
    const c = controles[campo] = {
      select: document.getElementById(campo),
      botao: document.getElementById(`adicionar-${campo}`),
      painel: document.getElementById(`painel-${campo}`),
      nome: document.getElementById(`nome-${campo}`),
      salvar: document.getElementById(`salvar-${campo}`),
      cancelar: document.getElementById(`cancelar-${campo}`),
      mensagem: document.getElementById(`mensagem-${campo}`)
    };
    const mensagem = (texto, erro = false) => {
      c.mensagem.textContent = texto;
      c.mensagem.classList.toggle("erro", erro);
    };
    c.fechar = (foco = true) => {
      c.painel.hidden = true;
      c.nome.value = "";
      c.botao.setAttribute("aria-expanded", "false");
      mensagem("");
      if (foco) c.botao.focus();
    };
    c.botao.addEventListener("click", () => {
      if (ocupado || !carregado || sessaoAtual?.perfil !== "administrador") return;
      if (!c.painel.hidden) return c.fechar();
      c.painel.hidden = false;
      c.botao.setAttribute("aria-expanded", "true");
      mensagem("");
      c.nome.focus();
    });
    c.cancelar.addEventListener("click", () => { if (!ocupado) c.fechar(); });
    async function salvar() {
      if (ocupado || !carregado || sessaoAtual?.perfil !== "administrador") return;
      const nome = c.nome.value.trim();
      if (!nome) { mensagem("Informe o texto da opção.", true); c.nome.focus(); return; }
      ocupado = true;
      atualizarBloqueio();
      mensagem("Adicionando opção…");
      try {
        const dados = await consultarApi({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campo, nome }) }, "/admin/api/respostas");
        preencher(campo, dados.opcoes, dados.criado);
        formularioAlterado = true;
        c.fechar(false);
        informar("Opção adicionada e selecionada. Salve a solução para aplicar.");
      } catch (erro) { mensagem(erro.message, true); }
      finally {
        ocupado = false;
        atualizarBloqueio();
        (c.painel.hidden ? c.select : c.nome).focus();
      }
    }
    c.salvar.addEventListener("click", salvar);
    c.nome.addEventListener("keydown", evento => {
      // Enter permite múltiplas linhas; Ctrl+Enter adiciona a opção.
      if (evento.key === "Enter" && (evento.ctrlKey || evento.metaKey)) {
        evento.preventDefault(); evento.stopPropagation(); salvar();
      }
      if (evento.key === "Escape" && !ocupado) { evento.preventDefault(); c.fechar(); }
    });
    ["input", "change"].forEach(tipo => c.nome.addEventListener(tipo, evento => evento.stopPropagation()));
  }

  window.carregarListasRespostas = async function () {
    const dados = await consultarApi({}, "/admin/api/respostas");
    for (const campo of Object.keys(campos)) {
      preencher(campo, dados.listas[campo]);
      controles[campo].botao.hidden = !dados.podeAdicionar;
      if (!dados.podeAdicionar) controles[campo].fechar(false);
    }
  };
  formularioRespostas.addEventListener("reset", () => {
    for (const c of Object.values(controles)) c.fechar(false);
  });
})();
