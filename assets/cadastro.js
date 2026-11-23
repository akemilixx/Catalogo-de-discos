// Lógica comum das páginas de cadastro (Quero e Tenho).
import {
  montarCabecalho, abrirConfig, carregar, salvar, temToken, esc, htmlCapa, urlImagem,
  reduzirImagem, enviarImagem, linkGoogleImagens, novoId, slug, normal, toast,
} from './app.js';

/**
 * opcoes:
 *  nome: 'quero' | 'tenho'
 *  campoFoto: nome da propriedade da imagem ('capa' | 'foto')
 *  preencher(form, item|null)  → coloca valores no formulário (null = novo)
 *  ler(form, itemAntigo|null) → devolve o objeto a salvar (sem id/imagem)
 *  resumo(item) → { t, s } texto da lista
 *  botoesExtras(item) → html de botões extras na lista
 *  aoSalvar(item, ehNovo) → opcional, roda depois de gravar
 *  aoClicarExtra(acao, item) → opcional
 *  preCarregar(hash) → opcional, devolve dados para pré-preencher um disco novo
 */
export async function iniciarCadastro(op) {
  montarCabecalho(op.nome);
  const $ = (s) => document.querySelector(s);
  const form = $('#form');
  const est = { lista: [], editando: null, fotoNova: null, fotoAtual: '' };
  const hashInicial = location.hash;

  if (!temToken()) {
    $('main').insertAdjacentHTML('afterbegin',
      `<div class="aviso">Para salvar no GitHub, conecte seu token primeiro. <button type="button" id="ligar">Conectar</button></div>`);
    $('#ligar').onclick = abrirConfig;
  }

  /* ----- campo de imagem ----- */
  const prev = $('#foto-prev');
  const mostrarFoto = (src) => { prev.innerHTML = src ? `<img src="${esc(src)}" alt="">` : '<div class="capa-vazia"><span></span></div>'; };
  $('#foto-arquivo').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { est.fotoNova = await reduzirImagem(f); mostrarFoto(est.fotoNova); $('#foto-url').value = ''; }
    catch (err) { toast(err.message, 'erro'); }
  });
  $('#foto-url').addEventListener('change', (e) => { est.fotoNova = null; mostrarFoto(e.target.value.trim() || urlImagem(est.fotoAtual)); });
  $('#foto-remover').addEventListener('click', () => { est.fotoNova = null; est.fotoAtual = ''; $('#foto-url').value = ''; $('#foto-arquivo').value = ''; mostrarFoto(''); });
  $('#foto-google').addEventListener('click', () => {
    window.open(linkGoogleImagens(form.artista.value, form.album.value), '_blank', 'noopener');
  });
  // Colar imagem (Ctrl+V) em qualquer lugar do formulário
  form.addEventListener('paste', async (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (!f) return;
    e.preventDefault();
    est.fotoNova = await reduzirImagem(f); mostrarFoto(est.fotoNova); $('#foto-url').value = '';
  });

  /* ----- formulário ----- */
  function limpar() {
    est.editando = null; est.fotoNova = null; est.fotoAtual = '';
    form.reset(); op.preencher(form, null, est.lista); mostrarFoto('');
    $('#titulo-form').textContent = 'Novo disco';
    $('#cancelar').hidden = true;
    if (op.aoLimpar) op.aoLimpar();
    if (location.hash) history.replaceState(null, '', location.pathname);
    renderLista();
  }

  function editar(item) {
    est.editando = item; est.fotoNova = null; est.fotoAtual = item[op.campoFoto] || '';
    form.reset(); op.preencher(form, item, est.lista);
    $('#foto-url').value = /^https?:/.test(est.fotoAtual) ? est.fotoAtual : '';
    mostrarFoto(urlImagem(est.fotoAtual));
    $('#titulo-form').textContent = 'Editando disco';
    $('#cancelar').hidden = false;
    renderLista();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  est.editar = editar;

  $('#cancelar').onclick = limpar;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    const antigo = est.editando;
    const dados = op.ler(form, antigo);
    if (!dados.artista || !dados.album) return toast('Preencha artista e álbum.', 'erro');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      const id = antigo?.id || novoId(op.nome[0], dados.artista, dados.album);
      let foto = est.fotoAtual;
      const url = $('#foto-url').value.trim();
      if (est.fotoNova) foto = await enviarImagem(est.fotoNova, `${op.nome[0]}-${slug(`${dados.artista} ${dados.album}`)}`);
      else if (url) foto = url;
      const item = { id, ...dados, [op.campoFoto]: foto };
      const nova = await salvar(op.nome, (lista) => {
        const i = lista.findIndex((x) => x.id === id);
        if (i >= 0) lista[i] = item; else lista.push(item);
        return lista;
      }, `${antigo ? 'Atualiza' : 'Adiciona'} ${op.nome}: ${dados.artista} – ${dados.album}`);
      est.lista = nova;
      if (op.aoSalvar) await op.aoSalvar(item, !antigo);
      toast(`Salvo no GitHub: ${dados.album}. O site publicado atualiza em cerca de 1 minuto.`);
      limpar();
    } catch (err) {
      toast(`Erro ao salvar: ${err.message}`, 'erro');
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  });

  /* ----- lista ----- */
  const sem = normal;
  function renderLista() {
    const termo = sem($('#filtro').value);
    const itens = est.lista.map((x, i) => ({ x, i }))
      .filter(({ x }) => !termo || sem(`${x.artista} ${x.album}`).includes(termo))
      .reverse();
    $('#total').textContent = `(${est.lista.length})`;
    $('#lista').innerHTML = itens.length ? itens.map(({ x }) => {
      const r = op.resumo(x);
      return `<div class="item ${est.editando?.id === x.id ? 'editando' : ''}" data-id="${esc(x.id)}">
        <div class="mini">${htmlCapa(x[op.campoFoto], x.album)}</div>
        <div><div class="t">${esc(x.album)}</div><div class="s">${esc(x.artista)}${r.s ? ' · ' + esc(r.s) : ''}</div></div>
        <div class="bts">${op.botoesExtras ? op.botoesExtras(x) : ''}
          <button type="button" data-acao="editar">Editar</button>
          <button type="button" data-acao="excluir" class="perigo">Excluir</button></div>
      </div>`;
    }).join('') : '<div class="vazio">Nada por aqui.</div>';
  }
  $('#filtro').addEventListener('input', renderLista);
  $('#lista').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-acao]');
    if (!b) return;
    const item = est.lista.find((x) => x.id === b.closest('.item').dataset.id);
    if (b.dataset.acao === 'editar') return editar(item);
    if (b.dataset.acao === 'excluir') {
      if (!confirm(`Excluir "${item.album}" de ${item.artista}?`)) return;
      b.disabled = true;
      try {
        est.lista = await salvar(op.nome, (l) => l.filter((x) => x.id !== item.id), `Remove ${op.nome}: ${item.artista} – ${item.album}`);
        if (est.editando?.id === item.id) limpar(); else renderLista();
        toast('Disco excluído.');
      } catch (err) { toast(`Erro ao excluir: ${err.message}`, 'erro'); b.disabled = false; }
      return;
    }
    if (op.aoClicarExtra) op.aoClicarExtra(b.dataset.acao, item);
  });

  /* ----- carregar ----- */
  try {
    est.lista = await carregar(op.nome);
  } catch (err) {
    toast(err.message, 'erro');
  }
  const m = hashInicial.match(/editar=([^&]+)/);
  const alvo = m && est.lista.find((x) => x.id === decodeURIComponent(m[1]));
  if (alvo) { editar(alvo); return est; }
  limpar();
  // Pré-preenchimento vindo de outra página (ex.: "Comprei!" na lista Quero)
  const pre = op.preCarregar ? await op.preCarregar(hashInicial) : null;
  if (pre) {
    op.preencher(form, pre, est.lista);
    est.fotoAtual = pre[op.campoFoto] || '';
    mostrarFoto(urlImagem(est.fotoAtual));
    $('#cancelar').hidden = false;
  }
  return est;
}

/** Preenche um <datalist> com valores existentes (para sugerir gêneros, países etc.). */
export function sugestoes(id, valores) {
  const d = document.getElementById(id);
  d.innerHTML = [...new Set(valores.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'))
    .map((v) => `<option value="${esc(v)}">`).join('');
}
