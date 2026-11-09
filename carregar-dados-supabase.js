"use strict";
const statusDados = document.querySelector('#status-dados');
let catalogoCarregado = false;
let consultaEmAndamento = false;
let ultimaVersaoDados = '';

function validarDados(dados) {
  if (!Array.isArray(dados)) throw new Error('O JSON deve conter uma lista.');
  const ids = new Set();
  const campos = ['nome','url','descricao','descricaoDetalhada','publicoAlvo','procedimentoAcesso','unidade','siglaUnidade','acesso','tipo','manualUsuario','documentosApoio','canalSuporte','tipoAutenticacao','orientacaoLogin','quemLiberaAcesso','funcionaForaRede','solucoesRelacionadas','situacao'];
  return dados.map((item, indice) => {
    const referencia = `Registro ${indice + 1}`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${referencia}: formato inválido.`);
    if (!['string','number'].includes(typeof item.id)) throw new Error(`${referencia}: ID inválido.`);
    const registro = {id: String(item.id).trim()};
    campos.forEach(campo => {
      const valor = item[campo] ?? '';
      if (typeof valor !== 'string') throw new Error(`${referencia}: ${campo} deve ser texto.`);
      registro[campo] = valor.trim();
    });
    for (const campo of ['id','nome','unidade','acesso','tipo']) if (!registro[campo]) throw new Error(`${referencia}: preencha ${campo}.`);
    if (ids.has(registro.id)) throw new Error(`${referencia}: ID repetido.`);
    ids.add(registro.id);
    const acesso = normalizar(registro.acesso);
    if (registro.acesso.length > 80) throw new Error(`${referencia}: acesso deve ter até 80 caracteres.`);
    if (acesso === 'aberto') registro.acesso = 'Aberto';
    if (acesso === 'restrito') registro.acesso = 'Restrito';
    if (registro.url && !obterUrlValida(registro.url)) throw new Error(`${referencia}: link inválido.`);
    const palavras = item.palavrasChave ?? [];
    if (!Array.isArray(palavras) || palavras.some(valor => typeof valor !== 'string')) throw new Error(`${referencia}: palavrasChave deve ser uma lista de textos.`);
    registro.palavrasChave = palavras.map(valor => valor.trim()).filter(Boolean);
    return registro;
  });
}
async function carregarDados() {
  if (consultaEmAndamento) return;
  consultaEmAndamento = true;
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 10000);
  try {
    const cliente=window.authCatalogo.obterCliente();
    const {data,error}=await cliente.rpc("spu_catalogo_publico").abortSignal(controlador.signal);
    if(error)throw new Error(error.message || "Não foi possível carregar as soluções.");
    const novos=validarDados(data);
    const versao = JSON.stringify(novos);
    if (!catalogoCarregado || versao !== ultimaVersaoDados) {
      recursos = novos; renovarFiltros(); atualizarResultados(); ultimaVersaoDados = versao;
    }
    catalogoCarregado = true; statusDados.textContent = ''; statusDados.hidden = true;
  } catch (erro) {
    console.error('Falha ao carregar catálogo:', erro);
    statusDados.textContent = catalogoCarregado ? 'Não foi possível verificar novas informações. Os recursos anteriores continuam disponíveis.' : 'O catálogo está temporariamente indisponível. Tentaremos novamente automaticamente.';
    statusDados.hidden = false;
    if (!catalogoCarregado) {
      document.querySelector('#contagem').textContent = 'Consulta indisponível';
      mensagemVazia.hidden = false; mensagemVazia.textContent = 'Aguardando o carregamento dos recursos.';
    }
  } finally { clearTimeout(temporizador); consultaEmAndamento = false; }
}
carregarDados();
setInterval(() => { if (document.visibilityState === 'visible') carregarDados(); }, 30000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') carregarDados(); });
