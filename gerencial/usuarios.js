"use strict";
let sessao=null,usuarios=[],editando=null,versaoEdicao=0,alterado=false,senhaAlterada=false,ocupado=false,pronto=false,exclusao=null;
const formulario=document.querySelector("#formulario-usuario");
const formularioSenha=document.querySelector("#formulario-senha");
const lista=document.querySelector("#lista-usuarios");
const statusUsuarios=document.querySelector("#status-usuarios");
const campo=nome=>formulario.elements.namedItem(nome);
function informar(texto,erro=false){statusUsuarios.textContent=texto;statusUsuarios.style.color=erro?"#a12622":"#202b8c";}
function elemento(tag,texto,classe){const e=document.createElement(tag);if(texto!==undefined)e.textContent=texto;if(classe)e.className=classe;return e;}
function bloquear(){
  document.querySelectorAll("#formulario-usuario input,#formulario-usuario select,#formulario-usuario button,#formulario-senha input,#formulario-senha button,#lista-usuarios button,#confirmacao-exclusao button")
    .forEach(e=>e.disabled=ocupado||!pronto);
  for(const id of ["novo-usuario","atualizar-usuarios"])document.getElementById(id).disabled=ocupado||!pronto;
  document.querySelector("#sair-usuarios").disabled=ocupado;
  campo("email").readOnly=!!editando;
}
function podeDescartar(){return !(alterado||senhaAlterada)||confirm("Descartar as alterações não salvas do formulário?");}
function esconderExclusao(){exclusao=null;document.querySelector("#confirmacao-exclusao").hidden=true;}
function limpar(){
  formulario.reset();formularioSenha.reset();editando=null;versaoEdicao=0;alterado=false;senhaAlterada=false;
  campo("perfil").value="editor";campo("ativo").value="true";
  campo("senha").required=true;campo("confirmacao").required=true;
  document.querySelector("#campos-criar-senha").hidden=false;
  document.querySelector("#painel-alterar-senha").hidden=true;
  document.querySelector("#titulo-usuario").textContent="Novo usuário";
  esconderExclusao();bloquear();
}
function perderAcesso(texto){
  pronto=false;usuarios=[];lista.replaceChildren();
  document.querySelector("#retornar-login").hidden=false;
  informar(texto,true);bloquear();
}
async function apiUsuarios(acao,dados={}){
  const cliente=window.authCatalogo.obterCliente();
  const {data:s,error:erroSessao}=await cliente.auth.getSession();
  if(erroSessao||!s?.session?.access_token){const e=new Error("Entre novamente para continuar.");e.status=401;throw e;}
  const {data,error}=await cliente.functions.invoke("gerenciar-usuarios",{headers:{Authorization:"Bearer "+s.session.access_token},body:{acao,dados}});
  if(error){
    let detalhes;try{detalhes=await error.context.clone().json();}catch{}
    const e=new Error(detalhes?.erro||"Não foi possível acessar o serviço de usuários. Tente novamente ou procure o responsável pelo sistema.");
    e.status=error.context?.status||500;e.parcial=detalhes?.parcial===true;
    if(e.status===401||e.status===403)perderAcesso(e.message);
    throw e;
  }
  if(!data||typeof data!=="object")throw new Error("Resposta inesperada do serviço de usuários.");
  return data;
}
function renderizar(){
  lista.replaceChildren();
  for(const item of usuarios){
    const card=elemento("article",undefined,"item-admin");
    const rotulo=item.perfil==="administrador"?"Administrador":item.perfil==="editor"?"Editor":"Sem perfil";
    card.append(elemento("h3",item.email),elemento("p",(item.nome?item.nome+" • ":"")+rotulo+" • "+(item.ativo?"Ativo":"Inativo")));
    const acoes=elemento("div",undefined,"acoes-item");
    const editarBotao=elemento("button","Editar");editarBotao.type="button";editarBotao.setAttribute("aria-label","Editar "+item.email);
    editarBotao.addEventListener("click",()=>editar(item));acoes.append(editarBotao);
    if(item.id!==sessao.id){
      const excluir=elemento("button","Excluir","excluir");excluir.type="button";excluir.setAttribute("aria-label","Excluir "+item.email);
      excluir.addEventListener("click",()=>{
        if(ocupado||!podeDescartar())return;
        exclusao=item;document.querySelector("#texto-confirmacao").textContent=`Excluir a conta ${item.email}? O acesso ao catálogo será removido.`;
        document.querySelector("#confirmacao-exclusao").hidden=false;document.querySelector("#confirmar-exclusao").focus();
      });acoes.append(excluir);
    }
    card.append(acoes);lista.append(card);
  }
  if(!usuarios.length)lista.append(elemento("p","Nenhuma conta encontrada."));
  bloquear();
}
async function carregarUsuarios(){usuarios=(await apiUsuarios("listar")).usuarios;renderizar();}
function editar(item){
  if(ocupado||!podeDescartar())return;
  limpar();editando=item.id;versaoEdicao=item.versao;
  campo("email").value=item.email;campo("nome").value=item.nome||"";campo("perfil").value=item.perfil||"";campo("ativo").value=String(item.ativo);
  campo("senha").required=false;campo("confirmacao").required=false;
  document.querySelector("#campos-criar-senha").hidden=true;document.querySelector("#painel-alterar-senha").hidden=false;
  document.querySelector("#titulo-usuario").textContent="Editar usuário";bloquear();campo("nome").focus();
}
async function tratarFalha(erro){
  if(erro.status===401||erro.status===403){perderAcesso(erro.message);return;}
  if(erro.parcial||erro.status===409){try{await carregarUsuarios();}catch{}}
  informar(erro.message,true);
}
async function reautenticar(){
  alterado=false;senhaAlterada=false;
  try{await window.apiCatalogo.sair();window.location.replace("../login-supabase.html?continuar=gerencial");}
  catch(erro){perderAcesso("A alteração foi salva. Não foi possível encerrar a sessão; use Sair para entrar novamente.");}
}
formulario.addEventListener("input",()=>alterado=true);formulario.addEventListener("change",()=>alterado=true);
formularioSenha.addEventListener("input",()=>senhaAlterada=true);
formulario.addEventListener("submit",async evento=>{
  evento.preventDefault();if(ocupado||!pronto||!formulario.reportValidity())return;
  if(!editando&&campo("senha").value!==campo("confirmacao").value){informar("As senhas não coincidem.",true);return;}
  const dados={nome:campo("nome").value.trim(),perfil:campo("perfil").value,ativo:campo("ativo").value==="true"};
  if(editando){dados.id=editando;dados.versao=versaoEdicao;}
  else{dados.email=campo("email").value.trim();dados.senha=campo("senha").value;}
  ocupado=true;bloquear();informar("Salvando usuário…");
  try{
    const resultado=await apiUsuarios(editando?"salvar":"criar",dados);
    limpar();if(resultado.reautenticar){await reautenticar();return;}
    await carregarUsuarios();informar(resultado.mensagem||"Usuário salvo.");
  }catch(erro){await tratarFalha(erro);}
  finally{ocupado=false;bloquear();}
});
formularioSenha.addEventListener("submit",async evento=>{
  evento.preventDefault();if(ocupado||!pronto||!editando||!formularioSenha.reportValidity())return;
  const senha=document.querySelector("#nova-senha").value;
  if(senha!==document.querySelector("#confirmar-nova-senha").value){informar("As senhas não coincidem.",true);return;}
  ocupado=true;bloquear();informar("Alterando senha…");
  try{
    const resultado=await apiUsuarios("senha",{id:editando,versao:versaoEdicao,senha});
    formularioSenha.reset();senhaAlterada=false;
    if(resultado.reautenticar){await reautenticar();return;}
    informar(resultado.aviso||resultado.mensagem||"Senha alterada.");
  }catch(erro){await tratarFalha(erro);}
  finally{ocupado=false;bloquear();}
});
document.querySelector("#confirmar-exclusao").addEventListener("click",async()=>{
  if(ocupado||!pronto||!exclusao)return;
  const alvo=exclusao;ocupado=true;bloquear();informar("Excluindo conta…");
  try{
    const resultado=await apiUsuarios("excluir",{id:alvo.id,versao:alvo.versao});
    if(editando===alvo.id)limpar();else esconderExclusao();
    await carregarUsuarios();informar(resultado.aviso||resultado.mensagem||"Usuário excluído.");
  }catch(erro){esconderExclusao();await tratarFalha(erro);}
  finally{ocupado=false;bloquear();}
});
document.querySelector("#cancelar-exclusao").addEventListener("click",()=>{if(!ocupado)esconderExclusao();});
document.querySelector("#novo-usuario").addEventListener("click",()=>{if(!ocupado&&pronto&&podeDescartar()){limpar();campo("email").focus();}});
document.querySelector("#cancelar-usuario").addEventListener("click",()=>{if(!ocupado&&podeDescartar())limpar();});
document.querySelector("#atualizar-usuarios").addEventListener("click",async()=>{
  if(ocupado||!pronto||!podeDescartar())return;ocupado=true;bloquear();
  try{await carregarUsuarios();limpar();informar("Lista atualizada.");}catch(erro){await tratarFalha(erro);}finally{ocupado=false;bloquear();}
});
document.querySelector("#sair-usuarios").addEventListener("click",async()=>{
  if(ocupado||!podeDescartar())return;ocupado=true;bloquear();
  try{await window.apiCatalogo.sair();alterado=false;senhaAlterada=false;window.location.replace("../login-supabase.html");}
  catch(erro){informar(erro.message,true);}finally{ocupado=false;bloquear();}
});
window.addEventListener("beforeunload",evento=>{if(alterado||senhaAlterada||ocupado){evento.preventDefault();evento.returnValue="";}});
async function iniciar(){
  bloquear();
  try{
    sessao=await window.apiCatalogo.consultar({},"/admin/api/sessao");
    if(sessao.perfil!=="administrador"){alterado=false;senhaAlterada=false;window.location.replace("./administrar.html");return;}
    document.querySelector("#identificacao-usuario").textContent=sessao.usuario+" — Administrador";
    pronto=true;await carregarUsuarios();limpar();informar("Gestão de usuários carregada.");
  }catch(erro){pronto=false;document.querySelector("#retornar-login").hidden=false;informar(erro.message,true);}
  finally{bloquear();}
}
try{window.authCatalogo.obterCliente().auth.onAuthStateChange(evento=>{if(evento==="SIGNED_OUT")perderAcesso("Sessão encerrada. Entre novamente para continuar.");});}catch{}
window.addEventListener("pageshow",evento=>{if(evento.persisted&&!ocupado)iniciar();});
iniciar();
