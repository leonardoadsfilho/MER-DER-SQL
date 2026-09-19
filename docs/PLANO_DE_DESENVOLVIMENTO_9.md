# 📐 Plano de Desenvolvimento — Importação de Arquivos .sql, Tipos de Dados Expandidos, Cascata de Remoção de FK e Interface Minimalista (#9)

| Informação | Detalhe |
| :--- | :--- |
| **Documento** | Plano de Evolução: Upload de Arquivos .sql, Tipos de Dados Avançados, Remoção Granular de FK no DER e Redesign Minimalista (#9) |
| **Produto** | Editor de Modelo Entidade-Relacionamento (MER / DER) Conceptual, Lógico & SQL |
| **Versão** | 2.1 (Refinamento de UX, Tipagem Expandida & Integridade DER) |
| **Sequência** | **#9** *(Sucessor dos Planos de Desenvolvimento #1 ao #8)* |
| **Status** | 📋 Especificação & Planejamento de Execução |

---

## 📑 Sumário

1. [Objetivo Geral](#1-objetivo-geral)
2. [Detalhamento dos Requisitos e Soluções Técnicas](#2-detalhamento-dos-requisitos-e-soluções-técnicas)
   - [2.1. Importação Direta de Arquivos .sql (Upload e Drag-and-Drop)](#21-importação-direta-de-arquivos-sql-upload-e-drag-and-drop)
   - [2.2. Expansão do Catálogo de Tipos de Dados SQL](#22-expansão-do-catálogo-de-tipos-de-dados-sql)
   - [2.3. Desconexão Granular de Relacionamentos na Exclusão de FK no DER](#23-desconexão-granular-de-relacionamentos-na-exclusão-de-fk-no-der)
   - [2.4. Redesign da Interface: Layout Minimalista e Navegação Fluida](#24-redesign-da-interface-layout-minimalista-e-navegação-fluida)
3. [Especificação Técnica dos Módulos Impactados](#3-especificação-técnica-dos-módulos-impactados)
4. [Matriz de Rastreabilidade e Checklist Sequencial (#9)](#4-matriz-de-rastreabilidade-e-checklist-sequencial-9)
5. [Critérios de Aceite](#5-critérios-de-aceite)

---

## 1. Objetivo Geral

Dar continuidade à evolução do MER Studio estabelecendo:
1. Capacidade de importar e processar arquivos físicos `.sql` via upload direto e drag-and-drop, eliminando a dependência exclusiva de copiar e colar scripts;
2. Suporte a um catálogo completo e moderno de tipos de dados SQL (numéricos inteiros e fracionários, textuais, temporais, binários, JSON e UUID) no MER, DER e DDL;
3. Sincronização granular reversa do DER para o MER: ao remover uma chave estrangeira (`FK`) em uma tabela, refletir a exclusão na conexão ou relacionamento correspondente — tratando relações N-árias de forma cirúrgica (removendo apenas o vínculo da entidade afetada);
4. Refinamento visual da interface com um design minimalista, contemporâneo e de navegação intuitiva, preservando rigorosamente todas as ferramentas e capacidades existentes.

---

## 2. Detalhamento dos Requisitos e Soluções Técnicas

### 2.1. Importação Direta de Arquivos .sql (Upload e Drag-and-Drop)

#### Situação Atual
A Engenharia Reversa atual exige que o usuário abra um arquivo `.sql` externamente em um editor de texto, copie todo o seu conteúdo e cole manualmente no textarea do modal de importação.

#### Solução Técnica
- **Input de Arquivo Nativo:**
  - Adicionar um `<input type="file" id="input-sql-file" accept=".sql,.ddl,text/plain" style="display: none;" />`.
  - Inserir botão proeminente **"Carregar Arquivo .sql"** tanto no modal de Engenharia Reversa quanto no cabeçalho de ações da aba SQL.
- **Área de Drag-and-Drop (Soltar Arquivo):**
  - No modal de importação SQL, transformar a área do editor em uma dropzone interativa com feedback visual ao arrastar arquivos (`dragover`, `dragleave`, `drop`).
- **Processamento via FileReader API:**
  - Ler o arquivo como texto (`reader.readAsText(file, 'UTF-8')`).
  - Preencher automaticamente a área de edição com o conteúdo do arquivo e acionar o processamento imediato (ou permitir revisão prévia pelo usuário antes da confirmação).
- **Tratamento de Erros e Feedback:**
  - Notificação de validação via toast indicando o nome do arquivo, tamanho e resultado do processamento.

---

### 2.2. Expansão do Catálogo de Tipos de Dados SQL

#### Situação Atual
As opções de seleção de tipo de dados nas colunas do DER e atributos do MER cobrem apenas 6 tipos básicos (`INT`, `VARCHAR(255)`, `TEXT`, `DATETIME`, `DECIMAL(10,2)`, `BOOLEAN`), limitando a precisão da modelagem para projetos reais.

#### Solução Técnica
- **Novo Catálogo Padronizado de Tipos de Dados:**
  Agrupar as opções de forma semântica e organizada:
  1. **Numéricos Inteiros:**
     - `INT` / `INTEGER`
     - `BIGINT`
     - `SMALLINT`
     - `TINYINT`
  2. **Numéricos Decimais e Precisão:**
     - `DECIMAL(10,2)`
     - `NUMERIC(12,2)`
     - `FLOAT`
     - `DOUBLE`
  3. **Textuais e Caracteres:**
     - `VARCHAR(255)`
     - `VARCHAR(100)`
     - `CHAR(36)`
     - `TEXT`
     - `LONGTEXT`
  4. **Data e Hora:**
     - `DATE`
     - `TIME`
     - `DATETIME`
     - `TIMESTAMP`
  5. **Tipos Especiais e Modernos:**
     - `BOOLEAN`
     - `UUID`
     - `JSON`
     - `BLOB`
- **Módulos Adaptados:**
  - **`LogicalEditor` (`logical-editor.js`):** Atualizar o `<select class="col-type-select">` com optgroups organizados.
  - **`ContextPanel` (`context-panel.js`):** Permitir escolher o tipo SQL diretamente na edição de atributos no MER.
  - **`RelationalEngine` (`relational-engine.js`):** Heurística refinada de adivinhação de tipos (`guessDataType`) mapeando sufixos como `_uuid` $\to$ `UUID`, `_json` / `payload` $\to$ `JSON`, `data_` $\to$ `DATE`, `hora_` $\to$ `TIME`.
  - **`SqlGenerator` (`sql-generator.js`):** Garantir que auto-increment continue restrito aos inteiros (`INT`, `BIGINT`, etc.) e nunca aplique em `UUID`, `DECIMAL`, `JSON` ou `FLOAT`.

---

### 2.3. Desconexão Granular de Relacionamentos na Exclusão de FK no DER

#### Situação Atual
Ao converter uma FK para coluna normal ou ao remover uma coluna FK no DER, o relacionamento conceitual no MER (losango ou linhas de conexão) pode ficar órfão ou desconectado de forma inconsistente, sem diferenciar relações simples de relações N-árias entre múltiplas entidades.

#### Solução Técnica
- **Mapeamento Preciso de FK para Conexão Conceitual:**
  - Cada coluna FK guarda ou infere a tabela de referência (`refTable`) e a coluna de referência (`refColumn`).
  - Ao excluir uma coluna FK no DER:
    1. **Identificar o Relacionamento:** Buscar no estado o relacionamento (`type: 'relation'`) ou conexão conceitual que originou essa chave estrangeira.
    2. **Caso A — Relacionamento Binário (2 entidades):**
       - Se a tabela do lado dependente perde sua FK de relacionamento, remover as conexões e o nó de relacionamento conceitual (losango) associado.
    3. **Caso B — Relacionamento de Múltiplas Entidades (N-ário / Associativa com 3+ participantes):**
       - Ao remover uma FK específica de uma tabela intermediária (ex: remover `fk_medicamento_cod_barras` da relação ternária `Prescricao`), remover **exclusivamente** a conexão entre o losango e a entidade desvinculada (`Medicamento`).
       - As demais conexões (ex: `Medico` e `Paciente`) e o losango `Prescricao` permanecem intactos, transformando o relacionamento em binário sem destruir todo o modelo.
    4. **Caso C — Últimas Conexões:** Se após a remoção restarem menos de 2 entidades conectadas ao losango, o sistema solicita confirmação para manter ou remover o losango remanescente.

---

### 2.4. Redesign da Interface: Layout Minimalista e Navegação Fluida

#### Situação Atual
A interface possui diversos botões agrupados de maneira densa no cabeçalho e na barra lateral, com estilos visuais herdados de várias fases de evolução, o que pode gerar ruído cognitivo.

#### Solução Técnica
- **Filosofia Minimalista e Clean:**
  - Linhas finas (`1px solid var(--border-subtle)`), tipografia nítida (Inter), paleta de cores neutras escuras/claras com destaques cromáticos sutis em azul/violeta (*accent glow*).
  - Espaçamentos consistentes baseados na escala de 8px (padding, margins, gaps).
- **Barra de Navegação Superior (App Header):**
  - Segmento central unificado para troca de abas:
    ```text
    ┌──────────────────────────────────────────────────────────────┐
    │  [● MER Studio]       [ MER  |  DER  |  SQL ]       [Theme ⚙]│
    └──────────────────────────────────────────────────────────────┘
    ```
  - Agrupamento das ações secundárias (Salvar, Carregar, Desfazer, Refazer) em um menu dropdown compacto ou botões de ícones com tooltips elegantes.
- **Barra de Status Inferior (Status Bar Minimalista):**
  - Indicadores discretos no rodapé: contagem de entidades, tabelas ativas, zoom atual e status de persistência ("● Salvo").
- **Cards do DER mais Limpos:**
  - Cabeçalhos de tabelas minimalistas com cantos arredondados discretos (`radius-md`).
  - Destaque visual suave para chaves (`PK` em dourado/amarelo suave, `FK` em ciano/azul neon sutil).
- **Área da Aba SQL:**
  - Barra de ações compacta no topo do editor de código com botões claros: "Copiar", "Baixar .sql", "Importar Arquivo" e "Colar Script".

---

## 3. Especificação Técnica dos Módulos Impactados

| Módulo / Arquivo | Responsabilidade e Alterações Necessárias |
| :--- | :--- |
| **`index.html`** | 1. Input oculto para upload de arquivos `.sql`.<br>2. Adição da dropzone e botão de arquivo no modal de importação.<br>3. Ajustes de layout para a nova barra de navegação superior e rodapé de status minimalista. |
| **`js/services/sql-parser.js`** | 1. Suporte expandido aos novos tipos de dados SQL (`BIGINT`, `SMALLINT`, `UUID`, `JSON`, `BLOB`, `DATE`, `TIME`, etc.).<br>2. Parser resiliente a declarações de charset e dialetos comuns de arquivos `.sql`. |
| **`js/services/reverse-engineering.js`** | 1. Método para importação a partir de `File` / `Blob` ou texto puro.<br>2. Mapeamento dos novos tipos para atributos no MER e colunas no DER. |
| **`js/services/relational-engine.js`** | 1. Ampliação do método `guessDataType` com suporte a UUID, JSON, DATE, TIME, BIGINT.<br>2. Manutenção da consistência de tipos expandidos durante derivações. |
| **`js/logical/logical-editor.js`** | 1. Atualização dos `<select class="col-type-select">` com optgroups dos novos tipos.<br>2. Implementação da lógica de exclusão granular de FK (desconectando apenas a entidade afetada em relações N-árias). |
| **`js/components/context-panel.js`** | 1. Dropdown de tipos SQL completos no painel de atributos do MER.<br>2. Sincronização do tipo entre MER e DER. |
| **`js/app.js`** | 1. Handlers de drag-and-drop e input file para arquivos `.sql`.<br>2. Vinculação das ações de importação direta de arquivos. |
| **`css/components.css` & `css/base.css`** | 1. Estilização da dropzone de upload de arquivos.<br>2. Refinamento visual minimalista de botões, abas, inputs e status bar. |

---

## 4. Matriz de Rastreabilidade e Checklist Sequencial (#9)

| Item | Descrição da Tarefa | Módulos Envolvidos | Status |
| :---: | :--- | :--- | :---: |
| **01** | **Upload de Arquivos .sql via Input e Dropzone**: Permitir selecionar ou arrastar arquivos `.sql` para importação automática | `index.html`, `js/app.js`, `css/components.css` | ✅ Concluído |
| **02** | **Catálogo Expandido de Tipos de Dados**: Adicionar tipos numéricos (`BIGINT`, `FLOAT`), temporais (`DATE`, `TIME`), textuais e especiais (`UUID`, `JSON`) | `js/logical/logical-editor.js`, `js/components/context-panel.js`, `js/services/sql-parser.js` | ✅ Concluído |
| **03** | **Adivinhação Inteligente de Tipos**: Atualizar `guessDataType` para inferir UUID, JSON, DATE, TIME a partir dos nomes das colunas | `js/services/relational-engine.js` | ✅ Concluído |
| **04** | **Remoção Granular de FK no DER (N-ários)**: Desconectar apenas a entidade participante associada à FK excluída em relacionamentos ternários/N-ários | `js/logical/logical-editor.js`, `js/state.js` | ✅ Concluído |
| **05** | **Remoção de FK em Relacionamentos Binários**: Remover o relacionamento e conexões correspondentes ao excluir a FK dependente no DER | `js/logical/logical-editor.js` | ✅ Concluído |
| **06** | **Redesign Minimalista do Header e Navegação**: Visual limpo, espaçamentos consistentes, abas centralizadas e botões compactos | `index.html`, `css/base.css`, `css/components.css` | ✅ Concluído |
| **07** | **Status Bar Minimalista no Rodapé**: Exibição discreta de estatísticas do diagrama e status de salvamento | `index.html`, `css/base.css`, `js/app.js` | ✅ Concluído |
| **08** | **Preservação de Todas as Funcionalidades Existentes**: Garantir integridade total de exportação PNG, auto-save, minimapa, wizard e ordenação topológica | Todos os módulos | ✅ Concluído |

---

## 5. Critérios de Aceite

- [x] **Importação de Arquivo .sql:** O usuário pode clicar em "Carregar Arquivo .sql" ou arrastar um arquivo `.sql` para a janela; o conteúdo é lido instantaneamente e os diagramas MER e DER são gerados com auto-layout.
- [x] **Tipos de Dados Abrangentes:** O `<select>` de tipo de coluna no DER e no painel de atributos do MER disponibiliza `BIGINT`, `SMALLINT`, `FLOAT`, `CHAR`, `DATE`, `TIME`, `UUID`, `JSON`, `BLOB`, gerando o DDL SQL correspondente de forma fidedigna.
- [x] **Exclusão de FK em Relações N-árias:** Ao remover uma coluna FK de uma tabela associativa com 3 ou mais conexões, apenas a conexão referente àquela entidade é removida do relacionamento conceitual; as outras entidades permanecem conectadas ao losango.
- [x] **Exclusão de FK em Relações 1:N / 1:1:** Ao remover a FK de uma tabela receptora simples, o relacionamento binário correspondente é removido do modelo conceitual.
- [x] **Estética Minimalista:** A interface exibe visual moderno, limpo, sem elementos sobrecarregados, com navegação rápida entre abas e preservação estrita de todas as operações do MER Studio.
