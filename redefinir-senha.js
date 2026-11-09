"use strict";
(() => {
  const form=document.querySelector("#formulario-recuperacao");
  const senha=document.querySelector("#nova-senha");
  const confirmar=document.querySelector("#confirmar-senha");
  const salvar=document.querySelector("#salvar-senha");
  const status=document.querySelector("#status-recuperacao");
  let cliente=null,recuperacaoValida=false;

  function mensagem(texto,erro=false){
    status.textContent=texto;
    status.hidden=!texto;
    status.classList.toggle("sucesso-login",!erro&&!!texto);
  }
  function mostrarFormulario(ativo){
    form.hidden=!ativo;
    salvar.disabled=!ativo;
  }
  async function iniciar(){
    mostrarFormulario(false);
    const parametros=new URLSearchParams(location.search);
    const fragmento=new URLSearchParams(location.hash.replace(/^#/,""));
    const possuiCodigo=parametros.has("code");
    const possuiTokenRecuperacao=fragmento.get("type")==="recovery"&&fragmento.has("access_token");
    if(!possuiCodigo&&!possuiTokenRecuperacao){
      mensagem("Este link de redefinição não é válido ou já foi usado. Solicite um novo link pela tela de login.",true);
      return;
    }
    try{
      const config=window.CONFIG_SUPABASE;
      const url=new URL(config?.url);
      if(url.protocol!=="https:"||!window.supabase?.createClient||typeof config?.chavePublica!=="string")throw new Error("Configuração do Supabase incompleta.");
      cliente=window.supabase.createClient(url.origin,config.chavePublica,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"spu-catalogo-recuperacao-v1"}
      });
      const {data,error}=await cliente.auth.getSession();
      if(error||!data?.session)throw new Error("O link expirou ou já foi usado. Solicite outro link de redefinição.");
      recuperacaoValida=true;
      mostrarFormulario(true);
      mensagem("Crie uma senha nova para sua conta.");
      senha.focus();
    }catch(erro){
      console.error("Falha ao validar link de recuperação:",erro);
      mensagem(erro.message||"Não foi possível validar o link. Solicite outro pela tela de login.",true);
    }
  }
  form.addEventListener("submit",async evento=>{
    evento.preventDefault();
    if(!cliente||!recuperacaoValida||!form.reportValidity())return;
    if(senha.value!==confirmar.value){mensagem("As senhas não coincidem.",true);confirmar.focus();return;}
    salvar.disabled=true;
    mensagem("Salvando nova senha…");
    try{
      const {error}=await cliente.auth.updateUser({password:senha.value});
      if(error)throw error;
      await cliente.auth.signOut({scope:"local"});
      recuperacaoValida=false;
      form.reset();
      mostrarFormulario(false);
      mensagem("Senha atualizada. Agora entre pelo catálogo com sua nova senha.");
    }catch(erro){
      console.error("Falha ao atualizar senha:",erro);
      mensagem(erro.message||"Não foi possível atualizar a senha. Solicite um novo link.",true);
    }finally{salvar.disabled=false;}
  });
  iniciar();
})();
