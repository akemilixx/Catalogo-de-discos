// Janela "Exportar XLSX" da página Coleção: escolhe filtros e baixa a planilha.
import { esc, normal, toast } from './app.js';
import { baixarXlsx } from './xlsx.js';

const ORDENS = [['artista', 'Artista'], ['album', 'Álbum'], ['ano', 'Lançamento'], ['preco', 'Preço'], ['recente', 'Cadastro recente']];
const num = (v) => (String(v).trim() === '' ? null : Number(String(v).replace(',', '.')));
const urlCapa = (c) => (!c || /^data:/.test(c) ? '' : new URL(c, location.href).href);

function lerFiltros(f) {
  return {
    tenho: f.l_tenho.checked,
    quero: f.l_quero.checked,
    busca: normal(f.busca.value.trim()),
    generos: new Set([...f.querySelectorAll('[name=gen]:checked')].map((c) => c.value)),
    todosGeneros: !f.querySelector('[name=gen]:not(:checked)'),
    anoDe: num(f.anoDe.value), anoAte: num(f.anoAte.value),
    precoDe: num(f.precoDe.value), precoAte: num(f.precoAte.value),
    situacao: f.situacao.value,
    ordem: f.ordem.value,
  };
}

function filtrar(itens, o, comparar) {
  const dentro = (v, de, ate) => {
    if (de == null && ate == null) return true;
    const n = typeof v === 'number' ? v : Number(v);
    if (v === '' || v == null || !Number.isFinite(n)) return false;
    return (de == null || n >= de) && (ate == null || n <= ate);
  };
  return itens.filter((x) =>
    o[x.tipo] &&
    (o.todosGeneros || o.generos.has(x.genero || '')) &&
    (!o.busca || normal(x.busca).includes(o.busca)) &&
    dentro(x.ano, o.anoDe, o.anoAte) &&
    dentro(typeof x.preco === 'number' ? x.preco : '', o.precoDe, o.precoAte) &&
    (x.tipo !== 'quero' || o.situacao === '' || (o.situacao === 'ja') === !!x.jaTenho),
  ).sort(comparar[o.ordem]);
}

function textoLados(lados) {
  return (lados || []).filter((l) => l.musicas?.length || l.lado)
    .map((l) => `${l.lado}:\n${l.musicas.map((m, i) => `${i + 1}. ${m}`).join('\n')}`).join('\n\n');
}

function montarAbas(lista, op) {
  const abas = [];
  const tenho = lista.filter((x) => x.tipo === 'tenho').map((x) => x.raw);
  const quero = lista.filter((x) => x.tipo === 'quero');
  const capa = op.capa ? [{ titulo: 'Capa (link)', largura: 50 }] : [];

  if (op.umaAba) {
    abas.push({
      nome: 'Coleção',
      colunas: [{ titulo: 'Lista', largura: 8 }, { titulo: 'Artista/banda', largura: 28 }, { titulo: 'Álbum', largura: 40 },
        { titulo: 'Gênero', largura: 20 }, { titulo: 'Lançamento', largura: 12 }, { titulo: 'Preço / valor pago', largura: 18, tipo: 'moeda' },
        { titulo: 'Nacionalidade', largura: 16 }, { titulo: 'Lojas', largura: 20 }, { titulo: 'Data última atualização', largura: 14, tipo: 'data' },
        ...(op.musicas ? [{ titulo: 'Lados e músicas', largura: 50, tipo: 'longo' }] : []), ...capa],
      linhas: lista.map((x) => {
        const r = x.raw;
        return [x.tipo === 'tenho' ? 'Tenho' : 'Quero', x.artista, x.album, x.genero, x.ano, x.preco,
          r.nacionalidade, r.lojas, r.atualizacao,
          ...(op.musicas ? [x.tipo === 'tenho' ? textoLados(r.lados) : ''] : []), ...(op.capa ? [urlCapa(x.capa)] : [])];
      }),
    });
  } else {
    if (op.tenho) {
      abas.push({
        nome: 'Tenho',
        colunas: [{ titulo: 'Cantor/banda', largura: 28 }, { titulo: 'Estilo musical', largura: 20 }, { titulo: 'Nome do álbum', largura: 40 },
          { titulo: 'Valor pago', largura: 18, tipo: 'moeda' }, { titulo: 'Nº de músicas', largura: 12, tipo: 'numero' },
          ...(op.musicas ? [{ titulo: 'Lados e músicas', largura: 50, tipo: 'longo' }] : []), ...capa],
        linhas: tenho.map((t) => [t.artista, t.estilo, t.album, t.valorPago,
          (t.lados || []).reduce((s, l) => s + l.musicas.length, 0) || '',
          ...(op.musicas ? [textoLados(t.lados)] : []), ...(op.capa ? [urlCapa(t.foto)] : [])]),
      });
    }
    if (op.quero) {
      abas.push({
        nome: 'Quero',
        colunas: [{ titulo: 'Núm.', largura: 7, tipo: 'numero' }, { titulo: 'Artista/banda', largura: 28 }, { titulo: 'Gênero', largura: 20 },
          { titulo: 'Álbum', largura: 40 }, { titulo: 'Lançamento do vinil', largura: 12, tipo: 'numero' }, { titulo: 'Nacionalidade', largura: 16 },
          { titulo: 'Lojas', largura: 20 }, { titulo: 'Preço', largura: 16, tipo: 'moeda' }, { titulo: 'Data última atualização', largura: 14, tipo: 'data' },
          { titulo: 'Já tenho?', largura: 10 }, { titulo: 'Link Google Images', largura: 40 }, ...capa],
        linhas: quero.map(({ raw: q, jaTenho }) => [q.num, q.artista, q.genero, q.album, q.lancamento, q.nacionalidade, q.lojas,
          q.preco, q.atualizacao, jaTenho ? 'Sim' : '', q.linkImagens, ...(op.capa ? [urlCapa(q.capa)] : [])]),
      });
    }
  }
  if (op.abaMusicas && tenho.length) {
    abas.push({
      nome: 'Músicas',
      colunas: [{ titulo: 'Cantor/banda', largura: 28 }, { titulo: 'Nome do álbum', largura: 40 }, { titulo: 'Lado', largura: 10 },
        { titulo: 'Faixa', largura: 7, tipo: 'numero' }, { titulo: 'Música', largura: 40 }],
      linhas: tenho.flatMap((t) => (t.lados || []).flatMap((l) => l.musicas.map((m, i) => [t.artista, t.album, l.lado, i + 1, m]))),
    });
  }
  return abas;
}

export function abrirExportar({ itens, aba, busca, genero, ordem, comparar }) {
  const generos = [...new Set(itens.map((x) => x.genero || ''))].sort((a, b) => (!a) - (!b) || a.localeCompare(b, 'pt-BR'));
  const qtd = (t) => itens.filter((x) => x.tipo === t).length;

  let d = document.getElementById('dlg-exportar');
  if (!d) { d = document.createElement('dialog'); d.id = 'dlg-exportar'; document.body.append(d); }
  d.innerHTML = `
    <form class="form-config exportar" method="dialog">
      <h2>Exportar para Excel (.xlsx)</h2>
      <fieldset><legend>Listas</legend>
        <div class="opcoes">
          <label class="op"><input type="checkbox" name="l_tenho"> Tenho (${qtd('tenho')})</label>
          <label class="op"><input type="checkbox" name="l_quero"> Quero (${qtd('quero')})</label>
        </div>
      </fieldset>
      <label>Buscar <small>(artista, álbum, música, loja…)</small><input type="search" name="busca"></label>
      <fieldset><legend>Gêneros <button type="button" class="mini-bt" data-gen="1">todos</button><button type="button" class="mini-bt" data-gen="0">nenhum</button></legend>
        <div class="opcoes generos">${generos.map((g) =>
          `<label class="op"><input type="checkbox" name="gen" value="${esc(g)}"> ${g ? esc(g) : '<i>sem gênero</i>'}</label>`).join('')}</div>
      </fieldset>
      <div class="linha">
        <label>Lançamento de<input name="anoDe" type="number" inputmode="numeric" placeholder="ex.: 1970"></label>
        <label>até<input name="anoAte" type="number" inputmode="numeric" placeholder="ex.: 1999"></label>
      </div>
      <div class="linha">
        <label>Preço / valor pago de (R$)<input name="precoDe" inputmode="decimal" placeholder="0"></label>
        <label>até (R$)<input name="precoAte" inputmode="decimal" placeholder="500"></label>
      </div>
      <p class="ajuda">Com ano ou preço preenchido, saem só os discos que têm esse dado (os da lista Tenho não têm ano de lançamento).</p>
      <div class="linha">
        <label>Quero: situação<select name="situacao">
          <option value="">Todos</option><option value="nao">Só os que ainda não tenho</option><option value="ja">Só os marcados "já tenho"</option>
        </select></label>
        <label>Ordenar por<select name="ordem">${ORDENS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
      </div>
      <fieldset><legend>Na planilha</legend>
        <div class="opcoes col">
          <label class="op"><input type="checkbox" name="musicas" checked> Coluna com lados e músicas (Tenho)</label>
          <label class="op"><input type="checkbox" name="abaMusicas"> Aba "Músicas" com uma linha por faixa</label>
          <label class="op"><input type="checkbox" name="capa"> Link da imagem da capa</label>
          <label class="op"><input type="checkbox" name="umaAba"> Tenho e Quero juntos numa aba só</label>
        </div>
      </fieldset>
      <p class="resultado" aria-live="polite"></p>
      <div class="acoes">
        <button type="button" class="sec" data-acao="tela" style="margin-right:auto" title="Mesma aba, busca e gênero que estão na tela">Usar filtros da tela</button>
        <button type="button" class="sec" data-acao="limpar">Limpar</button>
        <button type="button" class="sec" data-acao="fechar">Cancelar</button>
        <button type="submit" class="pri">Baixar .xlsx</button>
      </div>
    </form>`;
  const f = d.querySelector('form');
  const out = f.querySelector('.resultado');
  const marcarGeneros = (sim) => f.querySelectorAll('[name=gen]').forEach((c) => { c.checked = sim; });

  function preencher(daTela) {
    f.l_tenho.checked = !daTela || aba !== 'quero';
    f.l_quero.checked = !daTela || aba !== 'tenho';
    f.busca.value = daTela ? busca : '';
    f.querySelectorAll('[name=gen]').forEach((c) => { c.checked = !daTela || !genero || c.value === genero; });
    for (const k of ['anoDe', 'anoAte', 'precoDe', 'precoAte']) f[k].value = '';
    f.situacao.value = '';
    f.ordem.value = daTela ? ordem : 'artista';
    atualizar();
  }

  let lista = [];
  function atualizar() {
    const o = lerFiltros(f);
    lista = filtrar(itens, o, comparar);
    const t = lista.filter((x) => x.tipo === 'tenho').length;
    const q = lista.length - t;
    out.textContent = !o.tenho && !o.quero ? 'Marque pelo menos uma lista.'
      : `Vai exportar ${lista.length} disco${lista.length === 1 ? '' : 's'}` +
        (o.tenho && o.quero ? ` (${t} tenho, ${q} quero).` : '.');
    f.querySelector('.pri').disabled = !lista.length;
  }

  f.addEventListener('input', atualizar);
  f.querySelectorAll('[data-gen]').forEach((b) => { b.onclick = () => { marcarGeneros(b.dataset.gen === '1'); atualizar(); }; });
  f.querySelector('[data-acao=tela]').onclick = () => preencher(true);
  f.querySelector('[data-acao=limpar]').onclick = () => preencher(false);
  f.querySelector('[data-acao=fechar]').onclick = () => d.close();
  d.onclick = (e) => { if (e.target === d) d.close(); };
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    atualizar();
    if (!lista.length) return;
    const o = lerFiltros(f);
    const op = {
      tenho: o.tenho && lista.some((x) => x.tipo === 'tenho'),
      quero: o.quero && lista.some((x) => x.tipo === 'quero'),
      musicas: f.musicas.checked, abaMusicas: f.abaMusicas.checked, capa: f.capa.checked, umaAba: f.umaAba.checked,
    };
    try {
      const nome = `vinis-${op.tenho && !op.quero ? 'tenho-' : ''}${op.quero && !op.tenho ? 'quero-' : ''}${new Date().toLocaleDateString('sv-SE')}.xlsx`;
      baixarXlsx(nome, montarAbas(lista, op));
      toast(`Planilha com ${lista.length} disco${lista.length === 1 ? '' : 's'} baixada.`);
      d.close();
    } catch (err) {
      console.error(err);
      toast(`Não foi possível gerar a planilha: ${err.message}`, 'erro');
    }
  });

  preencher(true);
  d.showModal();
}
