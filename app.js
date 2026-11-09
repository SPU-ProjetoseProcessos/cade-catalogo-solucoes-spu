"use strict";

let recursos = [];
const ITENS_POR_PAGINA = 10;
let paginaAtual = 1;

const formulario = document.querySelector("#filtros");
const campoBusca = document.querySelector("#busca");
const filtroUnidade = document.querySelector("#unidade");
const filtroTipo = document.querySelector("#tipo");
const filtroAcesso = document.querySelector("#acesso");
const resultados = document.querySelector("#resultados");
const mensagemVazia = document.querySelector("#vazio");

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function criarElemento(tag, texto, classe) {
  const elemento = document.createElement(tag);

  if (texto !== undefined) {
    elemento.textContent = texto;
  }

  if (classe) {
    elemento.className = classe;
  }

  return elemento;
}

function obterUrlValida(endereco) {
  try {
    const url = new URL(endereco);

    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function renovarFiltros() {
  const configuracoes = [
    [filtroUnidade, "unidade", "Todas as unidades"],
    [filtroTipo, "tipo", "Todos os tipos"],
    [filtroAcesso, "acesso", "Todos os acessos"]
  ];

  for (const [select, campo, rotulo] of configuracoes) {
    const anterior = select.value;

    const valores = [
      ...new Set(
        recursos
          .map(item => item[campo])
          .filter(Boolean)
      )
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));

    select.replaceChildren(new Option(rotulo, ""));

    valores.forEach(valor => {
      select.add(new Option(valor, valor));
    });

    if (valores.includes(anterior)) {
      select.value = anterior;
    }
  }
}

function criarCartao(recurso) {
  const tipos = { aplicativo: "aplicativo", painel: "painel", sistema: "sistema", portal: "portal" };
  const tipo = tipos[normalizar(recurso.tipo).trim()] || "outros";
  const card = criarElemento("article", undefined, "recurso");
  const cabecalho = criarElemento("div", undefined, "recurso-cabecalho");
  const titulo = criarElemento("h3");
  const url = obterUrlValida(recurso.url);

  if (url) {
    const link = criarElemento("a", undefined, "link-solucao");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${recurso.nome} (abre em nova aba)`);
    link.append(criarElemento("span", recurso.nome));
    titulo.append(link);
  } else {
    titulo.textContent = recurso.nome;
  }

  const etiquetas = criarElemento("div", undefined, "etiquetas etiquetas-resumo");
  etiquetas.append(
    criarElemento("span", recurso.tipo, `etiqueta tipo-${tipo}`),
    criarElemento("span", `Acesso ${recurso.acesso}`,
      normalizar(recurso.acesso) === "aberto" ? "etiqueta aberto" :
      normalizar(recurso.acesso) === "restrito" ? "etiqueta restrito" : "etiqueta acesso-outro")
  );

  // Exibe na tag somente a sigla informada no cadastro.
  const siglaUnidade = String(recurso.siglaUnidade ?? "").trim();

  if (siglaUnidade) {
    const tag = criarElemento(
      "span",
      siglaUnidade,
      "etiqueta etiqueta-unidade"
    );

    tag.title = `Unidade responsável: ${recurso.unidade}`;

    etiquetas.append(tag);
  }

  const descricaoBreve = criarElemento("p",
    recurso.descricao || "Descrição breve não informada.", "descricao-card");
  const detalhes = criarElemento("div", undefined, "recurso-detalhes");
  detalhes.id = `solucao-${crypto.randomUUID()}-detalhes`;
  detalhes.hidden = true;

  const botao = criarElemento("button", "+", "botao-expandir");
  botao.type = "button";
  botao.setAttribute("aria-controls", detalhes.id);
  botao.setAttribute("aria-expanded", "false");
  botao.setAttribute("aria-label", `Mostrar informações de ${recurso.nome}`);
  botao.addEventListener("click", () => {
    const abrir = detalhes.hidden;
    detalhes.hidden = !abrir;
    botao.textContent = abrir ? "−" : "+";
    botao.setAttribute("aria-expanded", String(abrir));
    botao.setAttribute("aria-label",
      `${abrir ? "Ocultar" : "Mostrar"} informações de ${recurso.nome}`);
  });
  cabecalho.append(titulo, botao);

  const colunas = criarElemento("div", undefined, "colunas-detalhes");
  const esquerda = criarElemento("div", undefined, "coluna-detalhes");
  const direita = criarElemento("div", undefined, "coluna-detalhes");

  function adicionarCampo(coluna, rotulo, valor, permiteLink = false) {
    const secao = criarElemento("section", undefined, "campo-detalhe");
    secao.append(criarElemento("h4", rotulo, "titulo-detalhe"));
    if (permiteLink) {
      const lista = criarElemento("dl", undefined, "informacoes-card");
      const grupo = criarElemento("div");
      // Mantém a lista de descrição semanticamente completa.
      grupo.append(criarElemento("dt", rotulo, "rotulo-acessivel"), criarInformacaoComLink(valor));
      lista.append(grupo);
      secao.append(lista);
    } else {
      secao.append(criarElemento("p", valor || "Não informado.", "texto-detalhado"));
    }
    coluna.append(secao);
  }

  adicionarCampo(esquerda, "Descrição", recurso.descricaoDetalhada);
  adicionarCampo(esquerda, "Unidade responsável", recurso.unidade);
  adicionarCampo(esquerda, "Quem pode usar?", recurso.publicoAlvo);
  adicionarCampo(esquerda, "Como conseguir o acesso?", recurso.procedimentoAcesso);
  adicionarCampo(esquerda, "Que login e senha usar?", recurso.orientacaoLogin);
  adicionarCampo(esquerda, "Quem libera o acesso?", recurso.quemLiberaAcesso);
  adicionarCampo(esquerda, "Funciona fora da rede?", recurso.funcionaForaRede);
  adicionarCampo(direita, "Situação", recurso.situacao);
  adicionarCampo(direita, "Manual do usuário", recurso.manualUsuario, true);
  adicionarCampo(direita, "Documentos de apoio", recurso.documentosApoio, true);
  adicionarCampo(direita, "Canal de suporte", recurso.canalSuporte, true);
  adicionarCampo(direita, "Tipo de autenticação", recurso.tipoAutenticacao);
  adicionarCampo(direita, "Soluções relacionadas", recurso.solucoesRelacionadas);

  colunas.append(esquerda, direita);
  detalhes.append(colunas);
  if (!url) {
    detalhes.append(criarElemento("p", "Link de acesso não cadastrado.", "link-pendente"));
  }
  card.append(cabecalho, etiquetas, descricaoBreve, detalhes);
  return card;
}

function criarInformacaoComLink(valor) {
  const conteudo = criarElemento("dd");
  const texto = String(valor ?? "").trim();
  const url = obterUrlValida(texto);

  if (url) {
    const link = criarElemento("a", texto);

    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    link.setAttribute(
      "aria-label",
      `${texto} (abre em nova aba)`
    );

    conteudo.append(link);
  } else {
    conteudo.textContent = texto || "Não informado.";
  }

  return conteudo;
}

function extrairTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  if (Array.isArray(valor)) {
    return valor.map(extrairTexto).join(" ");
  }

  if (typeof valor === "object") {
    return Object.values(valor)
      .map(extrairTexto)
      .join(" ");
  }

  return String(valor);
}

function atualizarResultados() {
  const termos = normalizar(campoBusca.value)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // A RPC pública já retorna somente soluções cuja exibição está ativa.
  const recursosVisiveis = recursos;
  const encontrados = recursosVisiveis.filter(item => {
    const texto = normalizar(extrairTexto(item));

    const correspondeBusca = termos.every(termo =>
      texto.includes(termo)
    );

    const correspondeUnidade =
      !filtroUnidade.value ||
      item.unidade === filtroUnidade.value;

    const correspondeTipo =
      !filtroTipo.value ||
      item.tipo === filtroTipo.value;

    const correspondeAcesso =
      !filtroAcesso.value ||
      item.acesso === filtroAcesso.value;

    return (
      correspondeBusca &&
      correspondeUnidade &&
      correspondeTipo &&
      correspondeAcesso
    );
  });

  const totalPaginas = Math.max(1, Math.ceil(encontrados.length / ITENS_POR_PAGINA));
  paginaAtual = Math.min(paginaAtual, totalPaginas);
  const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const fragmento = document.createDocumentFragment();

  encontrados.slice(inicio, inicio + ITENS_POR_PAGINA).forEach(item => {
    fragmento.append(criarCartao(item));
  });

  resultados.replaceChildren(fragmento);
  renderizarPaginacao(totalPaginas);

  document.querySelector("#contagem").textContent =
    `${encontrados.length} de ${recursosVisiveis.length} soluções`;

  mensagemVazia.hidden = encontrados.length > 0;

  mensagemVazia.textContent = recursos.length
    ? "Nenhum recurso encontrado. Tente outra pesquisa ou limpe os filtros."
    : "Nenhum recurso disponível no catálogo.";

  const selecionados = [];

  if (filtroUnidade.value) {
    selecionados.push(`Unidade: ${filtroUnidade.value}`);
  }

  if (filtroTipo.value) {
    selecionados.push(`Tipo: ${filtroTipo.value}`);
  }

  if (filtroAcesso.value) {
    selecionados.push(`Acesso: ${filtroAcesso.value}`);
  }

  const resumo = document.querySelector("#resumo-filtros");

  resumo.textContent = selecionados.join(" • ");
  resumo.hidden = selecionados.length === 0;
}

function renderizarPaginacao(total) {
  let nav = document.querySelector("#paginacao");
  if (!nav) { nav=document.createElement("nav");nav.id="paginacao";nav.className="paginacao";nav.setAttribute("aria-label","Paginação de soluções");resultados.after(nav); }
  nav.replaceChildren(); if(total<=1)return;
  const criarBotao=(texto,destino,desabilitado)=>{const b=document.createElement("button");b.type="button";b.textContent=texto;b.disabled=desabilitado;b.addEventListener("click",()=>{paginaAtual=destino;atualizarResultados();document.querySelector("#resultados .recurso")?.scrollIntoView({behavior:"smooth",block:"start"});});return b;};
  nav.append(criarBotao("Anterior",paginaAtual-1,paginaAtual===1));
  const estado=document.createElement("span");estado.textContent=`Página ${paginaAtual} de ${total}`;estado.setAttribute("aria-live","polite");nav.append(estado);
  nav.append(criarBotao("Próxima",paginaAtual+1,paginaAtual===total));
}

formulario.addEventListener("submit", evento => {
  evento.preventDefault();
  atualizarResultados();
});

campoBusca.addEventListener(
  "input",
  atualizarResultados
);

[filtroUnidade, filtroTipo, filtroAcesso].forEach(filtro => {
  filtro.addEventListener(
    "change",
    atualizarResultados
  );
});

formulario.addEventListener("reset", evento => {
  evento.preventDefault();

  campoBusca.value = "";
  filtroUnidade.value = "";
  filtroTipo.value = "";
  filtroAcesso.value = "";

  atualizarResultados();
  campoBusca.focus();
});

const dialogoSugestao=document.querySelector("#dialogo-sugestao");
document.querySelector("#abrir-sugestao").addEventListener("click",()=>dialogoSugestao.showModal());
document.querySelector("#fechar-sugestao").addEventListener("click",()=>dialogoSugestao.close());
document.querySelector("#formulario-sugestao").addEventListener("submit",async evento=>{
  evento.preventDefault();
  const texto=document.querySelector("#texto-sugestao").value.trim();
  if(!texto)return;
  const enviar=document.querySelector('#formulario-sugestao button[type="submit"]');
  const status=document.querySelector("#status-sugestao");
  enviar.disabled=true;
  status.textContent="Enviando sugestão…";
  try {
    const cliente=window.authCatalogo.obterCliente();
    const {error}=await cliente.rpc("spu_registrar_sugestao",{p_texto:texto});
    if(error)throw error;
    document.querySelector("#formulario-sugestao").reset();
    status.textContent="Sugestão registrada. Obrigado pela contribuição.";
    setTimeout(()=>dialogoSugestao.close(),900);
  } catch(erro) {
    console.error("Falha ao enviar sugestão:",erro);
    status.textContent=erro?.code==="22023"?erro.message:"Não foi possível enviar a sugestão. Tente novamente.";
  } finally {
    enviar.disabled=false;
  }
});
