# 📐 Plano de Desenvolvimento, Correção de Bugs e Melhorias (#3)

| Informação | Detalhe |
| :--- | :--- |
| **Documento** | Plano de Correção de Bugs, Refinamento de UX e Novas Funcionalidades (#3) |
| **Produto** | Editor de Modelo Entidade-Relacionamento (MER / DER) Conceptual & Lógico |
| **Versão** | 2.2 (Refinamento Interativo & Integração DER) |
| **Sequência** | **#3** *(Sucessor dos Planos de Desenvolvimento #1 e #2)* |
| **Status** | 📋 Especificação & Planejamento de Execução |

---

## 📑 Sumário
1. [Diagnóstico e Correção dos Problemas Reportados](#1-diagnóstico-e-correção-dos-problemas-reportados)
   - [1.1. Posicionamento das Portas de Conexão (Handles) nas Bordas](#11-posicionamento-das-portas-de-conexão-handles-nas-bordas)
   - [1.2. Edição de Entidades Origem e Destino no Painel do Relacionamento](#12-edição-de-entidades-origem-e-destino-no-painel-do-relacionamento)
   - [1.3. Ajuste de Posicionamento e Visibilidade das Cardinalidades](#13-ajuste-de-posicionamento-e-visibilidade-das-cardinalidades)
   - [1.4. Correção e Estabilização dos Botões de Chave (PK, FK, COL) no DER](#14-correção-e-estabilização-dos-botões-de-chave-pk-fk-col-no-der)
   - [1.5. Ícone Informativo `(i)` com Tooltip para Chaves Estrangeiras (FK)](#15-ícone-informativo-i-com-tooltip-para-chaves-estrangeiras-fk)
   - [1.6. Criação de Relacionamentos Diretamente na Aba DER (Modelo Lógico)](#16-criação-de-relacionamentos-diretamente-na-aba-der-modelo-lógico)
2. [Especificação Técnica dos Módulos Impactados](#2-especificação-técnica-dos-módulos-impactados)
3. [Matriz de Rastreabilidade e Checklist Sequencial (#3)](#3-matriz-de-rastreabilidade-e-checklist-sequencial-3)

---

## 1. Diagnóstico e Correção dos Problemas Reportados

### 1.1. Posicionamento das Portas de Conexão (Handles) nas Bordas
* **Problema:** A porta/bolinha de puxar a linha de relacionamento estava centralizada `(cx: width/2, cy: height/2)` na entidade, ficando sob o texto ou inacessível no arraste.
* **Solução Técnica:**
  - Posicionar 4 âncoras/pontos visuais de conexão magnética nas bordas da Entidade e do Losango:
    - **Direita:** `(width, height / 2)` *(principal)*
    - **Esquerda:** `(0, height / 2)`
    - **Topo:** `(width / 2, 0)`
    - **Base:** `(width / 2, height)`
  - Destacar os handles ao passar o mouse sobre a forma (`hover`), permitindo clicar e arrastar a linha conectora diretamente a partir de qualquer uma das bordas (sem necessidade de pressionar Alt).

### 1.2. Edição de Entidades Origem e Destino no Painel do Relacionamento
* **Problema:** Ao selecionar um relacionamento (Losango), o painel lateral exibia apenas os nomes das entidades conectadas, sem permitir reatribuir ou trocar quem é a entidade de Origem e de Destino.
* **Solução Técnica:**
  - Inserir campos `<select>` dinâmicos no painel lateral de Relacionamento:
    - **Entidade de Origem:** Lista todas as entidades existentes com a cardinalidade correspondente.
    - **Entidade de Destino:** Lista todas as entidades existentes com a cardinalidade correspondente.
  - Ao alterar uma das entidades no dropdown, o sistema atualiza a conexão correspondente instantaneamente no canvas.

### 1.3. Ajuste de Posicionamento e Visibilidade das Cardinalidades
* **Problema:** Os rótulos de cardinalidade (ex: `1`, `N`) estavam sendo calculados com um fator fixo `(t = 0.72)` a partir do centro, fazendo com que em entidades largas ou ângulos diagonais o rótulo ficasse escondido sob o retângulo da entidade.
* **Solução Técnica:**
  - Implementar cálculo vetorial baseado na intersecção com a borda da forma de destino (`bounding box / edge intersection`).
  - Posicionar o badge de cardinalidade a uma distância segura de **22px fora da borda** da entidade de destino, com elevação (`z-index` no SVG) garantindo que nunca fique oculto atrás de nós.

### 1.4. Correção e Estabilização dos Botões de Chave (PK, FK, COL) no DER
* **Problema:** Os botões de alternância de PK/COL no editor lógico (DER) apresentavam instabilidade de renderização e não sincronizavam de volta com os atributos da entidade no MER.
* **Solução Técnica:**
  - Reestruturar o ciclo de eventos do `LogicalEditor`:
    - Alternar `PK` ➜ atualiza o atributo para `attrType: 'primary'` no estado e vice-versa.
    - Suporte para indicar e alternar `FK` e atualizar as constraints de integridade referencial.
    - Garantir que o clique no botão de tipo/chave não feche nem desfoque inputs abertos.

### 1.5. Ícone Informativo `(i)` com Tooltip para Chaves Estrangeiras (FK)
* **Problema:** No modelo relacional (DER), a coluna de FK exibia apenas a badge sem indicar qual tabela e coluna de origem ela referencia.
* **Solução Técnica:**
  - Inserir um ícone/badge interativo `(i)` ao lado da tag `FK`.
  - Ao passar o mouse (`hover`), exibir tooltip contextual moderno com glassmorphism informando:
    `🔗 Referência: TabelaOrigem (coluna_pk) [ON DELETE CASCADE]`.

### 1.6. Criação de Relacionamentos Diretamente na Aba DER (Modelo Lógico)
* **Problema:** A aba do Modelo Lógico (DER) permitia criar tabelas e colunas, mas não permitia criar novos relacionamentos entre as tabelas diretamente por lá.
* **Solução Técnica:**
  - Adicionar botão **"+ Criar Relacionamento"** na toolbar e no cabeçalho da aba DER.
  - Modal/Diálogo Rápido do DER:
    - **Tabela Origem** (ex: `Cliente`)
    - **Tabela Destino** (ex: `Pedido`)
    - **Tipo de Relação / Cardinalidade:** `1:1`, `1:N` ou `N:N` (com geração automática de tabela associativa).
    - **Nome do Relacionamento / FK**.
  - O relacionamento criado no DER gera os elementos conceituais correspondentes no canvas MER e insere a FK / Tabela Associativa no DER em tempo real.

---

## 2. Especificação Técnica dos Módulos Impactados

| Módulo / Arquivo | Responsabilidade e Alterações Necessárias |
| :--- | :--- |
| **`js/canvas/renderer.js`** | Posicionar handles nas 4 bordas; novo cálculo de posição de cardinalidades externo à borda dos nós. |
| **`js/canvas/interaction.js`** | Iniciar arraste de conexão ao clicar em qualquer um dos 4 handles nas bordas; simplificar drag-to-connect. |
| **`js/components/context-panel.js`** | Dropdowns de troca de Entidade Origem e Destino no painel do Losango. |
| **`js/logical/logical-editor.js`** | Fix nos botões PK/COL/FK, inclusão do ícone informativo `(i)` com tooltip de referência, e botão de criação de relações no DER. |
| **`css/canvas.css` & `css/modals.css`** | Estilos para os handles nas bordas, tooltips da FK e badges interativas. |

---

## 3. Matriz de Rastreabilidade e Checklist Sequencial (#3)

| Item | Descrição da Tarefa | Módulos Envolvidos | Status |
| :---: | :--- | :--- | :---: |
| **01** | **Handles nas Bordas**: 4 portas de conexão magnética nas bordas externas das formas | `js/canvas/renderer.js`, `canvas.css` | ✅ Concluído |
| **02** | **Troca de Origem/Destino no Painel**: Dropdowns para reatribuir entidades do relacionamento | `js/components/context-panel.js` | ✅ Concluído |
| **03** | **Cálculo Preciso de Cardinalidade**: Posicionar rótulo fora da borda sem sobreposição | `js/canvas/renderer.js` | ✅ Concluído |
| **04** | **Fix dos Botões PK/FK/COL no DER**: Estabilidade e sincronização bidirecional de chaves | `js/logical/logical-editor.js` | ✅ Concluído |
| **05** | **Ícone Informativo `(i)` de FK**: Tooltip indicando tabela e coluna de origem da referência | `js/logical/logical-editor.js`, `css/canvas.css` | ✅ Concluído |
| **06** | **Criação de Relacionamentos no DER**: Modal e atalho para criar relações 1:1, 1:N e N:N no DER | `js/logical/logical-editor.js`, `js/components/toolbar.js` | ✅ Concluído |
