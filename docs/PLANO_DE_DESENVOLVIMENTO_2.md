# 📐 Plano de Desenvolvimento, Correção de Bugs e Melhorias (#2)

| Informação | Detalhe |
| :--- | :--- |
| **Documento** | Plano de Correção de Bugs, Refinamento de UX e Novas Funcionalidades (#2) |
| **Produto** | Editor de Modelo Entidade-Relacionamento (MER / DER) Conceptual & Lógico |
| **Versão** | 2.1 (Profissional Expandida) |
| **Sequência** | **#2** *(Sucessor do Plano de Desenvolvimento Inicial #1)* |
| **Status** | 📋 Especificação & Planejamento de Execução |

---

## 📑 Sumário
1. [Diagnóstico e Correção de Bugs Críticos](#1-diagnóstico-e-correção-de-bugs-críticos)
   - [1.1. Perda de Foco em Inputs durante a Digitação](#11-perda-de-foco-em-inputs-durante-a-digitação)
2. [Novos Requisitos Funcionais e Melhorias de UX](#2-novos-requisitos-funcionais-e-melhorias-de-ux)
   - [2.1. Exportação de Imagem em Preto e Branco (Estilo Acadêmico/Impressão)](#21-exportação-de-imagem-em-preto-e-branco-estilo-acadêmicoimpressão)
   - [2.2. Exclusão e Gestão de Linhas de Conexão/Relacionamento](#22-exclusão-e-gestão-de-linhas-de-conexãorelacionamento)
   - [2.3. Criação Interativa de Conexões (Drag-to-Connect / Puxar Linhas)](#23-criação-interativa-de-conexões-drag-to-connect--puxar-linhas)
   - [2.4. Multi-seleção com `Ctrl` e Selecionar Tudo (`Ctrl+A`)](#24-multi-seleção-com-ctrl-e-selecionar-tudo-ctrla)
   - [2.5. Minimapa Interativo para Navegação Panorâmica](#25-minimapa-interativo-para-navegação-panorâmica)
   - [2.6. Arquitetura de Abas: Diagrama Conceitual (MER) vs. Modelo Lógico (DER / Tabelas)](#26-arquitetura-de-abas-diagrama-conceitual-mer-vs-modelo-lógico-der--tabelas)
3. [Especificação Técnica dos Módulos Impactados](#3-especificação-técnica-dos-módulos-impactados)
4. [Matriz de Rastreabilidade e Checklist Sequencial (#2)](#4-matriz-de-rastreabilidade-e-checklist-sequencial-2)

---

## 1. Diagnóstico e Correção de Bugs Críticos

### 1.1. Perda de Foco em Inputs durante a Digitação
* **Problema Identificado:** Ao digitar no campo de texto de renomeação de uma entidade, atributo ou relacionamento, o cursor perde o foco a cada caractere digitado, obrigando o usuário a clicar repetidamente no input para continuar escrevendo.
* **Causa Raiz:** O evento `input` dispara `state.updateElement(...)`, que emite `element:updated` ou `change`. O painel contextual (`ContextPanel`) ouve esses eventos e executa um `this.render()`, recriando o HTML do formulário do zero via `innerHTML`. Isso destrói o elemento `<input>` ativo no DOM no momento da digitação.
* **Solução Técnica:**
  1. Durante a digitação ativa (`isEditingInput = true`), atualizar o modelo e as formas SVG diretamente sem reconstruir a árvore DOM do `ContextPanel`.
  2. Aplicar atualização pontual dos nós afetados (ex: apenas o `<text>` correspondente no SVG e o título do painel) ou preservar a referência do elemento em foco (`document.activeElement`) e sua posição de cursor (`selectionStart` / `selectionEnd`).
  3. Desacoplar a emissão do histórico de snapshots para ocorrer no evento `change` ou `blur`, mantendo o fluxo de digitação 100% fluido e ininterrupto.

---

## 2. Novos Requisitos Funcionais e Melhorias de UX

### 2.1. Exportação de Imagem em Preto e Branco (Estilo Acadêmico/Impressão)
* **Objetivo:** Permitir a geração de imagens limpas, ideais para artigos acadêmicos, TCCs, provas e documentações técnicas em preto e branco.
* **Especificações:**
  - **Fundo:** Branco puro (`#ffffff`) ou transparente, sem grids pontilhados ou xadrez.
  - **Contornos e Formas:** Traços pretos nítidos (`#000000`) de 1.5px a 2px, sem gradientes ou sombras decorativas (*drop-shadows* desativados na exportação).
  - **Preenchimento:** Branco (`#ffffff`) com texto preto em alto contraste.
  - **Identificação de Atributo Chave (PK):** O nome do atributo identificador/chave primária deve ser prefixado por um asterisco estilizado (ex: `*id_cliente` ou `* id_cliente`) além do sublinhado clássico.
  - **Linhas Derivadas:** Traço tracejado preto simples.
  - **Linhas Multivaloradas:** Linha dupla preta simples.

### 2.2. Exclusão e Gestão de Linhas de Conexão/Relacionamento
* **Objetivo:** Permitir que o usuário interaja diretamente com as linhas do canvas.
* **Especificações:**
  - As linhas de conexão devem ter uma área de captura de clique (*hitbox* invisível de ~12px de espessura) para facilitar o clique.
  - Ao clicar em uma linha, ela entra em estado selecionado (destaque em azul/glow).
  - O painel contextual exibe as propriedades da conexão selecionada (origem, destino, cardinalidade e botão "Excluir Conexão").
  - Pressionar a tecla `Delete` ou `Backspace` com a linha selecionada a remove imediatamente do diagrama e atualiza o histórico de `undo/redo`.

### 2.3. Criação Interativa de Conexões (Drag-to-Connect / Puxar Linhas)
* **Objetivo:** Criar relacionamentos e ligações de forma visual e intuitiva arrastando linhas diretamente entre as formas.
* **Especificações:**
  - **Pontos de Conexão (Anchor Points / Handles):** Ao passar o mouse sobre uma Entidade ou Losango (Relacionamento), pequenos círculos de conexão (*handles*) aparecem nas bordas (norte, sul, leste, oeste).
  - **Arraste de Linha Temporária:** Clicar e arrastar a partir de um handle puxa uma linha elástica visual que segue a ponta do cursor do mouse.
  - **Vínculo Magnético (Snap):** Soltar o cursor sobre outra forma compatível cria a conexão automaticamente:
    - *Entidade ➜ Losango (Relacionamento):* Cria a perna da relação com cardinalidade padrão `(1)`.
    - *Losango ➜ Entidade:* Cria a segunda perna da relação com cardinalidade padrão `(N)`.
    - *Entidade ➜ Entidade:* Instancia automaticamente um Losango intermediário entre as duas entidades já conectado.
    - *Entidade ➜ Atributo:* Conecta o atributo à entidade correspondente.

### 2.4. Multi-seleção com `Ctrl` e Selecionar Tudo (`Ctrl+A`)
* **Objetivo:** Oferecer controle total de seleção em massa para deleção, movimentação e organização do diagrama.
* **Especificações:**
  - Suporte tanto à tecla `Ctrl` quanto à tecla `Shift` para adicionar e remover elementos e conexões da seleção atual.
  - Possibilidade de selecionar simultaneamente: Entidades, Losangos, Atributos e Linhas de Conexão.
  - Atalho global `Ctrl + A` (ou `Cmd + A` no Mac): seleciona todos os nós e conexões do canvas ativo.
  - Ao pressionar `Delete`, todos os itens selecionados no grupo são excluídos de forma segura em uma única transação reversível (`undo`).

### 2.5. Minimapa Interativo para Navegação Panorâmica
* **Objetivo:** Facilitar a navegação rápida em diagramas extensos que ultrapassam os limites visíveis da tela.
* **Especificações:**
  - Componente flutuante no canto inferior direito do canvas (com opção de recolher/expandir).
  - Renderiza uma miniatura vetorial espelhada de todas as entidades e conexões existentes.
  - Retângulo indicador de Visor (*Viewport Box*) que representa a área visível da câmera atual.
  - Clicar ou arrastar a caixa do visor no minimapa movimenta instantaneamente o canvas principal (*pan* em tempo real).

### 2.6. Arquitetura de Abas: Diagrama Conceitual (MER) vs. Modelo Lógico (DER / Tabelas)
* **Objetivo:** Permitir trabalhar em duas visões complementares mantendo o mesmo padrão ergonômico de interface:
* **Estrutura das Abas:**
  1. **Aba 1: `Diagrama Conceitual (MER)`**
     - Ferramentas: Entidades, Relacionamentos, Atributos, Conexões, Wizard, Minimapa.
     - Foco: Visão de modelagem conceitual visual baseada em Peter Chen.
  2. **Aba 2: `Modelo Lógico (Tabelas / DER)`**
     - Layout: Mantém o cabeçalho superior e a barra lateral, adaptando as ferramentas para o modelo lógico.
     - Ferramentas da Barra Lateral: "Nova Tabela", "Adicionar Coluna", "Definir Chave Estrangeira (FK)", "Exportar SQL".
     - Área Central: Grid visual com cards interativos de Tabelas relacionais, permitindo adicionar, renomear e reordenar colunas, alterar tipos de dados (`INT`, `VARCHAR`, `DATETIME`, etc.) e gerenciar as relações diretamente.
     - Sincronização: Alterações feitas no Diagrama Conceitual alimentam o Modelo Lógico, e novas tabelas criadas no Modelo Lógico podem ser convertidas e refletidas no diagrama.

---

## 3. Especificação Técnica dos Módulos Impactados

| Módulo / Arquivo | Responsabilidade e Alterações Necessárias |
| :--- | :--- |
| **`js/components/context-panel.js`** | Eliminar recriação destrutiva de inputs no DOM durante `input`; manter foco ininterrupto; adicionar painel de edição de linhas de conexão selecionadas. |
| **`js/services/export-png.js`** | Implementar gerador de tema monocromático (preto e branco de alto contraste, sem fundo/fundo branco, marcação de PK com asterisco `*`). |
| **`js/canvas/renderer.js`** | Renderização de *hitboxes* de linhas, pontos de ancoragem (*handles*) para drag-to-connect, renderização do asterisco em PK no modo acadêmico. |
| **`js/canvas/interaction.js`** | Lógica de arrastar para conectar (*drag-to-connect*), seleção de linhas de conexão, atalho `Ctrl+A`, suporte ao `Ctrl` na multi-seleção. |
| **`js/components/minimap.js`** | **[NOVO]** Módulo dedicado para renderização e controle de câmera via minimapa. |
| **`js/components/tabs.js`** | **[NOVO]** Gerenciador de alternância de abas (*Conceitual MER* vs. *Lógico DER*) com persistência de estado e sincronização. |
| **`js/logical/logical-editor.js`** | **[NOVO]** Editor interativo da aba de Modelo Lógico (CRUD de tabelas, colunas, chaves e relacionamentos relacionais). |
| **`css/canvas.css` & `css/sidebar.css`** | Estilos para minimapa, handles de conexão magnética, abas do header e editor de tabelas lógicas. |
| **`index.html`** | Inclusão das abas de navegação no header, container do minimapa e carregamento ordenado dos novos módulos. |

---

## 4. Matriz de Rastreabilidade e Checklist Sequencial (#2)

| Item | Descrição da Tarefa | Módulos Envolvidos | Status |
| :---: | :--- | :--- | :---: |
| **01** | **Fix de Foco nos Inputs**: Digitação contínua sem perda de cursor nos formulários | `js/components/context-panel.js` | ✅ Concluído |
| **02** | **Exportação P&B Acadêmica**: Imagem monocromática, linhas simples e PK marcada com `*` | `js/services/export-png.js`, `renderer.js` | ✅ Concluído |
| **03** | **Seleção e Exclusão de Conexões**: Clique em linhas e exclusão via `Delete` / painel | `js/canvas/interaction.js`, `renderer.js` | ✅ Concluído |
| **04** | **Drag-to-Connect Visual**: Puxar linha magnética de entidade/losango para criar relações | `js/canvas/interaction.js`, `renderer.js` | ✅ Concluído |
| **05** | **Seleção Total com `Ctrl` e `Ctrl+A`**: Multi-seleção expandida incluindo nós e linhas | `js/canvas/interaction.js`, `state.js` | ✅ Concluído |
| **06** | **Minimapa de Navegação**: Radar visual com viewport box e clique para mover câmera | `js/components/minimap.js`, `canvas.css` | ✅ Concluído |
| **07** | **Sistema de Abas (MER vs DER Lógico)**: Alternância de abas e editor de modelo lógico | `js/components/tabs.js`, `js/logical/`, `index.html` | ✅ Concluído |
