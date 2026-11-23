import { iniciarCadastro, sugestoes } from './cadastro.js';
import { fmtData, lerPreco, linkGoogleImagens } from './app.js';

const hoje = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso local
const precoParaCampo = (v) => (typeof v === 'number'
  ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (v ?? ''));

const est = await iniciarCadastro({
  nome: 'quero',
  campoFoto: 'capa',
  preencher(f, q, lista) {
    if (!q) {
      f.num.value = Math.max(0, ...lista.map((x) => Number(x.num) || 0)) + 1;
      f.atualizacao.value = hoje();
      return;
    }
    for (const k of ['artista', 'genero', 'album', 'lancamento', 'nacionalidade', 'lojas', 'atualizacao', 'num', 'linkImagens']) {
      f[k].value = q[k] ?? '';
    }
    f.preco.value = precoParaCampo(q.preco);
  },
  ler(f) {
    const artista = f.artista.value.trim();
    const album = f.album.value.trim();
    return {
      num: Number(f.num.value) || '',
      artista,
      genero: f.genero.value.trim(),
      album,
      lancamento: Number(f.lancamento.value) || '',
      nacionalidade: f.nacionalidade.value.trim(),
      lojas: f.lojas.value.trim(),
      preco: lerPreco(f.preco.value),
      atualizacao: f.atualizacao.value || hoje(),
      linkImagens: f.linkImagens.value.trim() || linkGoogleImagens(artista, album),
    };
  },
  resumo: (q) => ({
    s: [q.lancamento, typeof q.preco === 'number'
      ? q.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : q.preco, fmtData(q.atualizacao)]
      .filter(Boolean).join(' · '),
  }),
  botoesExtras: () => '<button type="button" data-acao="comprei" title="Mover para a lista Tenho">Comprei!</button>',
  aoClicarExtra(acao, q) {
    if (acao === 'comprei') location.href = `tenho.html#de-quero=${encodeURIComponent(q.id)}`;
  },
});

const lista = est.lista;
sugestoes('dl-artistas', lista.map((x) => x.artista));
sugestoes('dl-generos', lista.map((x) => x.genero));
sugestoes('dl-paises', lista.map((x) => x.nacionalidade));
sugestoes('dl-lojas', lista.map((x) => x.lojas));
