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

## Senha para cadastrar (quem cadastra não precisa de conta no GitHub)

Quem só visita vê a coleção. Para cadastrar, editar e excluir é preciso **Entrar** com a senha.

**Dono do repositório (uma vez):**
1. Crie um token em <https://github.com/settings/personal-access-tokens/new>:
   - *Repository access*: **Only select repositories** → `Catalogo-de-discos`
   - *Repository permissions → Contents*: **Read and write**
2. No site: **Entrar → Definir senha**, cole o token e escolha uma senha forte.
   O token é salvo em `data/acesso.json` **criptografado com a senha** (AES-GCM + PBKDF2).
3. Passe a senha para quem vai cadastrar.

Para trocar a senha (ou quando o token vencer), repita o passo 2.

**Quem cadastra:** abre o site, clica em **Entrar**, digita a senha. O navegador lembra até clicar em **Sair**.

## Segurança: o que saber

- **A senha dá acesso ao token.** Quem entra com a senha fica com o token do GitHub guardado no navegador e
  consegue copiá-lo. Passe a senha só para quem você confia.
- **Trocar só a senha não corta o acesso de ninguém.** As versões antigas de `data/acesso.json` continuam no
  histórico do git, e a senha antiga ainda abre o mesmo token. Para cortar o acesso de alguém:
  1. Revogue o token em <https://github.com/settings/personal-access-tokens> (**Revoke**).
  2. Crie um token novo (passos acima).
  3. No site: **Entrar → Definir senha** com o token novo e uma senha nova.
  4. Passe a senha nova só para quem ainda deve cadastrar.
- **Use uma senha forte**, como uma frase com 4 ou 5 palavras aleatórias. O arquivo cifrado é público, então
  qualquer pessoa pode tentar adivinhar a senha no próprio computador.
- **Dê ao token uma validade curta** (por exemplo, 90 dias) e só a permissão *Contents* deste repositório.
  O token também pode alterar o código do site. De vez em quando, olhe os commits e veja se aparece alguma
  mudança fora de `data/` e `img/` que você não fez.
- **Tudo no repositório é público:** a coleção, os valores pagos e o e-mail de quem fez os commits.

Depois de salvar, o site publicado leva cerca de 1 minuto para mostrar a mudança
para quem está só visitando; quem entrou com a senha já vê na hora.

## Reimportar as planilhas

```bash
python3 ferramentas/importar_planilhas.py Vinis_que_quero.xlsx Vinis_que_tenho.xlsx .
```

(precisa de `openpyxl` e `Pillow`; sobrescreve `data/*.json`).
