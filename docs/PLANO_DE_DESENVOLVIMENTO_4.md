# 📐 Plano de Desenvolvimento, Correção de Bugs e Melhorias (#4)

| Informação | Detalhe |
| :--- | :--- |
| **Documento** | Plano de Refinamentos Finais, UX de Exportação e Atributos Compostos (#4) |
| **Produto** | Editor de Modelo Entidade-Relacionamento (MER / DER) Conceptual & Lógico |
| **Versão** | **1.0** (Release Estável) |
| **Sequência** | **#4** *(Sucessor dos Planos #1, #2 e #3)* |
| **Status** | 📋 Especificação & Planejamento de Execução |

---

## 📑 Sumário
1. [Requisitos e Correções Detalhadas](#1-requisitos-e-correções-detalhadas)
   - [1.1. Modal de Relacionamento DER Vazio com Nome Dinâmico](#11-modal-de-relacionamento-der-vazio-com-nome-dinâmico)
   - [1.2. Botão "Excluir Tudo" na Aba DER](#12-botão-excluir-tudo-na-aba-der)
   - [1.3. Exportação PNG do Modelo Lógico (DER)](#13-exportação-png-do-modelo-lógico-der)
   - [1.4. Diálogo de Escolha de Diretório para Salvar PNG e JSON](#14-diálogo-de-escolha-de-diretório-para-salvar-png-e-json)
   - [1.5. Atributos Compostos com Sub-Atributos](#15-atributos-compostos-com-sub-atributos)
   - [1.6. Exclusão e Rebaixamento de PK no DER Remove Lado do Relacionamento](#16-exclusão-e-rebaixamento-de-pk-no-der-remove-lado-do-relacionamento)
   - [1.7. Ocultar Painel Lateral Direito (ContextPanel) na Aba DER](#17-ocultar-painel-lateral-direito-contextpanel-na-aba-der)
   - [1.8. Atualização de Versão para 1.0](#18-atualização-de-versão-para-10)
2. [Especificação Técnica dos Módulos Impactados](#2-especificação-técnica-dos-módulos-impactados)
3. [Matriz de Rastreabilidade e Checklist Sequencial (#4)](#3-matriz-de-rastreabilidade-e-checklist-sequencial-4)

---

## 1. Requisitos e Correções Detalhadas

### 1.1. Modal de Relacionamento DER Vazio com Nome Dinâmico
* **Problema:** O modal de criação de relacionamento no DER já vinha com a primeira tabela pré-selecionada nos campos Origem e Destino, permitindo criação sem validação completa.
* **Solução Técnica:**
  - Os campos `<select>` de **Tabela de Origem** e **Tabela de Destino** devem iniciar com a opção padrão `-- Selecione --` (value vazio), sem nenhuma tabela pré-selecionada.
  - O botão **"Criar Relacionamento"** fica desabilitado (`disabled`) até que ambas as tabelas estejam selecionadas e sejam distintas entre si.
  - O campo **Nome do Relacionamento** vem pré-preenchido com `rel_[NomeOrigem]_[NomeDestino]` e se atualiza dinamicamente conforme o usuário altera a Origem ou o Destino nos selects.
  - Se o usuário digitar manualmente um nome, esse nome sobrescreve o gerado automaticamente.

### 1.2. Botão "Excluir Tudo" na Aba DER
* **Problema:** Não existia uma forma rápida de limpar todo o modelo lógico diretamente da aba DER.
* **Solução Técnica:**
  - Adicionar botão **"🗑 Excluir Tudo"** no cabeçalho do `LogicalEditor`, ao lado dos botões existentes.
  - Ao clicar, exibir `confirm()` de confirmação: *"Tem certeza que deseja excluir todas as tabelas e relacionamentos?"*.
  - Se confirmado, chamar `this.state.clearAll()` para limpar o modelo conceitual e lógico integralmente.

### 1.3. Exportação PNG do Modelo Lógico (DER)
* **Problema:** O botão de exportar PNG só exportava o canvas SVG do diagrama conceitual (MER). Não era possível gerar uma imagem do modelo lógico (as tabelas/cards do DER).
* **Solução Técnica:**
  - Criar função `exportDerPNG()` no `LogicalEditor` ou no `ExportPngService`.
  - Usar `html2canvas` inline ou a API `Range` + `SVGForeignObject` para renderizar o conteúdo HTML do `#logical-viewport` como imagem.
  - Alternativa mais simples e robusta: gerar um canvas `<canvas>` programaticamente com desenho manual das tabelas (nomes, colunas, PKs, FKs), estilo acadêmico P&B, e exportar como `.png`.
  - Adicionar botão **"📷 Exportar PNG"** na toolbar/aba DER.

### 1.4. Diálogo de Escolha de Diretório para Salvar PNG e JSON
* **Problema:** Os arquivos PNG e JSON eram baixados automaticamente para o diretório padrão do navegador, sem perguntar ao usuário onde deseja salvar.
* **Solução Técnica:**
  - Utilizar a **File System Access API** (`window.showSaveFilePicker()`) quando disponível no navegador.
  - O diálogo nativo do SO pergunta onde salvar, permitindo escolher pasta e nome do arquivo.
  - Adicionar checkbox **"Sempre usar este diretório"** que salva a preferência no `localStorage`.
  - Se a API não estiver disponível (ex: Firefox, `file://`), manter o fallback `<a download>` padrão.

### 1.5. Atributos Compostos com Sub-Atributos
* **Problema:** Quando um atributo é marcado como tipo "Composto" (ex: Endereço), não era possível adicionar sub-atributos a ele (rua, número, cidade, CEP).
* **Solução Técnica:**
  - No `ContextPanel`, quando um atributo selecionado tiver `attrType === 'composite'`, exibir seção adicional **"Sub-Atributos do Composto"** com:
    - Lista dos sub-atributos vinculados (filhos).
    - Campo de texto + botão **"+ Adicionar Sub-Atributo"** para criar filhos.
  - No `DiagramState`, os sub-atributos são atributos normais com `parentId` apontando para o atributo composto (e não para a entidade diretamente).
  - No `CanvasRenderer`, desenhar os sub-atributos como elipses menores conectadas ao atributo composto por uma linha.
  - No `RelationalEngine`, atributos compostos são expandidos em colunas individuais (uma por sub-atributo).

### 1.6. Exclusão e Rebaixamento de PK no DER Remove Lado do Relacionamento
* **Problema:** Ao excluir uma coluna PK pelo DER ou rebaixá-la de PK para COL, o lado correspondente no relacionamento MER (a conexão e eventualmente o losango) não era removido automaticamente.
* **Solução Técnica:**
  - Quando o usuário exclui uma coluna PK diretamente no DER: além de remover o atributo do state, verificar se a PK era referenciada como FK em alguma outra tabela e, se for o caso, remover as conexões de relacionamento correspondentes no modelo conceitual.
  - Quando o usuário rebaixa PK para COL no DER: verificar e limpar referências FK que dependiam dessa PK.
  - A lógica de cascata ficará no método `handlePkDeletion(tableId, colName)` do `LogicalEditor`.

### 1.7. Ocultar Painel Lateral Direito (ContextPanel) na Aba DER
* **Problema:** Ao mudar para a aba DER (Modelo Lógico), o painel de propriedades do MER (sidebar direita) continuava visível e ocupando espaço, mesmo sem utilidade nessa aba.
* **Solução Técnica:**
  - No `TabsManager.switchTab()`, ao mudar para `logical`, setar `display: none` no `#app-context-panel`.
  - Ao voltar para `conceptual`, restaurar `display: flex` (ou block) no `#app-context-panel`.

### 1.8. Atualização de Versão para 1.0
* **Alteração:** Atualizar todas as referências de versão (HTML title, brand badge `v2.1 PRO` → `v1.0`, comentários nos JS/CSS) para **v1.0**, marcando a release estável final.

---

## 2. Especificação Técnica dos Módulos Impactados

| Módulo / Arquivo | Responsabilidade e Alterações Necessárias |
| :--- | :--- |
| **`js/logical/logical-editor.js`** | Modal com selects vazios e nome dinâmico; botão excluir tudo; exportar PNG do DER; cascata de exclusão de PK. |
| **`js/components/context-panel.js`** | Seção de sub-atributos para atributos compostos. |
| **`js/components/tabs.js`** | Ocultar/exibir `#app-context-panel` ao trocar aba. |
| **`js/canvas/renderer.js`** | Renderizar sub-atributos vinculados a atributos compostos. |
| **`js/state.js`** | Suporte a parentId de sub-atributos vinculados a atributos compostos. |
| **`js/services/export-png.js`** | Função `exportDerPNG()` para gerar imagem do modelo lógico; diálogo de salvamento com File System Access API. |
| **`js/services/storage.js`** | Diálogo de salvamento com File System Access API para JSON; checkbox "Sempre usar este diretório". |
| **`index.html`** | Atualização de version badge para `v1.0`; botões de DER na toolbar. |
| **`css/canvas.css`** | Estilos para sub-atributos compostos. |

---

## 3. Matriz de Rastreabilidade e Checklist Sequencial (#4)

| Item | Descrição da Tarefa | Módulos Envolvidos | Status |
| :---: | :--- | :--- | :---: |
| **01** | **Modal DER Vazio + Nome Dinâmico**: Selects sem pré-seleção, botão disabled até validar, nome auto-gerado `rel_Origem_Destino` | `js/logical/logical-editor.js` | ✅ Concluído |
| **02** | **Botão "Excluir Tudo" no DER**: Limpar todas as tabelas e relacionamentos com confirmação | `js/logical/logical-editor.js` | ✅ Concluído |
| **03** | **Exportação PNG do DER**: Renderizar visualmente as tabelas do modelo lógico em imagem P&B | `js/logical/logical-editor.js`, `js/services/export-png.js` | ✅ Concluído |
| **04** | **Diálogo de Escolha de Diretório**: `showSaveFilePicker()` + fallback | `js/services/export-png.js`, `js/services/storage.js` | ✅ Concluído |
| **05** | **Atributos Compostos com Sub-Atributos**: Adicionar sub-atributos a compostos, render e expansão no relacional | `js/components/context-panel.js`, `js/services/relational-engine.js`, `js/state.js` | ✅ Concluído |
| **06** | **Cascata de Exclusão/Rebaixamento de PK no DER**: Remover lado do relacionamento ao excluir ou rebaixar PK | `js/logical/logical-editor.js` | ✅ Concluído |
| **07** | **Ocultar Painel Lateral Direito na Aba DER**: Esconder `#app-context-panel` ao navegar para DER | `js/components/tabs.js` | ✅ Concluído |
| **08** | **Versão 1.0**: Atualizar todos os badges, títulos e comentários para v1.0 | `index.html`, todos os JS/CSS | ✅ Concluído |
