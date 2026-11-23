import { iniciarCadastro, sugestoes } from './cadastro.js';
import { carregar, salvar, lerPreco, esc, toast } from './app.js';

const caixa = document.getElementById('lados');
const LETRAS = 'ABCDEFGHIJKL';

function blocoLado(nome = '', musicas = []) {
  const d = document.createElement('div');
  d.className = 'lado-bloco';
  d.innerHTML = `<div class="topo-lado">
      <input class="nome-lado" value="${esc(nome)}" aria-label="Nome do lado">
      <button type="button" class="perigo" title="Remover lado">✕</button>
    </div>
    <textarea class="musicas" placeholder="Uma música por linha">${esc(musicas.join('\n'))}</textarea>`;
  d.querySelector('button').onclick = () => d.remove();
  caixa.append(d);
}
document.getElementById('add-lado').onclick = () => blocoLado(`Lado ${LETRAS[caixa.children.length] || caixa.children.length + 1}`);

const valorParaCampo = (v) => (typeof v === 'number'
  ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (v ?? ''));

let deQuero = null; // disco da lista Quero que está sendo marcado como comprado

const est = await iniciarCadastro({
  nome: 'tenho',
  campoFoto: 'foto',
  preencher(f, t) {
    caixa.innerHTML = '';
    if (!t) { blocoLado('Lado A'); blocoLado('Lado B'); return; }
    f.artista.value = t.artista || '';
    f.estilo.value = t.estilo || '';
    f.album.value = t.album || '';
    f.valorPago.value = valorParaCampo(t.valorPago);
    const lados = t.lados?.length ? t.lados : [{ lado: 'Lado A', musicas: [] }, { lado: 'Lado B', musicas: [] }];
    lados.forEach((l) => blocoLado(l.lado, l.musicas));
  },
  ler(f) {
    const lados = [...caixa.querySelectorAll('.lado-bloco')].map((b) => ({
      lado: b.querySelector('.nome-lado').value.trim(),
      musicas: b.querySelector('.musicas').value.split('\n').map((m) => m.trim()).filter(Boolean),
    })).filter((l) => l.lado || l.musicas.length);
    return {
      artista: f.artista.value.trim(),
      estilo: f.estilo.value.trim(),
      album: f.album.value.trim(),
      lados,
      valorPago: lerPreco(f.valorPago.value),
    };
  },
  resumo: (t) => {
    const n = (t.lados || []).reduce((s, l) => s + l.musicas.length, 0);
    return { s: [t.estilo, n ? `${n} músicas` : ''].filter(Boolean).join(' · ') };
  },
  async preCarregar(hash) {
    const m = hash.match(/de-quero=([^&]+)/);
    if (!m) return null;
    const q = (await carregar('quero')).find((x) => x.id === decodeURIComponent(m[1]));
    if (!q) return null;
    deQuero = q;
    toast(`Cadastrando "${q.album}" como comprado. Ao salvar, ele sai da lista Quero.`);
    return { artista: q.artista, estilo: q.genero, album: q.album, foto: q.capa, valorPago: q.preco, lados: [] };
  },
  async aoSalvar() {
    if (!deQuero) return;
    const q = deQuero;
    await salvar('quero', (l) => l.filter((x) => x.id !== q.id), `Comprado: ${q.artista} – ${q.album} (sai da lista Quero)`);
  },
  aoLimpar() { deQuero = null; },
});

sugestoes('dl-artistas', est.lista.map((x) => x.artista));
sugestoes('dl-generos', est.lista.map((x) => x.estilo));
