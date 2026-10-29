# Changelog

Todas as versões do FatorSimples e o que mudou em cada uma.

## v1.5.0 (2026-10-29)

### ✨ Novidades

- Importação sugere o relatório de pagamentos quando ele falta (c3b7523)
- Importação pede a declaração do PGDAS-D que falta para a folha ficar exata (4952ce1)
- Seletor de competência abre a grade de anos ao clicar no ano (856807b)
- Vitrine da tela inicial conta a história do pró-labore ao DAS (3fb3a4e)
- Visual mais elegante, Configurações reorganizadas e modo escuro novo (4caa7fd)
- Lembrete de mês pendente e folha estimada pelo DARF na importação (19d97ea)
- Tela inicial, modo exemplo e importação do PGDAS-D e dos pagamentos da Receita (59a15e7)
- Ajuda nos campos com o que é e onde encontrar cada informação (9e55df5)
- App aberto por dias acompanha o relógio e confere versão nova a cada 6 horas (5ef858b)

### 🐛 Correções

- DAS calculado tributo a tributo, como o PGDAS-D (d4e1cea)
- Importação pede a declaração de todo mês sem folha, não só dos 12 últimos (b30d2ec)
- Importação diz quando o leitor de PDF não carregou, em vez de "não reconheci" (883abde)
- No claro, blocos quase brancos com contorno e o cartão branco dominante (2bb7e07)
- Blocos internos visíveis no tema claro (7ae80a7)
- Importação não grava DAS calculado sem os 12 meses anteriores (640e8b9)
- Importação reparte o DARF 1410 pelo pró-labore da guia e arredonda os 28% para cima (e1c17b7)
- Folha estimada pelo DARF ao centavo certo e Fator R marcado como estimado (0ada48d)
- Banco com versão da estrutura e gravações em lote numa transação (a7606e7)
- Tudo no SQLite no desktop (tema, preferências e versão ignorada) e sem banco paralelo (81d05d7)
- No desktop o banco SQLite é a única fonte; banco novo começa vazio (86ff9a9)

### 📝 Documentação

- Capturas e demonstração com o visual novo, tela inicial, Configurações e Dados e backup (5b07906)
- Tela inicial, importação dos PDFs da Receita e seção Seus dados (7b23e18)

### 📦 Build e distribuição

- Leitor de PDF só no build, fora do pacote do app (portátil volta a ~96 MB) (601c1b8)
- App menor (SQLite só do sistema empacotado) e tela de carregamento com npm run splash (0f052b9)
- Release roda os testes, não repete a versão e notas sem as trocas de versão (279774d)

## v1.4.0 (2026-10-28)

### ✨ Novidades

- Aviso de versão nova no rodapé do menu, no lugar da barra do topo (ad8cba7)
- Aviso de versão nova na barra do topo, conferido em toda abertura (433cbea)

### 🐛 Correções

- Registro do tutorial guardado no banco, junto com os dados (108d040)
- Botão de recolher aparecia por cima dos diálogos (79f5804)

### ♻️ Melhorias internas

- Versão sai do título (continua no rodapé, em Configurações) (ad6f251)

### 📝 Documentação

- README e imagens atualizados para a 1.4.0 (a562cb6)
- Animação de demonstração do app no topo do README (3cea738)

### 🔧 Manutenção

- Versão 1.4.0 (7d3c709)
- Versão 1.3.3 (6ca24db)
- Versão 1.3.2 (ea6ebfc)

## v1.3.1 (2026-10-26)

### ✨ Novidades

- Tela de carregamento enquanto o app se descompacta (8316cba)
- Botão de recolher redondo na borda do menu, no visual das pílulas (b692e56)

### 🐛 Correções

- Metade do botão de recolher não respondia e o duplo clique maximizava a janela (9aa6315)

### 🔧 Manutenção

- Versão 1.3.1 (6ddc172)

## v1.3.0 (2026-10-25)

### ✨ Novidades

- Instalador para Windows (abre em ~1 s e atualiza por cima) e versão 1.3.0 (3630687)
- Botões de minimizar, maximizar e fechar do próprio app (2437fce)

### ⚡ Desempenho

- App empacotado menor e interface carregada sob demanda (58fc56d)

## v1.2.0 (2026-10-25)

### ✨ Novidades

- Bloqueia competências futuras e renomeia filtro para "Este ano" (f5874fe)
- Tema claro e sons ligados por padrão; capturas no tema claro (9b76054)
- Cada tela se apresenta na primeira visita (14f5811)
- Tutorial guiado na primeira vez e novidades por versão (2204f97)
- Topo com a empresa em pílula flutuante (623335d)
- Camadas no claro, escuro esverdeado e "Tirar a folga" do pró-labore (e81b77c)
- Menu e textos de pessoa comum, legibilidade e confirmações no tema (5aac7c0)
- Alíquota para a nota e transferências do mês (d270ff1)
- Atualização real das tabelas fiscais pelo GitHub (82caa62)
- Honorários da contabilidade no fechamento do mês (36c97c5)
- Seletor de competência próprio e menu 'Histórico' (ba35b4b)
- Esqueleto durante a carga do histórico (b8e5bf8)
- Acabamento de botões, competência, salvar e memória de cálculo (eb8c90c)
- Animações de entrada, exclusão e destaque de linhas (a066b13)
- Simulador com transições ao vivo (cd490e9)
- Medidor de folga e gráfico realizado × sem Fator R (0e8ed4f)
- Gráfico de evolução com Fator R e meta (83a6604)
- Medidor do Fator R e sparklines nos indicadores (e7a10f3)
- Sparkline, medidor do Fator R e gráfico de área (e6e4efd)
- Geometria SVG pura e testada (8de164b)
- Tema volta a ser um botão só, com ícone girando entre sol e lua (732e508)
- Destaque do menu escorre como líquido entre os itens (fb44862)
- Linguagem visual no estilo da referência (87487df)
- Efeitos sonoros sutis opcionais (375be7e)
- Menu lateral recolhível em trilho de ícones (c569739)
- Barra de título própria e sem menu nativo (f115497)
- Números animados e entrada em cascata na Apuração (19896bb)
- Transições entre telas e modais (c693831)
- Seletor segmentado com pílula deslizante (6b14a16)
- Indicador deslizante no menu lateral (2f649ea)
- Troca de tema com revelação circular (6806fb0)

### 🐛 Correções

- Honorários da contabilidade fora do "Vale a pena?" (554b05a)
- Achados da revisão (falta de caixa, tabelas antigas, robustez) (5df66aa)
- Números consistentes e dados de exemplo sinalizados (b61683c)
- Achados menores da revisão da Fase 3 (b56341f)
- Achados menores da revisão da Fase 2 (447a398)
- Tooltip de gráfico sem índice velho e troca de tela com movimento reduzido (7d3ce8f)
- Menu lateral segue só a escolha do usuário (544fe29)
- Menu expandido não recolhe mais ao escolher uma opção (d677d56)
- Aviso sonoro na troca de competência, movimento reduzido e clique no menu sobre a barra (f48731e)

### ♻️ Melhorias internas

- Transferências sem Copiar e Feito (419f220)
- Alíquota não se repete nos indicadores (d534625)

### 📝 Documentação

- Capturas de tela da nova interface (8cd0ddc)
- Plano inclui barra de título própria, menu recolhível e sons (bb001ee)
- Plano de UX/UI com animações em três fases (dfa2526)
- Explica os códigos 3333 e 1410 da consulta de pagamentos (cc3f812)
- Corrige o gráfico de crescimento de estrelas (9c67c1b)

### 🔧 Manutenção

- Versão 1.2.0, README e capturas de tela atualizados (baf5d4a)
- Base de animações (motion, tokens, reduced-motion) e vitest (9dbc14e)

## v1.1.1 (2026-10-23)

### ✨ Novidades

- Suporte a macOS e Linux (ed4290c)
- Calculadora do Simples Nacional e Fator R (efbeea1)

### 📝 Documentação

- Instalação para Windows, macOS e Linux (e197f26)
- Atualiza os links para o novo nome do repositório (009781e)
- Adiciona gráfico de crescimento de estrelas ao README (c6660a4)
- Troca o contador de visualizações do README (135ecbf)
- README, licença MIT e capturas de tela (0cfcaa2)

### 📦 Build e distribuição

- Release com builds para Windows, macOS e Linux (a611030)
- Action manual para gerar releases com changelog (87a755a)

