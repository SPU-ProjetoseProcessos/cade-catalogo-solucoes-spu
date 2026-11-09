"use strict";

let acessosDisponiveis = [];

const seletorAcessos = document.querySelector("#acesso");
const botaoNovoAcesso = document.querySelector("#adicionar-acesso");
const painelNovoAcesso = document.querySelector("#painel-novo-acesso");
const campoNovoAcesso = document.querySelector("#nome-novo-acesso");
const botaoSalvarAcesso = document.querySelector("#salvar-novo-acesso");
const botaoCancelarAcesso = document.querySelector("#cancelar-novo-acesso");
const mensagemNovoAcesso = document.querySelector("#mensagem-novo-acesso");

function preencherAcessos(
  acessos,
  selecionado = seletorAcessos.value
) {
  acessosDisponiveis = acessos;

  seletorAcessos.replaceChildren(
    new Option("Selecione o acesso", "")
  );

  acessos.forEach(acesso => {
    seletorAcessos.add(new Option(acesso, acesso));
  });

  if (acessos.includes(selecionado)) {
    seletorAcessos.value = selecionado;
  }
}

async function carregarAcessos() {
  const dados = await consultarApi(
    {},
    "/admin/api/acessos"
  );

  preencherAcessos(dados.acessos);
  botaoNovoAcesso.hidden = !dados.podeAdicionar;

  if (!dados.podeAdicionar) {
    fecharPainelAcesso(false);
  }
}

function mostrarMensagemAcesso(texto, erro = false) {
  mensagemNovoAcesso.textContent = texto;
  mensagemNovoAcesso.classList.toggle("erro", erro);
}

function fecharPainelAcesso(devolverFoco = true) {
  painelNovoAcesso.hidden = true;
  campoNovoAcesso.value = "";
  botaoNovoAcesso.setAttribute("aria-expanded", "false");
  mostrarMensagemAcesso("");

  if (devolverFoco) {
    botaoNovoAcesso.focus();
  }
}

botaoNovoAcesso.addEventListener("click", () => {
  if (
    ocupado ||
    !carregado ||
    sessaoAtual?.perfil !== "administrador"
  ) {
    return;
  }

  if (!painelNovoAcesso.hidden) {
    fecharPainelAcesso();
    return;
  }

  painelNovoAcesso.hidden = false;
  botaoNovoAcesso.setAttribute("aria-expanded", "true");
  mostrarMensagemAcesso("");
  campoNovoAcesso.focus();
});

botaoCancelarAcesso.addEventListener("click", () => {
  if (!ocupado) {
    fecharPainelAcesso();
  }
});

async function adicionarNovoAcesso() {
  if (
    ocupado ||
    !carregado ||
    sessaoAtual?.perfil !== "administrador"
  ) {
    return;
  }

  const nome = campoNovoAcesso.value.trim();

  if (!nome) {
    mostrarMensagemAcesso("Informe o nome do acesso.", true);
    campoNovoAcesso.focus();
    return;
  }

  ocupado = true;
  atualizarBloqueio();
  mostrarMensagemAcesso("Adicionando acesso…");

  try {
    const dados = await consultarApi(
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ nome })
      },
      "/admin/api/acessos"
    );

    preencherAcessos(dados.acessos, dados.criado);
    formularioAlterado = true;

    fecharPainelAcesso(false);

    informar(
      `Acesso "${dados.criado}" adicionado e selecionado. ` +
      "Salve a solução para aplicar."
    );
  } catch (erro) {
    mostrarMensagemAcesso(erro.message, true);
  } finally {
    ocupado = false;
    atualizarBloqueio();

    if (painelNovoAcesso.hidden) {
      seletorAcessos.focus();
    } else {
      campoNovoAcesso.focus();
    }
  }
}

botaoSalvarAcesso.addEventListener("click", adicionarNovoAcesso);

// Enter adiciona o acesso sem enviar o formulário da solução.
campoNovoAcesso.addEventListener("keydown", evento => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    evento.stopPropagation();
    adicionarNovoAcesso();
  }

  if (evento.key === "Escape" && !ocupado) {
    evento.preventDefault();
    fecharPainelAcesso();
  }
});

// O nome do novo acesso é um campo auxiliar, não um dado da solução.
["input", "change"].forEach(acessoEvento => {
  campoNovoAcesso.addEventListener(acessoEvento, evento => {
    evento.stopPropagation();
  });
});

// Limpa o painel quando o formulário principal é reiniciado.
document.querySelector("#formulario-admin")
  .addEventListener("reset", () => {
    fecharPainelAcesso(false);
  });