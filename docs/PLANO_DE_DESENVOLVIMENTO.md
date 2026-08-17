# 📐 Plano de Desenvolvimento & Documento de Requisitos do Produto (PRD)

| Informação | Detalhe |
| :--- | :--- |
| **Produto** | Editor de Modelo Entidade-Relacionamento (MER) Conceptual |
| **Versão** | 2.0 (Profissional) |
| **Plataforma** | Web (Client-side / Vanilla JS, CSS3, SVG Nativo, HTML5) |
| **Status** | 📝 Planejamento / Em Definição |

---

## 📑 Sumário
1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Objetivos e Métricas de Sucesso](#2-objetivos-e-métricas-de-sucesso)
3. [Personas e Casos de Uso](#3-personas-e-casos-de-uso)
4. [Requisitos Funcionais (Escopo do Produto)](#4-requisitos-funcionais-escopo-do-produto)
   - [4.1. Interface e Área de Trabalho (Canvas)](#41-interface-e-área-de-trabalho-canvas)
   - [4.2. Manipulação e Comportamento de Formas](#42-manipulação-e-comportamento-de-formas)
   - [4.3. Interações Avançadas (Arraste e Seleção)](#43-interações-avançadas-arraste-e-seleção)
   - [4.4. Conectores e Relacionamentos](#44-conectores-e-relacionamentos)
   - [4.5. Exportação e Conversão](#45-exportação-e-conversão)
5. [Requisitos Não Funcionais](#5-requisitos-não-funcionais)
6. [Restrições e Suposições](#6-restrições-e-suposições)
7. [Próximos Passos (Out of Scope / Versão 3.0)](#7-próximos-passos-out-of-scope--versão-30)
8. [Matriz de Rastreabilidade e Checklist de Implementação](#8-matriz-de-rastreabilidade-e-checklist-de-implementação)

---

## 1. Visão Geral do Produto

O **Editor de MER Conceptual** é uma ferramenta visual, baseada em navegador, projetada para facilitar a criação, edição e exportação de diagramas de banco de dados. 

A **Versão 2.0** foca em:
- Aprimorar a usabilidade (UX) e design visual profissional.
- Corrigir comportamentos indesejados da interface (focos perdidos e redimensionamentos rígidos).
- Adicionar recursos avançados que convertem o modelo conceitual em **modelos lógicos** (tabelas relacionais) e **modelos físicos** (código SQL DDL executável).

> **Objetivo Principal:** Oferecer uma experiência fluida para estudantes, engenheiros de software e analistas de dados, permitindo desenhar diagramas e gerar seus scripts de implementação sem sair da ferramenta.

---

## 2. Objetivos e Métricas de Sucesso

* **🎯 Objetivo 1:** Melhorar a ergonomia da ferramenta, reduzindo drasticamente o número de cliques necessários para criar entidades, atributos e relações complexas.
* **🎯 Objetivo 2:** Garantir estabilidade total na manipulação do canvas (prevenindo movimentos involuntários, perdas de seleção e quebras de layout).
* **🎯 Objetivo 3:** Tornar a ferramenta uma ponte real e produtiva entre o design conceitual e o banco de dados físico, através da geração automática de SQL (DDL) e esquemas relacionais visuais.

---

## 3. Personas e Casos de Uso

### 🎓 Persona 1: Estudantes e Professores
* **Contexto:** Aprendizado e ensino de modelagem e arquitetura de dados em cursos técnicos ou superiores.
* **Caso de Uso:** Validação visual de chaves primárias (PK), chaves estrangeiras (FK), atributos compostos/multivalorados e regras de cardinalidade (1:1, 1:N, N:N).

### 💻 Persona 2: Arquitetos de Banco de Dados / Desenvolvedores
* **Contexto:** Planejamento rápido de microsserviços, schemas de bancos relacionais e documentação técnica.
* **Caso de Uso:** Desenhar a arquitetura no canvas visual e utilizar o recurso de **"Gerar SQL"** e **"Visualização Lógica"** para acelerar a criação das migrações e tabelas físicas.

---

## 4. Requisitos Funcionais (Escopo do Produto)

### 4.1. Interface e Área de Trabalho (Canvas)
- [ ] **Grade de Fundo (Grid):** O canvas deve apresentar um padrão visual xadrez/pontilhado sutil para auxiliar no alinhamento espacial dos elementos.
- [ ] **Modo Escuro (Dark Mode):** Botão na barra lateral para alternância entre temas Claro e Escuro, ajustando paleta de cores (fundo, formas geométricas, textos, linhas e modais) com ergonomia visual.
- [ ] **Barra de Ferramentas Visual:** Barra lateral esquerda com "Cards" clicáveis e ícones SVG representativos de cada forma geométrica (Entidade, Relacionamento, Atributos), substituindo botões genéricos de texto.
- [ ] **Painel Contextual Dinâmico:** Aparece na barra lateral dinamicamente quando um ou mais itens estiverem selecionados, oferecendo ações específicas de edição (ex: alterar nome, adicionar atributo, trocar cardinalidade, excluir).

### 4.2. Manipulação e Comportamento de Formas
- [ ] **Criação Rápida de Atributos:** Ao adicionar um atributo (*Primário, Simples, Multivalorado, Derivado ou Composto*) a uma entidade selecionada, o foco/seleção deve permanecer na entidade original, possibilitando a inserção contínua de múltiplos atributos sem cliques adicionais.
- [ ] **Redimensionamento Dinâmico:** As formas geométricas (*Retângulos para Entidades, Losangos para Relacionamentos, Elipses para Atributos*) aumentam ou diminuem sua largura/tamanho automaticamente com base no comprimento do texto inserido.
- [ ] **Estilo de Seleção Suave:** Destaque de seleção por contorno (*stroke*) suave com efeito glow/drop-shadow contextual ao tema, evitando bordas grossas e agressivas.

### 4.3. Interações Avançadas (Arraste e Seleção)
- [ ] **Correção de Arraste Involuntário:** O arraste de elementos só é iniciado quando o usuário clica e segura diretamente sobre uma forma geométrica específica. Clicar no espaço vazio do canvas não deve arrastar elementos.
- [ ] **Arraste em Cadeia (Entidade + Atributos):** Ao movimentar uma Entidade, todos os atributos conectados a ela devem mover-se simultaneamente, preservando a distância relativa e a angulação original.
- [ ] **Seleção em Grupo (Multi-seleção via Shift):** 
  - Selecionar múltiplas entidades e relacionamentos mantendo a tecla `Shift` pressionada durante o clique.
  - Arrastar qualquer elemento do grupo move todos os elementos selecionados em bloco.
  - Atributos vinculados às entidades agrupadas acompanham o movimento automaticamente.

### 4.4. Conectores e Relacionamentos
- [ ] **Criação de Relacionamento Completo (Wizard / Relacionamento Rápido):** 
  - Botão no painel contextual da Entidade.
  - Solicitação rápida: *Nome do Relacionamento* e *Nome da Entidade de Destino* (com cardinalidades padrão "1" e "N" configuráveis).
  - Instanciação automática do Relacionamento e da nova Entidade alinhados à direita da origem com linhas conectadas, mantendo o foco na Entidade de origem.
- [ ] **Gestão de Cardinalidade:** Rótulos de cardinalidade (ex: `1`, `N`, `(0,1)`, `(1,n)`, `(0,n)`) posicionados de forma legível e fixados próximos às respectivas entidades.

### 4.5. Exportação e Conversão
- [ ] **Salvar / Carregar Modelo (JSON):**
  - **Salvar:** Serialização completa do estado do diagrama (posições x/y, dimensões, nomes, tipos, conexões e cardinalidades) em arquivo `.json`.
  - **Carregar:** Importação de `.json` restaurando fielmente todo o estado visual e conexões.
- [ ] **Exportar PNG:** Renderização em alta qualidade da área do canvas para download em `.png` (respeitando o tema Claro/Escuro ativo).
- [ ] **Visualização Lógica (Modelo Relacional):**
  - Modal interativo com o esquema relacional tabular.
  - Cada Entidade mapeada para uma tabela HTML com cabeçalho.
  - Listagem de atributos com badges visuais de Chave Primária (**PK**).
  - Resolução automática de relações `1:N` inserindo as Chaves Estrangeiras (**FK**) nas tabelas filhas.
- [ ] **Gerar Código SQL (DDL):**
  - Modal com `textarea` com botão "Copiar Código".
  - Geração de scripts `CREATE TABLE` padronizados.
  - Mapeamento de colunas, tipos e `PRIMARY KEY`.
  - Detecção automática de relacionamentos `N:N`, gerando as **Tabelas Associativas (Tabelas Pivot)** com suas respectivas `FOREIGN KEY` e restrições.

---

## 5. Requisitos Não Funcionais

* **⚡ Desempenho:** Renderização e interações de arraste/zoom fluindo a 60 FPS contínuos sem engasgos ou travamento da thread principal.
* **🧱 Arquitetura e Stack:**
  - 100% **Client-side** (Zero dependências pesadas, sem necessidade de build complexo ou backend).
  - **HTML5**, **CSS3** moderno (com CSS Variables para temas e animações suaves).
  - **Vanilla JavaScript** estruturado modularmente.
  - **SVG Nativo** para renderização precisa e vetorial das formas e conectores.
* **💾 Persistência:** Stateless por padrão de sessão; persistência e portabilidade garantidas via arquivos `.json` locais e opcionalmente `localStorage` para autosave de segurança.

---

## 6. Restrições e Suposições

* **🖥️ Dispositivos e Telas:** Foco prioritário em telas Desktop / Notebook (resoluções `>= 1024x768`). Interações touch / mobile estão fora do escopo principal da v2.0 devido à precisão necessária na manipulação do canvas.
* **🏷️ Tipagem SQL Genérica:** Na versão 2.0, a geração de SQL assumirá tipagem padrão inteligente:
  - Chaves Primárias / IDs: `INT AUTO_INCREMENT` (ou `BIGINT`)
  - Atributos convencionais: `VARCHAR(255)`
  - Atributos de texto longo ou numéricos conforme convenção de nomenclatura.

---

## 7. Próximos Passos (Out of Scope / Versão 3.0)

1. **Minimapa Interativo:** Navegação rápida e visão panorâmica para diagramas extensos.
2. **Editor Avançado de Tipos de Dados:** Seleção de tipos nativos SQL diretamente na propriedade do atributo (`INT`, `DATETIME`, `BOOLEAN`, `DECIMAL`, `TEXT`, `UUID`).
3. **Engenharia Reversa (SQL -> MER):** Importação de scripts `.sql` com `CREATE TABLE` para geração automática e layout inteligente do diagrama no canvas.
4. **Exportação Vetorial (SVG / PDF):** Exportação direta para SVG e documentos PDF vetoriais.

---

## 8. Matriz de Rastreabilidade e Checklist de Implementação

| Módulo | Componente / Funcionalidade | Status |
| :--- | :--- | :---: |
| **01. Core Canvas** | Setup do elemento SVG, Grid de fundo xadrez/dots, Viewbox/Zoom | ⏳ Pendente |
| **02. Design System** | Tema Claro / Escuro (CSS Variables), Cards da Toolbar, Glow de Seleção | ⏳ Pendente |
| **03. Formas (Shapes)** | Entidades (Retângulo), Relacionamentos (Losango), Atributos (Elipse) com Auto-resize | ⏳ Pendente |
| **04. Atributos** | Tipos: Primário (PK), Simples, Multivalorado, Composto, Derivado + Foco persistente | ⏳ Pendente |
| **05. Interações** | Arraste isolado sem clique em falso, Arraste em cadeia (Entidade + Atributos), Multi-seleção (Shift) | ⏳ Pendente |
| **06. Conexões & Wizard** | Linhas dinâmicas, Rótulos de cardinalidade (1, N), Wizard de Relacionamento Rápido | ⏳ Pendente |
| **07. Painel Contextual** | Sidebar adaptável com campos de edição por tipo de elemento selecionado | ⏳ Pendente |
| **08. Exportação JSON/PNG** | Serialização e deserialização JSON completa, Renderização Canvas para download PNG | ⏳ Pendente |
| **09. Motor Relacional & SQL** | Algoritmo de mapeamento MER -> Relacional (1:1, 1:N, N:N com tabela associativa) e DDL SQL | ⏳ Pendente |
| **10. Modais de Saída** | Modal de Visualização Lógica (HTML Tables) e Modal com gerador de SQL copiável | ⏳ Pendente |
