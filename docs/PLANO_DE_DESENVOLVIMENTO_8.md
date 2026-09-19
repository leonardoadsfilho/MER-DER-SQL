# 📐 Plano de Desenvolvimento — Relacionamentos N-ários, Atributos de Relação, Otimização DDL e Engenharia Reversa SQL (#8)

| Informação | Detalhe |
| :--- | :--- |
| **Documento** | Plano de Evolução: Relacionamentos N-ários, Atributos em Relacionamentos, Ordenação DDL, Auto Increment e Engenharia Reversa SQL (#8) |
| **Produto** | Editor de Modelo Entidade-Relacionamento (MER / DER) Conceptual, Lógico & SQL |
| **Versão** | 2.0 (Modelagem Avançada & Engenharia Reversa) |
| **Sequência** | **#8** *(Sucessor dos Planos de Desenvolvimento #1 ao #7)* |
| **Status** | 📋 Especificação & Planejamento de Execução |

---

## 📑 Sumário

1. [Objetivo Geral](#1-objetivo-geral)
2. [Detalhamento dos Requisitos e Soluções Técnicas](#2-detalhamento-dos-requisitos-e-soluções-técnicas)
   - [2.1. Relacionamentos entre Múltiplas Entidades e Geração de Entidade Intermediária no DER](#21-relacionamentos-entre-múltiplas-entidades-e-geração-de-entidade-intermediária-no-der)
   - [2.2. Criação e Suporte a Atributos em Relacionamentos](#22-criação-e-suporte-a-atributos-em-relacionamentos)
   - [2.3. Ordenação Topológica no SQL: Tabelas de Domínio Primeiro](#23-ordenação-topológica-no-sql-tabelas-de-domínio-primeiro)
   - [2.4. Auto Increment Condicional para Tipos Numéricos Inteiros](#24-auto-increment-condicional-para-tipos-numéricos-inteiros)
   - [2.5. Engenharia Reversa: Conversão de SQL (DDL) para MER e DER](#25-engenharia-reversa-conversão-de-sql-ddl-para-mer-e-der)
3. [Arquitetura e Fluxo de Transformação](#3-arquitetura-e-fluxo-de-transformação)
4. [Especificação Técnica dos Módulos Impactados](#4-especificação-técnica-dos-módulos-impactados)
5. [Matriz de Rastreabilidade e Checklist Sequencial (#8)](#5-matriz-de-rastreabilidade-e-checklist-sequencial-8)
6. [Critérios de Aceite](#6-critérios-de-aceite)

---

## 1. Objetivo Geral

Elevar a capacidade de modelagem conceitual e lógica da aplicação, viabilizando:
1. Conexão de relacionamentos com mais de duas entidades (relacionamentos ternários e N-ários) com derivação automática de tabelas associativas/intermediárias no DER contendo as Foreign Keys correspondentes;
2. Associação de atributos diretamente a relacionamentos (losangos) e sua correta propagação para o DER e para o DDL SQL;
3. Resolução automática da ordem de criação de tabelas (`CREATE TABLE`) priorizando tabelas de domínio (sem dependência de chaves estrangeiras), garantindo scripts SQL executáveis sem erros de violação de integridade referencial;
4. Inclusão inteligente da propriedade `AUTO_INCREMENT` exclusivamente em chaves primárias numéricas inteiras (excluindo decimais, textos e UUIDs);
5. Engenharia reversa completa a partir de scripts SQL DDL, reconstruindo fielmente o modelo relacional (DER) e o diagrama conceitual (MER).

---

## 2. Detalhamento dos Requisitos e Soluções Técnicas

### 2.1. Relacionamentos entre Múltiplas Entidades e Geração de Entidade Intermediária no DER

#### Situação Atual
A maioria das ferramentas e o fluxo atual assumem relacionamentos binários (entre duas entidades). A representação N:N exige convenção manual ou gera tabelas simples sem suporte explícito a 3 ou mais entidades vinculadas a um único losango de relacionamento.

#### Solução Técnica
- **No Diagrama Conceitual (MER):**
  - O elemento de relacionamento (losango) deve suportar conexões (`connections`) para $N \ge 2$ entidades distintas.
  - O painel de contexto (`ContextPanel`) do relacionamento deve permitir adicionar participantes dinamicamente, listando cada entidade conectada com seu papel e cardinalidade individual (ex: `(1,1)`, `(0,N)`, etc.).
- **No Modelo Lógico (DER):**
  - Todo relacionamento N-ário (mais de 2 entidades) ou relacionamento binário `N:N` deve gerar no DER uma **Entidade Intermediária / Tabela Associativa** (Junction Table).
  - O nome da tabela intermediária deve ser por padrão o nome do próprio relacionamento ou a composição dos nomes das entidades envolvidas (ex: `aluno_disciplina_turma`).
  - A tabela intermediária importa automaticamente as Primary Keys de todas as entidades participantes como Foreign Keys (`FK`).
  - Por padrão, a união dessas Foreign Keys compõe a Primary Key Composta (`PK, FK`) da tabela intermediária, com opção de utilizar uma chave artificial surrogate (`id`).
  - No DER, as linhas tracejadas de relacionamento conectam cada entidade de origem à tabela intermediária.

---

### 2.2. Criação e Suporte a Atributos em Relacionamentos

#### Situação Atual
Atributos no MER só podem ser vinculados diretamente a nós do tipo `entity`. Tentar ligar um nó de atributo (`attribute`) a um relacionamento (`relationship`) não é suportado ou não é interpretado pelo motor relacional.

#### Solução Técnica
- **No Canvas Conceitual (MER):**
  - Permitir conexão visual de atributos a elementos do tipo relacionamento (losango).
  - O `CanvasRenderer` deve calcular e desenhar as linhas conectoras entre o losango e as elipses de atributos vinculados a ele.
  - No `ContextPanel`, quando um relacionamento estiver selecionado, exibir uma seção **"Atributos do Relacionamento"** com campos para adicionar, renomear, tipar e excluir atributos diretamente no relacionamento.
- **No Motor Relacional (`RelationalEngine`):**
  - **Caso 1 — Relacionamento com Tabela Intermediária (N:N ou N-ário):** Os atributos do relacionamento tornam-se colunas de dados convencionais na tabela associativa gerada.
  - **Caso 2 — Relacionamento 1:N com atributos:** Os atributos do relacionamento migram para a tabela do lado "N" (lado dependente que já recebe a FK).
  - **Caso 3 — Relacionamento 1:1 com atributos:** Os atributos migram para a tabela que recebeu a chave estrangeira conforme a regra de obrigatoriedade/cardinalidade máxima.
- **No SQL (`SQLGenerator`):**
  - As colunas decorrentes dos atributos do relacionamento são declaradas com seus respectivos tipos e restrições na tabela adequada.

---

### 2.3. Ordenação Topológica no SQL: Tabelas de Domínio Primeiro

#### Situação Atual
A ordem de geração das instruções `CREATE TABLE` pode seguir a ordem de inserção no estado ou ordem alfabética, o que provoca erros de execução no SGBD (ex: MySQL/PostgreSQL) caso uma tabela com chave estrangeira seja criada antes da tabela referenciada.

#### Solução Técnica
- **Conceito de Tabela de Domínio:** Tabelas independentes, cadastros base ou dicionários de dados que **não possuem chaves estrangeiras** apontando para nenhuma outra tabela do modelo ($in\_degree = 0$ no grafo de dependência de FKs).
- **Algoritmo de Ordenação Topológica (Kahn's Algorithm / DFS):**
  1. Construir um Grafo Direcionado de Dependências onde os vértices são as tabelas e as arestas direcionadas $A \to B$ indicam que a tabela $A$ depende da tabela $B$ (ou seja, $A$ possui uma FK referenciando a PK de $B$).
  2. Identificar e emitir primeiramente todas as **Tabelas de Domínio** (tabelas com grau de dependência zero).
  3. Iterativamente resolver tabelas cujas dependências já foram emitidas.
  4. Finalizar com as tabelas de associação/intermediárias, que dependem de múltiplas entidades.
  5. **Tratamento de Dependência Circular:** Se houver ciclo (ex: Tabela $A$ referencia $B$ e $B$ referencia $A$), gerar os `CREATE TABLE` sem as constraints de FK inline e adicionar comandos `ALTER TABLE ... ADD CONSTRAINT FOREIGN KEY` ao final do script.

---

### 2.4. Auto Increment Condicional para Tipos Numéricos Inteiros

#### Situação Atual
O gerador SQL pode aplicar `AUTO_INCREMENT` indiscriminadamente em qualquer chave primária ou requerer marcação manual em tipos incompatíveis.

#### Solução Técnica
- **Regra Estrita de Tipagem:**
  - A propriedade `AUTO_INCREMENT` (MySQL/MariaDB) ou tipo correspondente (`SERIAL` / `IDENTITY`) só deve ser emitida se o tipo de dado da Primary Key for estritamente um **tipo numérico inteiro**:
    - `INT`, `INTEGER`
    - `TINYINT`, `SMALLINT`, `MEDIUMINT`, `BIGINT`
    - Suas variantes sem sinal (`UNSIGNED INT`, `INT UNSIGNED`, `BIGINT UNSIGNED`, etc.)
- **Exclusões Obrigatórias:**
  - **Tipos Decimais/Ponto Flutuante:** `DECIMAL`, `NUMERIC`, `FLOAT`, `DOUBLE`, `REAL` **nunca** devem receber `AUTO_INCREMENT`.
  - **Tipos Alfanuméricos/Texto:** `VARCHAR`, `CHAR`, `TEXT`.
  - **Identificadores Especiais:** `UUID`, `GUID`, `DATE`, `TIMESTAMP`.
  - **Chaves Primárias Compostas em Tabelas Intermediárias:** Colunas que são apenas FKs compondo a PK de uma tabela intermediária não devem receber auto incremento individual.

---

### 2.5. Engenharia Reversa: Conversão de SQL (DDL) para MER e DER

#### Situação Atual
A aplicação opera apenas no fluxo unidirecional: `MER` $\to$ `DER` $\to$ `SQL`. Não é possível colar ou importar um script SQL preexistente para gerar as visualizações conceituais e lógicas.

#### Solução Técnica
- **Localização na Interface:**
  - Na aba **SQL**, adicionar o modo **"Importar / Engenharia Reversa"** com campo de texto e botão **"Reconstruir Diagramas a partir do SQL"**.
- **Módulo SQL DDL Parser (`SQLParser`):**
  - Implementar parser robusto via expressões regulares e análise léxica para interpretar comandos:
    - `CREATE TABLE [nome]`
    - Definição de colunas: `[nome_coluna] [tipo_dado] [NULL | NOT NULL] [AUTO_INCREMENT] [PRIMARY KEY]`
    - Restrições explícitas de tabela: `PRIMARY KEY (col1, col2, ...)`
    - Restrições de chave estrangeira: `FOREIGN KEY (col) REFERENCES tabela_ref(col_pk) [ON DELETE ...] [ON UPDATE ...]`
- **Mapeamento para o DER (Modelo Lógico):**
  - Criação direta de todas as tabelas, colunas, flags PK/FK e relacionamentos direcionados com referências completas.
- **Mapeamento para o MER (Diagrama Conceitual):**
  - **Tabelas Regulares:** Convertidas em Entidades MER com seus respectivos atributos (simples e identificadores).
  - **Detecção de Tabelas Intermediárias:** Se uma tabela contiver apenas FKs (e eventuais atributos simples) e nenhuma PK isolada independente, ela é convertida de volta em um **Relacionamento (losango)** conectando as entidades referenciadas, com seus atributos associados.
  - **Foreign Keys Simples (1:N):** Convertidas em losangos de relacionamento binários entre as entidades correspondentes.
- **Auto-Layout dos Diagramas:**
  - Aplicar algoritmo de distribuição espacial (grid inteligente ou force-directed layout) para posicionar automaticamente as entidades, losangos e atributos no canvas MER e os cards no DER, evitando sobreposição de formas.

---

## 3. Arquitetura e Fluxo de Transformação

```text
┌─────────────────────────────────────────────────────────────┐
│                      FLUXO BIDIRECIONAL                     │
└─────────────────────────────────────────────────────────────┘

 FLUXO FORWARD:
  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
  │     MER     │ ───►  │     DER     │ ───►  │     SQL     │
  │ (Conceitual)│       │  (Lógico)   │       │    (DDL)    │
  └─────────────┘       └─────────────┘       └─────────────┘
   - Relações N-árias    - Tabelas intermediárias - Tabelas de Domínio primeiro
   - Atributos em        - FKs e PKs compostas    - AUTO_INCREMENT inteligente
     Relacionamentos

 REVERSE ENGINEERING:
  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
  │     SQL     │ ───►  │     DER     │ ───►  │     MER     │
  │ (Script DDL)│       │  (Lógico)   │       │ (Conceitual)│
  └─────────────┘       └─────────────┘       └─────────────┘
   - Parser DDL          - Tabelas e FKs      - Entidades e Losangos
   - Extração de chaves  - Layout DER         - Atributos vinculados
                                              - Layout automático
```

---

## 4. Especificação Técnica dos Módulos Impactados

| Módulo / Arquivo | Responsabilidade e Alterações Necessárias |
| :--- | :--- |
| **`js/services/relational-engine.js`** | 1. Suporte a relacionamentos N-ários gerando tabela intermediária com todas as FKs participantes.<br>2. Migração de atributos de relacionamentos para colunas da tabela intermediária ou tabela receptora de FK.<br>3. Identificação de chaves compostas. |
| **`js/services/sql-generator.js`** | 1. Implementação de ordenação topológica (tabelas de domínio com grau 0 geradas primeiro).<br>2. Validação estrita de tipo para `AUTO_INCREMENT` (apenas inteiros, excluindo decimais e textos).<br>3. Suporte a chaves compostas e PKs de tabelas associativas. |
| **`js/services/sql-parser.js`** *(Novo Módulo)* | 1. Parser DDL para `CREATE TABLE`, colunas, PKs, FKs e restrições.<br>2. Normalização de tipos de dados SQL.<br>3. Extração estruturada do modelo relacional a partir de texto SQL. |
| **`js/services/reverse-engineering.js`** *(Novo Módulo)* | 1. Orquestração da conversão de SQL para DER e MER.<br>2. Heurística para detectar tabelas associativas e convertê-las em relacionamentos com atributos.<br>3. Algoritmo de posicionamento automático (auto-layout) para formas no canvas MER e DER. |
| **`js/canvas/renderer.js`** | 1. Renderização de linhas de relacionamento entre losango e 3+ entidades.<br>2. Renderização de linhas conectoras de atributos vinculados a losangos de relacionamento.<br>3. Suporte ao desenho de entidades intermediárias no DER. |
| **`js/canvas/interaction.js`** | 1. Permitir arrastar e conectar atributos diretamente a nós de relacionamento.<br>2. Permitir conectar múltiplos nós de entidade ao mesmo losango de relacionamento. |
| **`js/components/context-panel.js`** | 1. Seção de "Entidades Participantes" no painel de relacionamento (para N entidades com suas cardinalidades).<br>2. Seção "Atributos do Relacionamento" para criar e gerenciar atributos de relações. |
| **`js/components/tabs.js` / Interface SQL** | 1. Interface para entrada de script SQL para Engenharia Reversa.<br>2. Botão "Importar SQL / Gerar Diagramas".<br>3. Feedback visual e mensagens de validação sintática do SQL. |
| **`js/state.js`** | 1. Atualização do modelo de dados para permitir atributos com `targetType: 'relationship'`.<br>2. Suporte a conexões de grau $N$ em relacionamentos. |

---

## 5. Matriz de Rastreabilidade e Checklist Sequencial (#8)

| Item | Descrição da Tarefa | Módulos Envolvidos | Status |
| :---: | :--- | :--- | :---: |
| **01** | **Conexão de Relacionamentos N-ários no MER**: Permitir associar 3 ou mais entidades a um único losango com cardinalidades individuais | `js/state.js`, `js/canvas/interaction.js`, `js/components/context-panel.js` | ✅ Concluído |
| **02** | **Geração de Entidade Intermediária no DER**: Derivar tabela associativa contendo as PKs das $N$ entidades participantes como FKs/PK composta | `js/services/relational-engine.js`, `js/logical/logical-editor.js` | ✅ Concluído |
| **03** | **Atributos em Relacionamentos**: Permitir adicionar atributos a losangos (visual no canvas e listagem no painel de propriedades) | `js/canvas/renderer.js`, `js/canvas/interaction.js`, `js/components/context-panel.js` | ✅ Concluído |
| **04** | **Propagação dos Atributos de Relação**: Migrar atributos do relacionamento para colunas da tabela intermediária ou tabela receptora de FK | `js/services/relational-engine.js` | ✅ Concluído |
| **05** | **Ordenação Topológica do DDL SQL**: Implementar grafo de dependências para emitir tabelas de domínio (independentes) primeiro no SQL | `js/services/sql-generator.js` | ✅ Concluído |
| **06** | **Auto Increment Restrito a Inteiros**: Aplicar `AUTO_INCREMENT` apenas em tipos inteiros numéricos (`INT`, `BIGINT`, etc.), bloqueando decimais e outros | `js/services/sql-generator.js` | ✅ Concluído |
| **07** | **Módulo SQLParser**: Desenvolver analisador sintático de scripts DDL (`CREATE TABLE`, PKs, FKs, tipos de dados) | `js/services/sql-parser.js` | ✅ Concluído |
| **08** | **Módulo de Engenharia Reversa**: Converter o AST do SQL em entidades lógicas (DER) e conceituais (MER), identificando tabelas associativas | `js/services/reverse-engineering.js` | ✅ Concluído |
| **09** | **Auto-Layout dos Diagramas Importados**: Posicionamento automático em grade/grafo para evitar sobreposição após engenharia reversa | `js/services/reverse-engineering.js`, `js/canvas/renderer.js` | ✅ Concluído |
| **10** | **Interface de Engenharia Reversa**: Área de colagem de SQL com botão "Importar SQL" e sincronização com estado global | `index.html`, `js/components/tabs.js`, `js/app.js` | ✅ Concluído |

---

## 6. Critérios de Aceite

- [x] **Relacionamentos N-ários:** O usuário consegue ligar um relacionamento a 3 ou mais entidades; o DER exibe uma tabela intermediária contendo as chaves estrangeiras de todas as entidades conectadas.
- [x] **Atributos de Relacionamento:** O usuário consegue ligar atributos a um losango; esses atributos aparecem como colunas na tabela correspondente do DER e na instrução `CREATE TABLE` do SQL.
- [x] **Ordem das Tabelas no SQL:** O SQL gerado inicia pelas tabelas de domínio (aquelas sem FK), seguidas pelas tabelas dependentes e por último as intermediárias, executando sem erro de chave estrangeira inexistente.
- [x] **Auto Increment Preciso:** Colunas PK do tipo `INT`, `BIGINT`, `INTEGER` recebem `AUTO_INCREMENT`; PKs do tipo `DECIMAL`, `NUMERIC`, `FLOAT`, `VARCHAR` ou chaves compostas de FKs **não** recebem `AUTO_INCREMENT`.
- [x] **Engenharia Reversa Funcional:** Ao colar um script DDL válido com `CREATE TABLE` e clicar em importar, a aplicação gera automaticamente:
  - O modelo relacional no DER com tabelas, colunas, PKs e FKs interligadas;
  - O diagrama conceitual no MER com entidades, losangos de relacionamento, atributos e posicionamento organizado.
