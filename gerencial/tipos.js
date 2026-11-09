"use strict";

let tiposDisponiveis = [];

const seletorTipos = document.querySelector("#tipo");
const botaoNovoTipo = document.querySelector("#adicionar-tipo");
const painelNovoTipo = document.querySelector("#painel-novo-tipo");
const campoNovoTipo = document.querySelector("#nome-novo-tipo");
const botaoSalvarTipo = document.querySelector("#salvar-novo-tipo");
const botaoCancelarTipo = document.querySelector("#cancelar-novo-tipo");
const mensagemNovoTipo = document.querySelector("#mensagem-novo-tipo");

function preencherTipos(
  tipos,
  selecionado = seletorTipos.value
) {
  tiposDisponiveis = tipos;

  seletorTipos.replaceChildren(
    new Option("Selecione o tipo", "")
  );

  tipos.forEach(tipo => {
    seletorTipos.add(new Option(tipo, tipo));
  });

  if (tipos.includes(selecionado)) {
    seletorTipos.value = selecionado;
  }
}

async function carregarTipos() {
  const dados = await consultarApi(
    {},
    "/admin/api/tipos"
  );

  preencherTipos(dados.tipos);
  botaoNovoTipo.hidden = !dados.podeAdicionar;

  if (!dados.podeAdicionar) {
    fecharPainelTipo(false);
  }
}

function mostrarMensagemTipo(texto, erro = false) {
  mensagemNovoTipo.textContent = texto;
  mensagemNovoTipo.classList.toggle("erro", erro);
}

function fecharPainelTipo(devolverFoco = true) {
  painelNovoTipo.hidden = true;
  campoNovoTipo.value = "";
  botaoNovoTipo.setAttribute("aria-expanded", "false");
  mostrarMensagemTipo("");

  if (devolverFoco) {
    botaoNovoTipo.focus();
  }
}

botaoNovoTipo.addEventListener("click", () => {
  if (
    ocupado ||
    !carregado ||
    sessaoAtual?.perfil !== "administrador"
  ) {
    return;
  }

  if (!painelNovoTipo.hidden) {
    fecharPainelTipo();
    return;
  }

  painelNovoTipo.hidden = false;
  botaoNovoTipo.setAttribute("aria-expanded", "true");
  mostrarMensagemTipo("");
  campoNovoTipo.focus();
});

botaoCancelarTipo.addEventListener("click", () => {
  if (!ocupado) {
    fecharPainelTipo();
  }
});

async function adicionarNovoTipo() {
  if (
    ocupado ||
    !carregado ||
    sessaoAtual?.perfil !== "administrador"
  ) {
    return;
  }

  const nome = campoNovoTipo.value.trim();

  if (!nome) {
    mostrarMensagemTipo("Informe o nome do tipo.", true);
    campoNovoTipo.focus();
    return;
  }

  ocupado = true;
  atualizarBloqueio();
  mostrarMensagemTipo("Adicionando tipo…");

  try {
    const dados = await consultarApi(
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ nome })
      },
      "/admin/api/tipos"
    );

    preencherTipos(dados.tipos, dados.criado);
    formularioAlterado = true;

    fecharPainelTipo(false);

    informar(
      `Tipo "${dados.criado}" adicionado e selecionado. ` +
      "Salve a solução para aplicar."
    );
  } catch (erro) {
    mostrarMensagemTipo(erro.message, true);
  } finally {
    ocupado = false;
    atualizarBloqueio();

    if (painelNovoTipo.hidden) {
      seletorTipos.focus();
    } else {
      campoNovoTipo.focus();
    }
  }
}

botaoSalvarTipo.addEventListener("click", adicionarNovoTipo);

// Enter adiciona o tipo sem enviar o formulário da solução.
campoNovoTipo.addEventListener("keydown", evento => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    evento.stopPropagation();
    adicionarNovoTipo();
  }

  if (evento.key === "Escape" && !ocupado) {
    evento.preventDefault();
    fecharPainelTipo();
  }
});

// O nome do novo tipo é um campo auxiliar, não um dado da solução.
["input", "change"].forEach(tipoEvento => {
  campoNovoTipo.addEventListener(tipoEvento, evento => {
    evento.stopPropagation();
  });
});

// Limpa o painel quando o formulário principal é reiniciado.
document.querySelector("#formulario-admin")
  .addEventListener("reset", () => {
    fecharPainelTipo(false);
  });