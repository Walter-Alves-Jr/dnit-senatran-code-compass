# Code Compass — De-para DNIT ⇄ SENATRAN

Consulta visual da correspondência entre os tipos de veículo usados na operação
(planilha de de-para e cadastro do ERP) e as classificações homologadas pela
**Portaria SENATRAN nº 268/2022**.

O site é 100% estático: sem banco de dados, sem login e sem chaves de API.
Todo o conteúdo vem de arquivos JSON e PNG dentro de `src/`.

## Páginas

| Página | O que faz |
| --- | --- |
| `/` — De-para | O usuário escolhe o **tipo de veículo** e depois o **implemento** em duas caixas de seleção com busca. Para a combinação, aparecem o código SENATRAN, a imagem oficial da portaria, um desenho da composição com os eixos e o peso de cada conjunto, o número de eixos, o PBTC máximo, o comprimento máximo e o código SAP. |
| `/sistema` — Veículos do sistema | Lista os veículos do cadastro do ERP e sugere, para cada um, o código SENATRAN correspondente. Dá para buscar pelo nome ou pelo código ERP e filtrar pela qualidade da correspondência (exata, ajustada ou aproximada). |
| `/portaria` — Catálogo da portaria | As 187 composições homologadas do Anexo I, cada uma com a imagem oficial, os pesos por eixo e o PBTC. Filtro por família (caminhão, carreta, bitrem, rodotrem, ônibus), por necessidade de AET e por busca livre. |

## Rodando localmente

Você precisa de Node.js 20+ e npm.

```sh
git clone <url-do-repositorio>
cd <nome-do-repositorio>
npm install
npm run dev
```

Abra `http://localhost:8080`.

Outros comandos:

```sh
npm run build    # compilação de produção
npm run test     # testes
npm run lint     # verificação de código
npm run format   # formatação com Prettier
```

## Estrutura

```
src/
  data/
    portaria.json    187 composições do Anexo I: código, pesos por eixo, PBTC
    dexpara.json     nomes dos tipos de veículo e implementos + tabela de de-para
    sistema.json     veículos do cadastro do ERP (nome, eixos, peso, código ERP)
  assets/senatran/   187 imagens das composições
  lib/
    senatran.ts      regras que montam o desenho a partir dos pesos por eixo
    portaria.ts      carrega o catálogo e as imagens
    sistema.ts       regra que sugere o código SENATRAN para cada veículo do ERP
  components/        desenho da composição e caixas de seleção com busca
  routes/            as três páginas
```

## De onde vêm os dados

- **Portaria SENATRAN nº 268/2022**, de 14 de março de 2022, que homologa os veículos
  e as combinações de veículos de carga e de passageiros com seus limites de pesos e
  dimensões. Publicada no Diário Oficial da União em 15/03/2022, Edição 50, Seção 1,
  página 69, e disponível em
  [in.gov.br](https://www.in.gov.br/en/web/dou/-/portaria-n-268-de-14-de-marco-de-2022-385802759),
  no [PDF do Anexo I](https://www.gov.br/dnit/pt-br/assuntos/infraestrutura-rodoviaria/aet/resolucoes-aet/Portaria2682022ANEXO.pdf)
  e no [PDF da portaria](https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2022/Portaria2682022.pdf).
- **Imagens** de `src/assets/senatran/` recortadas do PDF oficial do anexo.
  Publicações oficiais do governo federal são de domínio público
  (art. 8º da Lei nº 9.610/1998).
- **`sistema.json`** é o cadastro de veículos de uma frota específica, com os códigos
  ERP usados por ela. Serve de exemplo de como ligar um cadastro próprio ao catálogo
  da portaria — cada empresa substitui pela sua lista.

## Aviso importante

O código SENATRAN mostrado para cada veículo do sistema é uma **sugestão gerada por
regra**: o site parte do tipo de equipamento, e quando o número de eixos não confere
com a portaria procura, na mesma família, o código com o mesmo número de eixos e o
PBTC mais próximo. Ele **não substitui a classificação oficial** nem uma autorização
de trânsito. Confira sempre com o texto da portaria antes de usar em operação,
cotação ou documento fiscal.

Composições que necessitam de AET (Autorização Especial de Trânsito) aparecem marcadas
na tela.

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

[MIT](LICENSE) — © 2026 Walter Alves.
