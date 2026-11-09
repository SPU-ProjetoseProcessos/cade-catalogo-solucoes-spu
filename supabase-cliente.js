"use strict";
(() => {
  let cliente;
  function chavePermitida(chave) {
    if(typeof chave!=="string")return false;
    if(chave.startsWith("sb_publishable_") && chave.length>25)return true;
    // Compatibilidade somente com a chave JWT legada anon; nunca com service_role.
    try {
      const partes=chave.split(".");
      if(partes.length!==3)return false;
      const base=partes[1].replace(/-/g,"+").replace(/_/g,"/");
      const payload=JSON.parse(atob(base.padEnd(Math.ceil(base.length/4)*4,"=")));
      return payload.role==="anon";
    } catch {return false;}
  }
  function obterCliente() {
    if(cliente)return cliente;
    const config=window.CONFIG_SUPABASE;
    let url;
    try {url=new URL(config?.url);}catch{throw new Error("Configure a URL do projeto em supabase-config.js.");}
    if(url.protocol!=="https:" || url.username || url.password || url.pathname!=="/" || url.search || url.hash || /SEU_PROJETO|COLE_A_/i.test(url.hostname))throw new Error("Configure a URL HTTPS do projeto Supabase, não o endereço PostgreSQL.");
    if(!chavePermitida(config?.chavePublica))throw new Error("Configure somente a chave Publishable ou a chave anon em supabase-config.js.");
    if(!window.supabase?.createClient)throw new Error("Não foi possível carregar o serviço de login. Confira a conexão com a internet.");
    cliente=window.supabase.createClient(url.origin,config.chavePublica,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:"spu-catalogo-auth-v1"}
    });
    return cliente;
  }
  async function consultarPerfil() {
    const supabase=obterCliente();
    // Confere o usuário no servidor; não confia no usuário salvo no navegador.
    const {data:autenticacao,error:erroUsuario}=await supabase.auth.getUser();
    if(erroUsuario || !autenticacao?.user)throw new Error("Sua sessão expirou. Entre novamente.");
    const usuario=autenticacao.user;
    const {data:perfil,error}=await supabase.from("perfis_catalogo")
      .select("id,nome,perfil,ativo").eq("id",usuario.id).maybeSingle();
    if(error)throw new Error("Não foi possível consultar as permissões da conta. Tente novamente ou procure o administrador.");
    if(!perfil || perfil.id!==usuario.id || !perfil.ativo || !["administrador","editor"].includes(perfil.perfil)) {
      throw new Error("Sua conta não possui acesso ativo à área gerencial. Procure o administrador.");
    }
    return {usuario,perfil};
  }
  window.authCatalogo=Object.freeze({obterCliente,consultarPerfil});
})();
