"use strict";

function inicializarGestaoOpcoes() {
  if (sessaoAtual?.perfil !== "administrador" || document.querySelector("[data-gestao-opcoes]")) return;
  const campos = {
    tipo: {rotulo:"Tipo de solução", rota:"tipos"},
    acesso: {rotulo:"Acesso", rota:"acessos"},
    publicoAlvo: {rotulo:"Quem pode usar?", rota:"respostas"},
    procedimentoAcesso: {rotulo:"Como conseguir o acesso?", rota:"respostas"},
    orientacaoLogin: {rotulo:"Que login e senha usar?", rota:"respostas"},
    quemLiberaAcesso: {rotulo:"Quem libera o acesso?", rota:"respostas"},
    funcionaForaRede: {rotulo:"Funciona fora da rede?", rota:"respostas"},
    situacao: {rotulo:"Situação", rota:"respostas"}
  };
  for (const [campo,config] of Object.entries(campos)) {
    const select = document.getElementById(campo);
    const criarNo = (tag,texto) => { const e=document.createElement(tag); if(texto!==undefined)e.textContent=texto;return e; };
    const botao=criarNo("button","Gerenciar opções");botao.type="button";
    botao.dataset.gestaoOpcoes=campo;
    botao.className="botao-novo-tipo";
    botao.setAttribute("aria-expanded","false");
    const painel=criarNo("div");painel.className="painel-novo-tipo";painel.hidden=true;
    painel.id=`gestao-opcoes-${campo}`;botao.setAttribute("aria-controls",painel.id);
    const label=criarNo("label",`Opção de ${config.rotulo} para gerenciar`);
    const escolha=criarNo("select");escolha.id=`escolha-opcao-${campo}`;label.htmlFor=escolha.id;
    const labelNome=criarNo("label","Novo texto da opção");
    const nome=criarNo("textarea");nome.rows=3;nome.maxLength=config.rota==="respostas"?10000:80;
    nome.id=`edicao-opcao-${campo}`;labelNome.htmlFor=nome.id;
    const acoes=criarNo("div");acoes.className="acoes-novo-tipo";
    const editar=criarNo("button","Salvar alteração");editar.type="button";editar.className="botao-principal";
    const excluir=criarNo("button","Excluir opção");excluir.type="button";excluir.style.color="#b42318";
    const fechar=criarNo("button","Fechar");fechar.type="button";
    acoes.append(editar,excluir,fechar);
    const aviso=criarNo("p","Renomear atualiza as soluções que usam esta opção. Só é possível excluir opções sem uso.");
    const confirmacao=criarNo("div");confirmacao.hidden=true;
    const textoConfirmacao=criarNo("p");
    const confirmar=criarNo("button","Confirmar exclusão");confirmar.type="button";confirmar.style.color="#b42318";
    const cancelar=criarNo("button","Cancelar");cancelar.type="button";
    confirmacao.append(textoConfirmacao,confirmar,cancelar);
    const mensagem=criarNo("p");mensagem.className="mensagem-novo-tipo";mensagem.setAttribute("role","status");mensagem.setAttribute("aria-live","polite");
    painel.append(label,escolha,labelNome,nome,acoes,aviso,confirmacao,mensagem);
    const container=select.closest(".seletor-tipo") || select;
    const barra=document.createElement("div");
    barra.className="barra-opcoes-admin";
    container.parentNode.insertBefore(barra,container);
    barra.append(container,botao);
    barra.insertAdjacentElement("afterend",painel);
    const informarPainel=(texto,erro=false)=>{mensagem.textContent=texto;mensagem.classList.toggle("erro",erro);};
    const atualizarEscolha=()=>{nome.value=escolha.value;confirmacao.hidden=true;editar.disabled=!escolha.value;excluir.disabled=!escolha.value;};
    function preencherGerencia(opcoes,selecionado=escolha.value) {
      escolha.replaceChildren(new Option("Selecione a opção", ""));
      opcoes.forEach(opcao=>escolha.add(new Option(opcao,opcao)));
      if(opcoes.includes(selecionado))escolha.value=selecionado;
      atualizarEscolha();
    }
    async function carregar() {
      ocupado=true;atualizarBloqueio();informarPainel("Carregando opções…");
      try {
        const dados=await consultarApi({},`/admin/api/${config.rota}`);
        preencherGerencia(config.rota==="respostas"?dados.listas[campo]:dados[config.rota]);
        informarPainel("");
      }catch(erro){informarPainel(erro.message,true);}
      finally{ocupado=false;atualizarBloqueio();atualizarEscolha();}
    }
    botao.addEventListener("click",async()=>{
      if(ocupado||!carregado||sessaoAtual?.perfil!=="administrador")return;
      painel.hidden=!painel.hidden;botao.setAttribute("aria-expanded",String(!painel.hidden));
      if(!painel.hidden){await carregar();escolha.focus();}
    });
    escolha.addEventListener("change",()=>{atualizarEscolha();informarPainel("");});
    nome.addEventListener("input",()=>{confirmacao.hidden=true;});
    fechar.addEventListener("click",()=>{if(ocupado)return;painel.hidden=true;botao.setAttribute("aria-expanded","false");botao.focus();});
    excluir.addEventListener("click",()=>{
      if(ocupado||!escolha.value)return;
      textoConfirmacao.textContent=`Excluir a opção "${escolha.value}"?`;
      confirmacao.hidden=false;confirmar.focus();
    });
    cancelar.addEventListener("click",()=>{confirmacao.hidden=true;excluir.focus();});
    async function executar(apagar) {
      if(ocupado||!carregado||sessaoAtual?.perfil!=="administrador"||!escolha.value)return;
      const anterior=escolha.value,novo=nome.value.trim(),selecionado=select.value;
      if(!apagar&&!novo){informarPainel("Informe o novo texto da opção.",true);return;}
      ocupado=true;atualizarBloqueio();informarPainel("Salvando…");
      try {
        const dados=await consultarApi({method:apagar?"DELETE":"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({campo,anterior,nome:novo,versao:versaoAtual})},`/admin/api/${config.rota}`);
        registros=dados.registros;versaoAtual=dados.versao;
        select.replaceChildren(new Option(config.rota==="respostas"?"Não informado":"Selecione", ""));
        dados.opcoes.forEach(opcao=>select.add(new Option(opcao,opcao)));
        const valor=selecionado===anterior?dados.atual:selecionado;
        if(dados.opcoes.includes(valor))select.value=valor;
        if(valor!==selecionado)formularioAlterado=true;
        preencherGerencia(dados.opcoes,dados.atual);
        renderizarLista();
        informarPainel(apagar?"Opção excluída.":`Opção atualizada. ${dados.atualizadas} solução(ões) atualizada(s).`);
      }catch(erro){informarPainel(erro.message,true);}
      finally{ocupado=false;atualizarBloqueio();atualizarEscolha();}
    }
    editar.addEventListener("click",()=>executar(false));
    confirmar.addEventListener("click",()=>executar(true));
    for(const evento of ["input","change"])painel.addEventListener(evento,e=>e.stopPropagation());
    painel.addEventListener("keydown",e=>{
      if(e.key==="Enter"&&e.target.tagName!=="TEXTAREA")e.preventDefault();
      if(e.key==="Escape"&&!ocupado){painel.hidden=true;botao.setAttribute("aria-expanded","false");botao.focus();}
    });
    formulario.addEventListener("reset",()=>{painel.hidden=true;confirmacao.hidden=true;botao.setAttribute("aria-expanded","false");});
  }
}
