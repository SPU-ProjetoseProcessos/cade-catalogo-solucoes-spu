let sessaoAtual = null;
let registros = [];
let versaoAtual = "";
let idEmEdicao = null;
let formularioAlterado = false;
let ocupado = false;
let carregado = false;

const formulario = document.querySelector("#formulario-admin");
const lista = document.querySelector("#lista-admin");
const busca = document.querySelector("#busca-admin");
const statusAdmin = document.querySelector("#status-admin");

const camposTexto = [
  "nome",
  "url",
  "descricao",
  "descricaoDetalhada",
  "publicoAlvo",
  "procedimentoAcesso",
  "unidade",
  "siglaUnidade",
  "acesso",
  "tipo",
  "manualUsuario",
  "documentosApoio",
  "canalSuporte",
  "tipoAutenticacao",
  "orientacaoLogin",
  "quemLiberaAcesso",
  "funcionaForaRede",
  "solucoesRelacionadas",
  "situacao"
];

function normalizarAdmin(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function informar(mensagem, erro = false) {
  statusAdmin.textContent = mensagem;
  statusAdmin.classList.toggle("erro", erro);
}

function criar(tag, texto, classe) {
  const elemento = document.createElement(tag);

  if (texto !== undefined) {
    elemento.textContent = texto;
  }

  if (classe) {
    elemento.className = classe;
  }

  return elemento;
}

function atualizarBloqueio() {
  const bloquear = ocupado || !carregado;

  formulario.querySelectorAll("input, select, textarea, button")
    .forEach(elemento => {
      elemento.disabled = bloquear;
    });

  document.querySelector("#novo-registro").disabled = bloquear;

  lista.querySelectorAll("button").forEach(botao => {
    botao.disabled = bloquear;
  });

  document.querySelector("#sair-admin").disabled = ocupado;
}

async function consultarApi(opcoes = {}, caminho = "/admin/api/catalogo") {
  return window.apiCatalogo.consultar(opcoes, caminho);
}

async function salvarNoServidor(novosRegistros) {
  const dados = await consultarApi({
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      versao: versaoAtual,
      registros: novosRegistros
    })
  });

  registros = dados.registros;
  versaoAtual = dados.versao;
}

function podeDescartarFormulario() {
  return !formularioAlterado || confirm(
    "Há alterações no formulário que não foram salvas. Descartá-las?"
  );
}

function limparFormulario() {
  formulario.reset();
  reconstruirManuais([]);
  reconstruirDocumentosApoio([]);
  idEmEdicao = null;
  formularioAlterado = false;

  document.querySelector("#titulo-formulario").textContent =
    "Novo recurso";
}

function reconstruirManuais(valores) {
  const listaManuais=document.querySelector("#lista-manuais");
  listaManuais.replaceChildren();
  const linhas=valores.length?valores:[""];
  linhas.forEach((valor,indice)=>{
    const linha=document.createElement("div");linha.className="seletor-tipo linha-manual";
    const input=document.createElement("input");input.type="url";input.id=`manual-link-${indice+1}`;input.value=valor;input.placeholder="https://";input.setAttribute("aria-label",`Link do manual ${indice+1}`);
    const adicionar=document.createElement("button");adicionar.type="button";adicionar.className="botao-novo-tipo adicionar-manual";adicionar.textContent="+ Adicionar link";
    adicionar.addEventListener("click",()=>{reconstruirManuais([...obterManuais(),""]);listaManuais.lastElementChild.querySelector("input").focus();});
    linha.append(input,adicionar);
    if(indice>0){const remover=document.createElement("button");remover.type="button";remover.className="botao-novo-tipo remover-manual";remover.textContent="Remover";remover.addEventListener("click",()=>reconstruirManuais(obterManuais().filter((_,i)=>i!==indice)));linha.append(remover);}
    listaManuais.append(linha);
  });
  formulario.elements.namedItem("manualUsuario").value=linhas.filter(Boolean).join("\n");
}
function obterManuais(){return [...document.querySelectorAll("#lista-manuais input")].map(i=>i.value.trim());}

function reconstruirDocumentosApoio(valores) {
  const lista=document.querySelector("#lista-documentos-apoio");lista.replaceChildren();
  const linhas=valores.length?valores:[""];
  linhas.forEach((valor,indice)=>{
    const linha=document.createElement("div");linha.className="seletor-tipo linha-manual";
    const input=document.createElement("input");input.type="text";input.id=`documento-apoio-${indice+1}`;input.value=valor;input.placeholder="Cole um link ou descreva o documento";input.setAttribute("aria-label",`Documento de apoio ${indice+1}`);
    const adicionar=document.createElement("button");adicionar.type="button";adicionar.className="botao-novo-tipo adicionar-documento-apoio";adicionar.textContent="+ Nova opção";
    adicionar.addEventListener("click",()=>{reconstruirDocumentosApoio([...obterDocumentosApoio(),""]);lista.lastElementChild.querySelector("input").focus();});
    linha.append(input,adicionar);
    if(indice>0){const remover=document.createElement("button");remover.type="button";remover.className="botao-novo-tipo remover-manual";remover.textContent="Remover";remover.addEventListener("click",()=>reconstruirDocumentosApoio(obterDocumentosApoio().filter((_,i)=>i!==indice)));linha.append(remover);}
    lista.append(linha);
  });
  formulario.elements.namedItem("documentosApoio").value=linhas.filter(Boolean).join("\n");
}
function obterDocumentosApoio(){return [...document.querySelectorAll("#lista-documentos-apoio input")].map(i=>i.value.trim());}

function editarRegistro(id) {
  if (ocupado || !podeDescartarFormulario()) {
    return;
  }

  const registro = registros.find(item => item.id === id);

  if (!registro) {
    return;
  }

  limparFormulario();
  idEmEdicao = id;

  camposTexto.forEach(campo => {
    formulario.elements.namedItem(campo).value =
      registro[campo] || "";
  });
  reconstruirManuais(String(registro.manualUsuario||"").split(/\r?\n/).filter(Boolean));
  reconstruirDocumentosApoio(String(registro.documentosApoio||"").split(/\r?\n/).filter(Boolean));

  formulario.elements.namedItem("palavrasChave").value =
    (registro.palavrasChave || []).join("; ");

  document.querySelector("#titulo-formulario").textContent =
    `Editar recurso — ID ${id}`;

  formulario.elements.namedItem("nome").focus();
}

async function excluirRegistro(id) {
  if (sessaoAtual?.perfil !== "administrador") { informar("Seu perfil não permite excluir soluções.", true); return; }
  if (ocupado) {
    return;
  }

  const registro = registros.find(item => item.id === id);

  if (!registro) {
    return;
  }

  if (
    idEmEdicao === id &&
    !podeDescartarFormulario()
  ) {
    return;
  }

  if (!confirm(`Excluir "${registro.nome}" do catálogo publicado?`)) {
    return;
  }

  ocupado = true;
  atualizarBloqueio();
  informar("Excluindo recurso…");

  try {
    const novosRegistros = registros.filter(item => item.id !== id);

    await salvarNoServidor(novosRegistros);

    if (idEmEdicao === id) {
      limparFormulario();
    }

    renderizarLista();
    informar("Recurso excluído e catálogo salvo.");
  } catch (erro) {
    informar(
      erro.message + " A exclusão não foi confirmada.",
      true
    );
  } finally {
    ocupado = false;
    atualizarBloqueio();
  }
}

function renderizarLista() {
  const termo = normalizarAdmin(busca.value).trim();

  const encontrados = registros.filter(registro =>
    normalizarAdmin(registro.nome).includes(termo)
  );

  lista.replaceChildren();

  encontrados.forEach(registro => {
    const item = criar("article", undefined, "item-admin");

    item.append(
      criar("h3", registro.nome),
      criar(
        "p",
        `${registro.tipo} • ${registro.unidade} • ID ${registro.id}`
      )
    );

    const acoes = criar("div", undefined, "acoes-item");

    const editar = criar("button", "Editar");
    editar.type = "button";
    editar.setAttribute("aria-label", `Editar ${registro.nome}`);
    editar.addEventListener("click", () => editarRegistro(registro.id));

    const excluir = criar("button", "Excluir", "excluir");
    excluir.type = "button";
    excluir.setAttribute("aria-label", `Excluir ${registro.nome}`);
    excluir.addEventListener("click", () => excluirRegistro(registro.id));

    acoes.append(editar);
    if (sessaoAtual?.perfil === "administrador") {
      const suspensa = registro.exibicaoSuspensa === true;
      const botaoExibicao = criar("button", suspensa ? "Exibir solução" : "Suspender exibição", suspensa ? "botao-suspensao botao-exibir-solucao" : "botao-suspensao");
      botaoExibicao.type = "button";
      botaoExibicao.setAttribute("aria-label", `${suspensa ? "Exibir" : "Suspender exibição de"} ${registro.nome}`);
      botaoExibicao.addEventListener("click", async () => {
        if (ocupado) return;
        ocupado = true;
        atualizarBloqueio();
        informar(suspensa ? "Reexibindo solução…" : "Suspendendo exibição…");
        try {
          const dados = await consultarApi({
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: String(registro.id), suspensa: !suspensa })
          }, "/admin/api/suspensao");
          registros = dados.registros;
          versaoAtual = dados.versao;
          renderizarLista();
          informar(suspensa ? "Solução novamente visível no catálogo." : "Exibição da solução suspensa.");
        } catch (erro) {
          informar(erro.message + " A alteração não foi confirmada.", true);
        } finally {
          ocupado = false;
          atualizarBloqueio();
        }
      });
      acoes.append(botaoExibicao, excluir);
    }
    item.appendChild(acoes);
    lista.appendChild(item);
  });

  if (encontrados.length === 0) {
    lista.appendChild(criar("p", "Nenhum recurso encontrado."));
  }

  document.querySelector("#contagem-admin").textContent =
    `${encontrados.length} de ${registros.length} recursos`;

  atualizarBloqueio();
}

function renderizarSugestoes(sugestoes = []) {
  const painel=document.querySelector("#painel-sugestoes");
  if(sessaoAtual?.perfil!=="administrador"){painel.hidden=true;return;}
  painel.hidden=false;
  const lista=document.querySelector("#lista-sugestoes");lista.replaceChildren();
  if(!sugestoes.length){lista.append(criar("p","Ainda não há sugestões."));return;}
  sugestoes.forEach(s=>{
    const linha=criar("article",undefined,"item-admin");
    linha.append(criar("p",s.texto),criar("small",new Date(s.criadaEm).toLocaleString("pt-BR")));
    const remover=criar("button","Remover sugestão","excluir");remover.type="button";
    remover.addEventListener("click",async()=>{
      if(ocupado)return;
      ocupado=true;atualizarBloqueio();informar("Removendo sugestão…");
      try {
        await consultarApi({method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:s.id})},"/admin/api/sugestoes");
        await carregarSugestoes();informar("Sugestão removida.");
      } catch(erro) { informar(erro.message+" A remoção não foi confirmada.",true); }
      finally { ocupado=false;atualizarBloqueio(); }
    });
    linha.append(remover);lista.append(linha);
  });
}

async function carregarSugestoes() {
  if(sessaoAtual?.perfil!=="administrador")return;
  const dados=await consultarApi({},"/admin/api/sugestoes");
  renderizarSugestoes(dados.sugestoes||[]);
}

formulario.addEventListener("input", () => {
  formularioAlterado = true;
});

formulario.addEventListener("change", () => {
  formularioAlterado = true;
});

formulario.addEventListener("submit", async evento => {
  evento.preventDefault();

  if (ocupado || !carregado || !formulario.reportValidity()) {
    return;
  }

  const registro = {
    id: idEmEdicao || crypto.randomUUID()
  };

  formulario.elements.namedItem("manualUsuario").value=obterManuais().filter(Boolean).join("\n");
  formulario.elements.namedItem("documentosApoio").value=obterDocumentosApoio().filter(Boolean).join("\n");

  camposTexto.forEach(campo => {
    registro[campo] = formulario.elements
      .namedItem(campo)
      .value
      .trim();
  });

  registro.palavrasChave = formulario.elements
    .namedItem("palavrasChave")
    .value
    .split(";")
    .map(valor => valor.trim())
    .filter(Boolean);

  const novosRegistros = [...registros];

  const indice = novosRegistros.findIndex(
    item => item.id === registro.id
  );

  if (indice >= 0) {
    // Mantém a suspensão atual; somente o botão de suspensão altera esse estado.
    registro.exibicaoSuspensa = novosRegistros[indice].exibicaoSuspensa === true;
    novosRegistros[indice] = registro;
  } else {
    registro.exibicaoSuspensa = false;
    novosRegistros.push(registro);
  }

  ocupado = true;
  atualizarBloqueio();
  informar("Salvando recurso…");

  try {
    await salvarNoServidor(novosRegistros);

    limparFormulario();
    renderizarLista();
    await carregarSugestoes();

    informar("Recurso salvo diretamente no catálogo.");
  } catch (erro) {
    informar(
      erro.message + " O formulário foi mantido para você conferir.",
      true
    );
  } finally {
    ocupado = false;
    atualizarBloqueio();
  }
});

document.querySelector("#novo-registro")
  .addEventListener("click", () => {
    if (!ocupado && podeDescartarFormulario()) {
      limparFormulario();
      formulario.elements.namedItem("nome").focus();
    }
  });

document.querySelector("#cancelar-edicao")
  .addEventListener("click", () => {
    if (!ocupado && podeDescartarFormulario()) {
      limparFormulario();
    }
  });

busca.addEventListener("input", renderizarLista);

document.querySelector("#sair-admin")
  .addEventListener("click", async () => {
    if (ocupado || !podeDescartarFormulario()) {
      return;
    }

    try {
      await window.apiCatalogo.sair();
      formularioAlterado = false;
      window.location.replace("../login-supabase.html");
    } catch (erro) {
      informar(erro.message, true);
    }
  });

window.addEventListener("beforeunload", evento => {
  if (formularioAlterado || ocupado) {
    evento.preventDefault();
    evento.returnValue = "";
  }
});

async function iniciar() {
  const situacao = document.querySelector("#situacao-exportacao");

  if (situacao) {
    situacao.hidden = true;
  }

  atualizarBloqueio();
  informar("Carregando recursos…");

  try {
    sessaoAtual = await consultarApi({}, "/admin/api/sessao");
    document.querySelector("#perfil-atual").textContent =
      `${sessaoAtual.usuario} — ${sessaoAtual.perfil === "administrador" ? "Administrador" : "Editor"}`;
    document.querySelector("#gerenciar-usuarios").hidden = sessaoAtual.perfil !== "administrador";
    
    await carregarTipos();
    await carregarAcessos();
    await carregarListasRespostas();
    
    const dados = await consultarApi();

    registros = dados.registros;
    versaoAtual = dados.versao;
    carregado = true;
    inicializarGestaoOpcoes();

    renderizarLista();
    await carregarSugestoes();
    informar("Catálogo carregado. As alterações são publicadas ao salvar.");
  } catch (erro) {
    if (erro.code === "NAO_AUTENTICADO") { window.location.replace("../login-supabase.html?continuar=gerencial"); return; }
    document.querySelector("#retornar-login").hidden = false;
    informar(
      erro.message + " Recarregue a página para tentar novamente.",
      true
    );
  } finally {
    atualizarBloqueio();
  }
}

// Converte os controles estáticos do HTML em campos com eventos de adicionar/remover.
reconstruirManuais([]);
reconstruirDocumentosApoio([]);

try {
  window.authCatalogo.obterCliente().auth.onAuthStateChange(evento => {
    if (evento === "SIGNED_OUT") {
      carregado = false;
      atualizarBloqueio();
      document.querySelector("#retornar-login").hidden = false;
      informar("Sessão encerrada. Preserve as alterações não salvas e entre novamente.", true);
    }
  });
} catch {}
iniciar();
