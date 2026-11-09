"use strict";
(() => {
  const permitidos=new Set(["/admin/api/catalogo","/admin/api/tipos","/admin/api/acessos","/admin/api/respostas","/admin/api/suspensao","/admin/api/sugestoes"]);
  function naoAutenticado(){const erro=new Error("Entre novamente para acessar a área gerencial.");erro.code="NAO_AUTENTICADO";return erro;}
  async function consultar(opcoes={},caminho="/admin/api/catalogo") {
    const cliente=window.authCatalogo.obterCliente();
    if(caminho==="/admin/api/sessao"){
      const {data,error}=await cliente.auth.getSession();
      if(error || !data?.session)throw naoAutenticado();
      const {usuario,perfil}=await window.authCatalogo.consultarPerfil();
      return {id:usuario.id,usuario:usuario.email,perfil:perfil.perfil,csrf:""};
    }
    if(!permitidos.has(caminho))throw new Error("Operação indisponível nesta etapa da migração.");
    let corpo={};
    if(opcoes.body){try{corpo=JSON.parse(opcoes.body);}catch{throw new Error("Dados inválidos para salvar.");}}
    const {data,error}=await cliente.rpc("spu_catalogo_api",{p_rota:caminho,p_metodo:opcoes.method||"GET",p_corpo:corpo});
    if(error){
      if (["PGRST301","PGRST302","PGRST303"].includes(error.code)) {
        const link=document.querySelector("#retornar-login");if(link)link.hidden=false;
        throw naoAutenticado();
      }
      const mensagem=error.code==="PGRST202"?"Execute o SQL de habilitação da área gerencial no Supabase e tente novamente.":error.code==="42501"?(error.message||"Sua conta não tem permissão para esta operação."):error.message||"Não foi possível concluir a operação. Confira a conexão.";
      throw new Error(mensagem);
    }
    if(!data || typeof data!=="object")throw new Error("O banco retornou uma resposta inesperada.");
    return data;
  }
  async function sair(){const {error}=await window.authCatalogo.obterCliente().auth.signOut({scope:"local"});if(error)throw new Error("Não foi possível encerrar a sessão. Tente novamente.");}
  window.apiCatalogo=Object.freeze({consultar,sair});
})();
