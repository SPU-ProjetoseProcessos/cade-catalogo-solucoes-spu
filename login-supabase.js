"use strict";
(() => {
  const formulario=document.querySelector("#formulario-login");
  const email=document.querySelector("#email");
  const senha=document.querySelector("#senha");
  const alternar=document.querySelector("#alternar-senha");
  const entrar=document.querySelector("#entrar");
  const recuperar=document.querySelector("#solicitar-recuperacao");
  const sair=document.querySelector("#sair-supabase");
  const sessao=document.querySelector("#sessao-autenticada");
  const status=document.querySelector("#status-login");
  const titulo=document.querySelector("#titulo-login");
  let cliente,ocupado=false,revisao=0;

  function mensagem(texto="") {status.textContent=texto;status.hidden=!texto;}
  function mostrarSenha(ativar=false) {
    senha.type=ativar?"text":"password";
    alternar.textContent=ativar?"Ocultar":"Mostrar";
    alternar.setAttribute("aria-label",ativar?"Ocultar senha":"Mostrar senha");
    alternar.setAttribute("aria-pressed",String(ativar));
  }
  function bloquear(valor) {
    ocupado=valor;
    for(const elemento of [email,senha,alternar,entrar,recuperar,sair])if(elemento)elemento.disabled=valor;
    entrar.textContent=valor?"Aguarde…":"Entrar";
    formulario.setAttribute("aria-busy",String(valor));
  }
  function mostrarFormulario() {
    formulario.hidden=false;sessao.hidden=true;titulo.textContent="Acesse sua conta";
    document.querySelector("#email-autenticado").textContent="";
    document.querySelector("#perfil-autenticado").textContent="";
  }
  function mostrarConta(dados) {
    formulario.hidden=true;sessao.hidden=false;titulo.textContent="Você está conectado";
    document.querySelector("#email-autenticado").textContent=dados.usuario.email||"Conta autenticada";
    document.querySelector("#perfil-autenticado").textContent="Perfil: "+(dados.perfil.perfil==="administrador"?"Administrador":"Editor");
    senha.value="";mostrarSenha(false);mensagem("");
    if (new URLSearchParams(window.location?.search || "").get("continuar") === "gerencial") {
      window.location.replace(new URL("./gerencial/administrar.html", window.location.href).href);
    }
  }
  async function descartarSessao() {
    try {await cliente.auth.signOut({scope:"local"});}catch{}
  }
  function erroLogin(erro) {
    if(erro?.code==="email_not_confirmed")return "Seu e-mail ainda não está confirmado. Procure o administrador.";
    if(erro?.status===429 || erro?.code==="over_request_rate_limit")return "Muitas tentativas de acesso. Aguarde e tente novamente.";
    if(erro?.name==="AuthRetryableFetchError" || erro instanceof TypeError)return "Não foi possível conectar ao serviço de login. Tente novamente.";
    return "Não foi possível entrar. Confira o e-mail e a senha.";
  }
  alternar.addEventListener("click",()=>mostrarSenha(senha.type==="password"));
  recuperar.addEventListener("click",async()=>{
    if(ocupado||!cliente)return;
    if(!email.value.trim()||!email.checkValidity()){
      mensagem("Informe seu e-mail acima para receber o link de redefinição.");
      email.focus();
      return;
    }
    bloquear(true);mensagem("Enviando o link de redefinição…");
    try {
      const destino=new URL("./redefinir-senha.html",location.href).href;
      const {error}=await cliente.auth.resetPasswordForEmail(email.value.trim(),{redirectTo:destino});
      if(error)throw error;
      mensagem("Se este e-mail estiver cadastrado, o Supabase enviará as instruções para redefinir a senha. Verifique também o spam.");
    } catch(erro) {
      console.error("Falha ao solicitar redefinição de senha:",erro);
      mensagem("Não foi possível enviar o e-mail de redefinição. Tente novamente ou procure o administrador.");
    } finally { bloquear(false); }
  });
  formulario.addEventListener("submit",async evento=>{
    evento.preventDefault();
    if(ocupado || !cliente || !formulario.reportValidity())return;
    const atual=++revisao;
    bloquear(true);mensagem("");mostrarSenha(false);
    try {
      const {error}=await cliente.auth.signInWithPassword({email:email.value.trim(),password:senha.value});
      if(error)throw Object.assign(new Error(erroLogin(error)),{loginTratado:true});
      let dados;
      try {dados=await window.authCatalogo.consultarPerfil();}
      catch(erro){await descartarSessao();throw erro;}
      if(atual!==revisao)return;
      mostrarConta(dados);

    }catch(erro){mostrarFormulario();mensagem(erro.message||"Não foi possível concluir o login.");}
    finally {bloquear(false);if(!sessao.hidden)sair.focus();}
  });
  sair.addEventListener("click",async()=>{
    if(ocupado || !cliente)return;
    bloquear(true);mensagem("");
    try {
      const {error}=await cliente.auth.signOut({scope:"local"});
      if(error)throw error;
      ++revisao;mostrarFormulario();senha.value="";mostrarSenha(false);
    }catch{mensagem("Não foi possível encerrar a sessão. Confira a conexão e tente novamente.");}
    finally{bloquear(false);if(!formulario.hidden)email.focus();}
  });
  async function conferirSessao() {
    if(ocupado || !cliente)return;
    const atual=++revisao;
    bloquear(true);mensagem("");
    try {
      const {data,error}=await cliente.auth.getSession();
      if(error)throw error;
      if(!data?.session){mostrarFormulario();return;}
      const dados=await window.authCatalogo.consultarPerfil();
      if(atual===revisao)mostrarConta(dados);
    }catch(erro){await descartarSessao();mostrarFormulario();mensagem(erro.message||"Entre novamente para continuar.");}
    finally{bloquear(false);}
  }
  window.addEventListener("pageshow",()=>{mostrarSenha(false);conferirSessao();});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")conferirSessao();});
  async function iniciar() {
    bloquear(true);mostrarSenha(false);
    try {
      if(location.protocol==="file:")throw new Error("Abra esta página pelo Live Server do VS Code.");
      cliente=window.authCatalogo.obterCliente();
      // O callback não executa consultas assíncronas, evitando travar o cliente Auth.
      cliente.auth.onAuthStateChange(evento=>{
        if(evento==="SIGNED_OUT"){++revisao;mostrarFormulario();senha.value="";mostrarSenha(false);}
      });
      bloquear(false);
      await conferirSessao();
    }catch(erro){mensagem(erro.message||"Não foi possível iniciar o login.");bloquear(false);entrar.disabled=true;}
  }
  iniciar();
})();
