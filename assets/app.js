// Funções compartilhadas: configuração, leitura/gravação no GitHub, imagens e UI.

const CFG_KEY = 'vinis.config';
const PADRAO = { owner: 'akemilixx', repo: 'Catalogo-de-discos', branch: '', token: '' };

export const ARQUIVOS = { quero: 'data/quero.json', tenho: 'data/tenho.json' };

function detectarRepo() {
  // Em https://<usuario>.github.io/<repo>/ descobre dono e repositório automaticamente.
  const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
  if (!m) return {};
  const repo = location.pathname.split('/').filter(Boolean)[0];
  return repo && !repo.endsWith('.html') ? { owner: m[1], repo } : { owner: m[1], repo: `${m[1]}.github.io` };
}

export function getConfig() {
  let salvo = {};
  try { salvo = JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch { /* sem storage */ }
  return { ...PADRAO, ...detectarRepo(), ...salvo };
}

function setConfig(c) {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch { /* sem storage */ }
}

export const temToken = () => !!getConfig().token;

/* ---------- base64 UTF-8 ---------- */
function bytesParaB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const textoParaB64 = (t) => bytesParaB64(new TextEncoder().encode(t));
const b64ParaTexto = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

/* ---------- API do GitHub ---------- */
async function api(caminho, opcoes = {}) {
  const c = getConfig();
  const url = `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${caminho}` +
    (opcoes.method ? '' : (c.branch ? `?ref=${encodeURIComponent(c.branch)}` : ''));
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (c.token) headers.Authorization = `Bearer ${c.token}`;
  if (opcoes.body) headers['Content-Type'] = 'application/json';
  const r = await fetch(url, { ...opcoes, headers, cache: 'no-store' });
  if (!r.ok) {
    let msg = `${r.status}`;
    try { msg += ' – ' + (await r.json()).message; } catch { /* ignora */ }
    const e = new Error(msg); e.status = r.status; throw e;
  }
  return r.json();
}

async function lerArquivoApi(caminho) {
  const j = await api(caminho);
  return { dados: JSON.parse(b64ParaTexto(j.content)), sha: j.sha };
}

async function gravarArquivo(caminho, conteudoB64, mensagem, sha) {
  const c = getConfig();
  const body = { message: mensagem, content: conteudoB64 };
  if (sha) body.sha = sha;
  if (c.branch) body.branch = c.branch;
  return api(caminho, { method: 'PUT', body: JSON.stringify(body) });
}

/** Carrega uma lista ('quero' ou 'tenho'). Com token lê direto do GitHub (sempre atualizado). */
export async function carregar(nome) {
  if (temToken()) {
    try { return (await lerArquivoApi(ARQUIVOS[nome])).dados; }
    catch (e) { console.warn('Falha ao ler via API, usando arquivo do site', e); }
  }
  const r = await fetch(`${ARQUIVOS[nome]}?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Não foi possível carregar ${ARQUIVOS[nome]}`);
  return r.json();
}

/**
 * Lê a versão mais recente da lista no GitHub, aplica `alterar(lista)` e grava (um commit).
 * Tenta de novo se alguém salvou ao mesmo tempo.
 */
export async function salvar(nome, alterar, mensagem) {
  if (!temToken()) throw new Error('Configure o token do GitHub (botão ⚙ GitHub) para salvar.');
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { dados, sha } = await lerArquivoApi(ARQUIVOS[nome]);
    const nova = alterar(dados) || dados;
    try {
      await gravarArquivo(ARQUIVOS[nome], textoParaB64(JSON.stringify(nova, null, 1) + '\n'), mensagem, sha);
      return nova;
    } catch (e) {
      if (e.status !== 409 && e.status !== 422) throw e;
    }
  }
  throw new Error('Conflito ao salvar. Recarregue a página e tente de novo.');
}

/* ---------- Imagens ---------- */
const imagensLocais = new Map(); // caminho -> dataURL, para mostrar antes do GitHub Pages atualizar

/** Redimensiona para no máximo `max` px e devolve um JPEG em dataURL. */
export function reduzirImagem(arquivo, max = 600) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      ok(cv.toDataURL('image/jpeg', 0.84));
    };
    img.onerror = () => erro(new Error('Imagem inválida'));
    img.src = URL.createObjectURL(arquivo);
  });
}

/** Envia a imagem (dataURL) para img/<id>.jpg no repositório e devolve o caminho. */
export async function enviarImagem(dataUrl, id) {
  const caminho = `img/${id}-${Date.now().toString(36)}.jpg`;
  await gravarArquivo(caminho, dataUrl.split(',')[1], `Capa: ${id}`);
  imagensLocais.set(caminho, dataUrl);
  return caminho;
}

/** URL para exibir uma imagem salva (caminho relativo, URL externa ou recém-enviada). */
export function urlImagem(caminho) {
  if (!caminho) return '';
  return imagensLocais.get(caminho) || caminho;
}

/** Se a imagem ainda não estiver publicada no Pages, tenta o arquivo bruto do GitHub; senão, mostra o placeholder. */
window.__imgErro = (el) => {
  const c = getConfig();
  const caminho = el.dataset.src;
  if (!el.dataset.tentou && caminho && !/^(https?:|data:)/.test(caminho)) {
    el.dataset.tentou = '1';
    el.src = `https://raw.githubusercontent.com/${c.owner}/${c.repo}/${c.branch || 'HEAD'}/${caminho}`;
    return;
  }
  el.replaceWith(Object.assign(document.createElement('div'), { className: 'capa-vazia', innerHTML: '<span></span>' }));
};

export function htmlCapa(caminho, alt) {
  if (!caminho) return '<div class="capa-vazia"><span></span></div>';
  return `<img loading="lazy" src="${esc(urlImagem(caminho))}" data-src="${esc(caminho)}" alt="${esc(alt)}" onerror="__imgErro(this)">`;
}

/* ---------- Utilidades ---------- */
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fmtPreco(v) {
  if (v === '' || v == null) return '';
  return typeof v === 'number' ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : String(v);
}

/** Converte texto do campo de preço: "407,11" vira número; "Indisponível" fica texto. */
export function lerPreco(t) {
  const s = String(t).trim();
  if (!s) return '';
  const n = s.replace(/^R\$\s*/i, '').replace(/\./g, '').replace(',', '.');
  return /^\d+(\.\d+)?$/.test(n) ? Number(n) : s;
}

export function fmtData(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).split('-');
  return d ? `${d}/${m}/${a}` : iso;
}

/** Texto sem acentos e em minúsculas, para buscas. */
export const normal = (s) => String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function slug(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

export const novoId = (prefixo, artista, album) => `${prefixo}${Date.now().toString(36)}-${slug(`${artista} ${album}`)}`;

export const chave = (artista, album) => slug(`${artista}`) + '|' + slug(String(album).replace(/\(.*?\)|\[.*?\]/g, ''));

export const linkGoogleImagens = (artista, album) =>
  `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${artista} ${album} vinyl cover`)}`;

export function toast(msg, tipo = 'ok') {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.append(box); }
  const t = document.createElement('div');
  t.className = `toast ${tipo}`; t.textContent = msg;
  box.append(t);
  setTimeout(() => t.remove(), tipo === 'erro' ? 8000 : 4000);
}

/* ---------- Cabeçalho e configurações ---------- */
export function montarCabecalho(ativo) {
  const links = [
    ['index.html', 'Coleção', 'colecao'],
    ['tenho.html', 'Cadastrar Tenho', 'tenho'],
    ['quero.html', 'Cadastrar Quero', 'quero'],
  ];
  const h = document.createElement('header');
  h.className = 'topo';
  h.innerHTML = `
    <a class="marca" href="index.html"><span class="disco-mini"></span>Meus Vinis</a>
    <nav>${links.map(([href, txt, id]) => `<a href="${href}" class="${id === ativo ? 'ativo' : ''}">${txt}</a>`).join('')}</nav>
    <button type="button" class="btn-config" title="Conexão com o GitHub">
      <span class="status ${temToken() ? 'on' : ''}"></span>⚙ GitHub
    </button>`;
  document.body.prepend(h);
  h.querySelector('.btn-config').addEventListener('click', abrirConfig);
}

export function abrirConfig() {
  const c = getConfig();
  let d = document.getElementById('dlg-config');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'dlg-config';
    document.body.append(d);
  }
  d.innerHTML = `
    <form method="dialog" class="form-config">
      <h2>Conexão com o GitHub</h2>
      <p class="ajuda">Os vinis ficam salvos nos arquivos <code>data/*.json</code> e <code>img/</code> do repositório.
        Para gravar, cole um <b>token de acesso</b> do GitHub. Ele fica guardado só neste navegador.</p>
      <details><summary>Como criar o token</summary>
        <ol>
          <li>Abra <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a>.</li>
          <li>Em <i>Repository access</i>, escolha <b>Only select repositories</b> → <b>${esc(c.repo)}</b>.</li>
          <li>Em <i>Permissions → Repository permissions → Contents</i>, escolha <b>Read and write</b>.</li>
          <li>Gere o token e cole abaixo.</li>
        </ol>
      </details>
      <label>Token<input name="token" type="password" autocomplete="off" value="${esc(c.token)}" placeholder="github_pat_..."></label>
      <div class="linha">
        <label>Usuário/organização<input name="owner" value="${esc(c.owner)}" required></label>
        <label>Repositório<input name="repo" value="${esc(c.repo)}" required></label>
      </div>
      <label>Branch <small>(vazio = branch padrão do repositório)</small><input name="branch" value="${esc(c.branch)}" placeholder="main"></label>
      <p class="resultado"></p>
      <div class="acoes">
        <button type="button" class="sec" data-acao="sair">Remover token</button>
        <button type="button" class="sec" data-acao="testar">Testar</button>
        <button value="ok" class="pri">Salvar</button>
      </div>
    </form>`;
  const f = d.querySelector('form');
  const ler = () => Object.fromEntries(['token', 'owner', 'repo', 'branch'].map((k) => [k, f[k].value.trim()]));
  f.addEventListener('submit', () => { setConfig(ler()); location.reload(); });
  f.querySelector('[data-acao=sair]').onclick = () => { setConfig({ ...ler(), token: '' }); location.reload(); };
  f.querySelector('[data-acao=testar]').onclick = async () => {
    const out = f.querySelector('.resultado');
    const antes = getConfig();
    setConfig(ler());
    out.textContent = 'Testando…';
    try {
      const r = await fetch(`https://api.github.com/repos/${f.owner.value}/${f.repo.value}`, {
        headers: f.token.value ? { Authorization: `Bearer ${f.token.value.trim()}` } : {},
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      const pode = j.permissions?.push;
      out.textContent = pode ? `✔ Conectado a ${j.full_name} com permissão de escrita.` : `⚠ Repositório encontrado, mas sem permissão de escrita.`;
    } catch (e) {
      out.textContent = `✖ ${e.message}`;
    } finally { setConfig(antes); }
  };
  d.showModal();
}
