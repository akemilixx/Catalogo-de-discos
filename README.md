# Catálogo de discos

Site (GitHub Pages) para cadastrar e ver os vinis que **tenho** e os que **quero**.
Os dados vieram das planilhas `Vinis_que_tenho.xlsx` e `Vinis_que_quero.xlsx`.

| Página | O que faz |
|---|---|
| `index.html` – **Coleção** | Mostra os dois juntos (abas Todos / Tenho / Quero), com busca (inclusive por música), filtro por gênero e ordenação. Clique num disco para ver todos os detalhes. |
| `tenho.html` – **Cadastrar Tenho** | Cadastrar, editar e excluir discos que você tem: Cantor/banda, Estilo musical, Nome do álbum, Fotos, Lados com as Músicas, Valor pago. |
| `quero.html` – **Cadastrar Quero** | Cadastrar, editar e excluir discos que você quer: Núm., Artista/banda, Gênero, Álbum, Capa, Lançamento do vinil, Nacionalidade, Lojas, Preço, Data última atualização, Link Google Images. O botão **Comprei!** passa o disco para a lista Tenho. |

## Onde os dados ficam

- `data/tenho.json` e `data/quero.json`: as listas.
- `img/`: as capas (as 124 da planilha "quero" foram extraídas e reduzidas para 600 px).

Cada cadastro feito no site vira um commit nesses arquivos, pela API do GitHub.

## Como publicar (uma vez)

1. No GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**, escolha a branch com estes arquivos e a pasta `/ (root)`.
2. O site fica em `https://akemilixx.github.io/Catalogo-de-discos/`.

## Como liberar a gravação (uma vez por navegador)

1. Crie um token em <https://github.com/settings/personal-access-tokens/new>:
   - *Repository access*: **Only select repositories** → `Catalogo-de-discos`
   - *Repository permissions → Contents*: **Read and write**
2. No site, clique em **⚙ GitHub**, cole o token e salve. O token fica só no seu navegador.
3. Se o Pages publicar de uma branch que não é a padrão, informe essa branch no mesmo diálogo.

Depois de salvar, o site publicado leva cerca de 1 minuto para mostrar a mudança
para quem não tem token; quem tem token já vê na hora.

## Reimportar as planilhas

```bash
python3 ferramentas/importar_planilhas.py Vinis_que_quero.xlsx Vinis_que_tenho.xlsx .
```

(precisa de `openpyxl` e `Pillow`; sobrescreve `data/*.json`).
