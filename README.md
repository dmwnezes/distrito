# Distrito

Jogo de celular de construir e governar uma cidade, em pixel art isométrica. Você é o prefeito: abre ruas, pinta zonas, leva luz e água, equilibra o caixa, aprova leis na Câmara e enfrenta eleições a cada 4 anos.

- **Jogar no navegador:** https://dmwnezes.com/distrito/
- **APK Android (offline):** https://github.com/dmwnezes/distrito/releases/latest/download/Distrito.apk

## O que tem

- Mapas aleatórios em 3 tamanhos e 6 tipos de terreno (rio, litoral, lagos, serra, sertão), com relevo, praias e matas
- Terraplanagem (elevar, rebaixar, nivelar, aterrar), plantio de árvores e compra de novas áreas (cada área vira um bairro com nome)
- Ruas, avenidas e pontes; zonas residenciais, comerciais e industriais em 3 densidades; prédios crescem com o tempo e sobem de nível
- Serviços por raio de alcance: energia, água, esgoto, lixo, polícia, bombeiros, saúde, educação, lazer e transporte (ônibus, VLT, metrô, trem, porto, aeroporto)
- Economia: impostos, orçamento por setor, empréstimos, falência, produção (comida, madeira, minério, mercadorias), importação e exportação, turismo
- Simulação: emprego, trânsito com congestionamento, poluição do ar e barulho, crime, valor do terreno, felicidade, classes sociais, migração e abandono
- Política: aprovação, eleições, promessas de campanha, Câmara com aliados e oposição, 14 leis
- Eventos (desligáveis): inflação, crise, boom, enchentes, incêndios, seca, terremoto e epidemia
- Moradores com nome e diário que dá para seguir, mural de reclamações, jornal da cidade e 6 conselheiros
- Progressão: 8 níveis de cidade, missões, 16 pesquisas, 24 conquistas, ranking contra 6 cidades rivais
- Modos Desafio, Tranquilo e Criativo, mais 5 cenários de campanha
- Ciclo de dia e noite, clima e estações (desligáveis), trilha calma e sons de ambiente gerados na hora
- Modo foto, várias cidades salvas no aparelho

## Como está organizado

Tudo em HTML + JavaScript puro, sem dependências. A arte é desenhada por código (`js/sprites.js`).

| Arquivo | Conteúdo |
|---|---|
| `js/data.js` | construções, zonas, leis, pesquisas, cenários e conquistas |
| `js/world.js` | mapa, relevo, ruas, lotes e terraplanagem |
| `js/sim.js` | toda a simulação |
| `js/render.js` | desenho isométrico, carros, pedestres, clima |
| `js/ui.js` | interface, painéis e toques |
| `android/` | app que roda o jogo dentro do APK, sem internet |

O workflow `Gerar APK` copia o jogo para dentro do app e publica o APK nas Releases a cada push. A chave de assinatura vem dos segredos `ANDROID_KEYSTORE` (arquivo .jks em base64) e `ANDROID_KEY_PASS` do repositório, para que cada versão instale por cima da anterior sem apagar as cidades salvas.
