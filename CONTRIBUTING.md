# Como contribuir

Contribuições são bem-vindas. Se você encontrou um erro de correspondência entre um tipo
de veículo e um código SENATRAN, isso já é uma contribuição valiosa — abra uma issue.

## Ambiente de desenvolvimento

Você precisa de Node.js 20+ e npm.

```sh
git clone <url-do-repositorio>
cd <nome-do-repositorio>
npm install
npm run dev
```

O site sobe em `http://localhost:8080`.

## Verificações antes de abrir um pull request

```sh
npm run lint      # regras de código
npm run test      # testes automatizados
npm run build     # compilação completa
```

## Onde fica cada coisa

| Arquivo | Conteúdo |
| --- | --- |
| `src/data/portaria.json` | Tabela do Anexo I da Portaria SENATRAN 268/2022: código, pesos por eixo e PBTC |
| `src/assets/senatran/` | Imagens das composições, recortadas do PDF oficial |
| `src/data/dexpara.json` | Nomes dos tipos de veículo usados na planilha de de-para |
| `src/data/sistema.json` | Lista de veículos do sistema usada na página "Veículos do sistema" |
| `src/lib/senatran.ts` | Regras que montam o desenho do veículo a partir dos pesos por eixo |
| `src/lib/sistema.ts` | Regra que sugere o código SENATRAN para cada veículo do sistema |
| `src/routes/` | As três páginas do site |

## Regras para mudanças nos dados

- Qualquer alteração em `src/data/portaria.json` precisa conferir com o Anexo I da
  portaria oficial. Coloque o link da fonte na descrição do pull request.
- A coluna `id_dnit` da lista de veículos do sistema está vazia: o código SENATRAN
  mostrado é uma **sugestão** gerada por regra (mesma família, mesmo número de eixos,
  PBTC mais próximo). Se você tiver a correspondência oficial, pode enviar em
  `src/data/sistema.json`.
- Não adicione chaves, senhas ou dados de clientes. O projeto não usa variáveis de
  ambiente nem banco de dados — tudo é estático.
