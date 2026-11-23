import { montarCabecalho, temToken, carregar, esc, fmtPreco, fmtData, htmlCapa, chave, normal, toast } from './app.js';

montarCabecalho('colecao');

const $ = (s) => document.querySelector(s);
const estado = { aba: 'todos', itens: [] };

function normalizar(tenho, quero) {
  const possuidos = new Set(tenho.map((t) => chave(t.artista, t.album)));
  const a = tenho.map((t, i) => ({
    tipo: 'tenho', ordem: i, artista: t.artista, album: t.album, genero: t.estilo, capa: t.foto,
    ano: t.lancamento || '', preco: t.valorPago, raw: t,
    busca: [t.artista, t.album, t.estilo, ...(t.lados || []).flatMap((l) => l.musicas)].join(' '),
  }));
  const b = quero.map((q, i) => ({
    tipo: 'quero', ordem: i, artista: q.artista, album: q.album, genero: q.genero, capa: q.capa,
    ano: q.lancamento, preco: q.preco, raw: q, jaTenho: possuidos.has(chave(q.artista, q.album)),
    busca: [q.artista, q.album, q.genero, q.nacionalidade, q.lojas].join(' '),
  }));
  return [...a, ...b];
}

const sem = normal;

function render() {
  const termo = sem($('#busca').value);
  const gen = $('#genero').value;
  const ordem = $('#ordem').value;
  let lista = estado.itens.filter((x) =>
    (estado.aba === 'todos' || x.tipo === estado.aba) &&
    (!gen || x.genero === gen) &&
    (!termo || sem(x.busca).includes(termo)));
  const txt = (v) => String(v ?? '').toLocaleLowerCase('pt-BR');
  const cmp = {
    artista: (a, b) => txt(a.artista).localeCompare(txt(b.artista), 'pt-BR') || txt(a.album).localeCompare(txt(b.album), 'pt-BR'),
    album: (a, b) => txt(a.album).localeCompare(txt(b.album), 'pt-BR'),
    ano: (a, b) => (Number(b.ano) || 0) - (Number(a.ano) || 0),
    preco: (a, b) => (typeof b.preco === 'number' ? b.preco : -1) - (typeof a.preco === 'number' ? a.preco : -1),
    recente: (a, b) => b.ordem - a.ordem,
  }[ordem];
  lista = [...lista].sort(cmp);

  const nums = lista.filter((x) => x.tipo === 'quero' && typeof x.preco === 'number');
  const total = nums.reduce((s, x) => s + x.preco, 0);
  $('#resumo').textContent = `${lista.length} disco${lista.length === 1 ? '' : 's'}` +
    (nums.length ? ` · ${fmtPreco(total)} para comprar os ${nums.length} "quero" com preço` : '');

  $('#grade').innerHTML = lista.length ? lista.map((x) => `
    <button class="card" data-i="${estado.itens.indexOf(x)}">
      <div class="capa">${htmlCapa(x.capa, x.album)}
        <span class="selo ${x.tipo}">${x.tipo === 'tenho' ? 'Tenho' : 'Quero'}</span>
        ${x.jaTenho ? '<span class="selo ja" title="Você já tem um disco com esse nome">já tenho</span>' : ''}
      </div>
      <div class="info">
        <span class="alb">${esc(x.album)}</span>
        <span class="art">${esc(x.artista)}</span>
        <span class="meta"><span>${esc(x.ano || '')}</span><span class="preco">${esc(fmtPreco(x.preco))}</span></span>
      </div>
    </button>`).join('') : '<div class="vazio">Nenhum disco encontrado.</div>';
}

function linha(rot, val) {
  return val === '' || val == null ? '' : `<dt>${rot}</dt><dd>${val}</dd>`;
}

function abrir(x) {
  const r = x.raw;
  let campos, extra = '';
  if (x.tipo === 'tenho') {
    campos = linha('Cantor/banda', esc(r.artista)) + linha('Estilo musical', esc(r.estilo)) +
      linha('Nome do álbum', esc(r.album)) + linha('Valor pago', esc(fmtPreco(r.valorPago)));
    if (r.lados?.length) {
      extra = `<h2 style="margin-top:8px">Músicas</h2><div class="lados">${r.lados.map((l) =>
        `<div><h3>${esc(l.lado)}</h3><ol>${l.musicas.map((m) => `<li>${esc(m)}</li>`).join('')}</ol></div>`).join('')}</div>`;
    }
  } else {
    campos = linha('Núm.', esc(r.num)) + linha('Artista/banda', esc(r.artista)) + linha('Gênero', esc(r.genero)) +
      linha('Álbum', esc(r.album)) + linha('Lançamento do vinil', esc(r.lancamento)) +
      linha('Nacionalidade', esc(r.nacionalidade)) + linha('Lojas', esc(r.lojas)) +
      linha('Preço', esc(fmtPreco(r.preco))) + linha('Data última atualização', esc(fmtData(r.atualizacao))) +
      linha('Link Google Images', r.linkImagens ? `<a href="${esc(r.linkImagens)}" target="_blank" rel="noopener">abrir busca</a>` : '');
  }
  const d = $('#dlg');
  d.innerHTML = `<div style="position:relative">
    <button class="fechar" aria-label="Fechar">✕</button>
    <div class="detalhe">
      <div><div class="capa">${htmlCapa(x.capa, x.album)}</div></div>
      <div>
        <span class="selo ${x.tipo}" style="position:static;display:inline-block">${x.tipo === 'tenho' ? 'Tenho' : 'Quero'}</span>
        <h2 style="margin:8px 0 0">${esc(x.album)}</h2>
        <div class="sub" style="margin:0">${esc(x.artista)}</div>
        <dl>${campos}</dl>
        ${temToken() ? `<a href="${x.tipo}.html#editar=${encodeURIComponent(r.id)}">Editar este disco</a>` : ''}
      </div>
    </div>
    <div style="padding:0 20px 20px">${extra}</div></div>`;
  d.querySelector('.fechar').onclick = () => d.close();
  d.onclick = (e) => { if (e.target === d) d.close(); };
  d.showModal();
}

document.querySelectorAll('.abas button').forEach((b) => b.addEventListener('click', () => {
  estado.aba = b.dataset.aba;
  document.querySelectorAll('.abas button').forEach((o) => o.classList.toggle('ativo', o === b));
  render();
}));
['#busca', '#genero', '#ordem'].forEach((s) => $(s).addEventListener('input', render));
$('#grade').addEventListener('click', (e) => {
  const c = e.target.closest('.card');
  if (c) abrir(estado.itens[c.dataset.i]);
});

try {
  const [tenho, quero] = await Promise.all([carregar('tenho'), carregar('quero')]);
  estado.itens = normalizar(tenho, quero);
  document.querySelector('[data-n=todos]').textContent = `(${estado.itens.length})`;
  document.querySelector('[data-n=tenho]').textContent = `(${tenho.length})`;
  document.querySelector('[data-n=quero]').textContent = `(${quero.length})`;
  const gens = [...new Set(estado.itens.map((x) => x.genero).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  $('#genero').insertAdjacentHTML('beforeend', gens.map((g) => `<option>${esc(g)}</option>`).join(''));
  render();
} catch (e) {
  $('#grade').innerHTML = `<div class="vazio">${esc(e.message)}</div>`;
  toast(e.message, 'erro');
}
