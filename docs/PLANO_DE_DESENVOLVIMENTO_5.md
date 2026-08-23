# 📐 Plano de Desenvolvimento, Correção de Bugs e Refinamentos de UX (#5)

| Informação | Detalhe |
| :--- | :--- |
| **Documento** | Plano de Correção de Bugs e Refinamentos de UX (#5) |
| **Produto** | Editor de Modelo Entidade-Relacionamento (MER / DER) Conceptual & Lógico |
| **Versão** | 1.0.2 |
| **Sequência** | **#5** — sucessor do plano anterior 4 |
| **Status** | 📋 Especificação & Planejamento de Execução |

---

# 📑 Sumário

1. Correções de Bugs
   - 1.1. Correção do Auto Save
   - 1.2. Correção do erro ao clicar em Primary Key na aba DER

2. Melhorias de Experiência de Uso
   - 2.1. Edição imediata do nome ao clicar em formas
   - 2.2. Remoção do menu lateral direito da aba DER
   - 2.3. Remoção do botão "Sincronizar"
   - 2.4. Remoção da estrutura de exemplo inicial

3. Melhorias da Visualização DER
   - 3.1. Linha tracejada entre Foreign Key e relacionamento
   - 3.2. Ajustes da interação com PK e FK

4. Ajustes na Geração de SQL
   - 4.1. Remoção de ENGINE=InnoDB DEFAULT CHARSET=utf8mb4

5. Módulos Impactados

6. Checklist Sequencial de Implementação

---

# 1. Correções de Bugs

## 1.1. Correção do Auto Save

### Problema

O mecanismo de salvamento automático não está funcionando corretamente.

Alterações realizadas pelo usuário no projeto podem não ser persistidas automaticamente, fazendo com que alterações recentes sejam perdidas ao atualizar a página, fechar o navegador ou abrir novamente o projeto.

### Objetivo

Garantir que qualquer modificação relevante realizada no modelo seja salva automaticamente.

O Auto Save deve funcionar tanto para o:

- Diagrama Conceitual — MER
- Modelo Lógico — DER

### Eventos que devem disparar Auto Save

O salvamento automático deverá ser acionado após alterações como:

- criação de entidade;
- criação de relacionamento;
- criação de atributo;
- alteração de nome;
- movimentação de elementos;
- exclusão de elementos;
- criação ou remoção de conexões;
- alteração de cardinalidade;
- criação de tabela;
- alteração de nome de tabela;
- criação de coluna;
- alteração do tipo de uma coluna;
- definição ou remoção de Primary Key;
- definição ou remoção de Foreign Key;
- criação ou remoção de relacionamento no DER.

### Comportamento esperado

O Auto Save não deve executar gravações excessivas durante eventos rápidos.

Deve ser utilizado `debounce` para agrupar alterações próximas.

O fluxo recomendado é:

```text
Usuário altera modelo
        ↓
state é atualizado
        ↓
evento de alteração é emitido
        ↓
Auto Save agenda persistência
        ↓
debounce
        ↓
projeto salvo
```

### Critério de aceite

1. Criar uma entidade.
2. Alterar seu nome.
3. Atualizar a página.
4. O elemento deve continuar existindo com o novo nome.

O mesmo comportamento deve funcionar na aba DER.

---

## 1.2. Correção do erro ao clicar em Primary Key na aba DER

### Problema

Existe um bug na aba DER relacionado ao clique sobre uma coluna definida como Primary Key.

Ao clicar diretamente sobre a indicação de PK ou sobre uma coluna que possui Primary Key, ocorre comportamento incorreto na interface.

### Objetivo

Garantir que PK seja apenas uma característica da coluna e não interfira no mecanismo de seleção da tabela ou coluna.

### Comportamento esperado

Ao clicar em uma coluna que possui PK:

1. A coluna deve ser selecionada normalmente.
2. Nenhuma exceção JavaScript deve ocorrer.
3. A interface não deve travar.
4. A tabela não deve perder sua seleção.
5. O DER não deve ser reconstruído incorretamente.
6. A FK/PK não deve desaparecer.
7. O usuário deve continuar podendo editar a coluna.

### Tratamento de eventos

Verificar possíveis problemas envolvendo:

```javascript
event.target
event.currentTarget
closest()
dataset
stopPropagation()
```

A lógica de seleção deve identificar a coluna independentemente do elemento interno clicado.

---

# 2. Melhorias de Experiência de Uso

## 2.1. Edição imediata do nome ao clicar em formas

### Objetivo

Tornar a edição dos elementos mais rápida e direta.

Ao clicar em uma forma, o campo correspondente ao nome deve receber foco automaticamente.

### Elementos afetados

Na aba MER:

- Entidade
- Atributo
- Relacionamento

### Fluxo esperado

```text
Usuário clica na forma
        ↓
Forma é selecionada
        ↓
Painel/contexto é atualizado
        ↓
Campo "Nome" recebe focus()
        ↓
Texto atual pode ser editado imediatamente
```

Pode ser utilizado:

```javascript
input.focus();
input.select();
```

Isso permite o fluxo:

```text
Clique → Digite o novo nome → Enter
```

### Importante

Esse comportamento não pode reintroduzir perda de foco durante a digitação. O painel não deve ser recriado a cada caractere digitado.

---

## 2.2. Remoção do menu lateral direito da aba DER

Ao entrar na aba DER, o menu lateral direito deverá ser removido/ocultado completamente.

A área destinada às tabelas deverá utilizar o espaço liberado.

A alteração não deve afetar funcionalidades necessárias da aba MER.

---

## 2.3. Remoção do botão "Sincronizar"

Remover completamente da interface o botão **Sincronizar**.

Também deverão ser removidos:

- listeners exclusivos do botão;
- funções utilizadas apenas pela sincronização manual;
- referências CSS específicas;
- mensagens relacionadas à necessidade de sincronização manual.

MER e DER devem utilizar o estado da aplicação como fonte de verdade, realizando atualizações automaticamente quando necessário.

---

## 2.4. Remoção da estrutura de exemplo inicial

A aplicação deverá iniciar com um projeto completamente vazio.

Não devem existir automaticamente:

- entidades de exemplo;
- atributos de exemplo;
- relacionamentos de exemplo;
- tabelas de exemplo;
- colunas de exemplo;
- Foreign Keys de exemplo;
- conexões de exemplo.

Caso exista um projeto salvo pelo Auto Save, ele deverá ser carregado normalmente. Caso contrário, MER e DER devem iniciar vazios.

---

# 3. Melhorias da Visualização DER

## 3.1. Linha tracejada ligando Foreign Keys

Toda Foreign Key deverá possuir uma representação gráfica ligando a FK da tabela filha à PK/coluna correspondente da tabela pai.

A linha deverá ser **tracejada**.

### Requisitos

A linha deverá:

- acompanhar o movimento das tabelas;
- recalcular sua origem e destino ao mover uma tabela;
- permanecer associada à FK correta;
- não interceptar indevidamente cliques nas tabelas;
- funcionar com múltiplas FKs;
- suportar mais de uma relação entre tabelas;
- permanecer visível em zoom e pan;
- ser removida quando a FK for removida.

Sugestão visual:

```css
stroke-dasharray: 6 4;
```

A relação deverá continuar armazenada por IDs, por exemplo:

```javascript
{
    sourceTableId: "...",
    sourceColumnId: "...",
    targetTableId: "...",
    targetColumnId: "..."
}
```

Nunca utilizar posição visual como identificador do relacionamento.

---

## 3.2. Ajustes da interação com PK e FK

PK e FK devem funcionar como propriedades das colunas.

O clique nos indicadores `PK` ou `FK` não deve impedir a seleção da coluna.

A área inteira da linha da coluna deverá funcionar como uma única região interativa.

---

# 4. Ajustes na Geração de SQL

## 4.1. Remoção de ENGINE=InnoDB DEFAULT CHARSET=utf8mb4

O SQL exportado não deverá adicionar:

```sql
ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
```

### Antes

```sql
CREATE TABLE cliente (
    id_cliente INT PRIMARY KEY,
    nome VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Depois

```sql
CREATE TABLE cliente (
    id_cliente INT PRIMARY KEY,
    nome VARCHAR(100)
);
```

Nenhuma tabela exportada deverá adicionar automaticamente `ENGINE=InnoDB` ou `DEFAULT CHARSET=utf8mb4`.

---

# 5. Especificação Técnica dos Módulos Impactados

| Módulo / Área | Alteração |
| :--- | :--- |
| `js/components/context-panel.js` | Dar foco automático ao campo de nome ao selecionar Entidade, Atributo ou Relacionamento e preservar foco durante edição. |
| `js/canvas/interaction.js` | Ajustar seleção de elementos e acionamento da edição imediata. |
| `js/canvas/renderer.js` | Garantir atualização visual sem renderização destrutiva durante edição. |
| `js/state.js` | Corrigir fluxo global de alteração e eventos utilizados pelo Auto Save. |
| Serviço de persistência / Auto Save | Implementar ou corrigir Auto Save com debounce e restauração automática. |
| `js/logical/logical-editor.js` | Corrigir clique sobre Primary Keys e Foreign Keys no DER. |
| Renderer do DER | Adicionar linhas tracejadas ligando Foreign Keys às respectivas tabelas/colunas referenciadas. |
| `js/components/tabs.js` | Ao entrar no DER, ocultar/remover o menu lateral direito quando aplicável. |
| `index.html` | Remover botão "Sincronizar" da interface. |
| Estado inicial / inicialização | Remover entidades, atributos, relacionamentos e tabelas de exemplo. |
| Gerador SQL | Remover `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` das instruções `CREATE TABLE`. |
| CSS DER | Adicionar estilização das linhas tracejadas e ajustar layout do DER sem menu lateral direito. |

---

# 6. Checklist Sequencial de Implementação

| Item | Descrição | Prioridade | Status |
| :---: | :--- | :---: | :---: |
| **01** | Corrigir Auto Save e garantir persistência automática de MER e DER | 🔴 Crítica | ⬜ Pendente |
| **02** | Corrigir bug da aba DER ao clicar em coluna/indicador Primary Key | 🔴 Crítica | ⬜ Pendente |
| **03** | Ao clicar em Entidade, abrir imediatamente a edição do nome | 🟠 Alta | ⬜ Pendente |
| **04** | Ao clicar em Atributo, abrir imediatamente a edição do nome | 🟠 Alta | ⬜ Pendente |
| **05** | Ao clicar em Relacionamento, abrir imediatamente a edição do nome | 🟠 Alta | ⬜ Pendente |
| **06** | Garantir que edição de nome não provoque perda de foco durante digitação | 🔴 Crítica | ⬜ Pendente |
| **07** | Criar linha tracejada ligando cada FK à tabela/coluna correspondente no DER | 🟠 Alta | ⬜ Pendente |
| **08** | Atualizar linhas de FK dinamicamente ao mover tabelas | 🟠 Alta | ⬜ Pendente |
| **09** | Remover botão "Sincronizar" | 🟡 Média | ⬜ Pendente |
| **10** | Remover código dependente exclusivamente da sincronização manual | 🟡 Média | ⬜ Pendente |
| **11** | Remover estrutura/modelo de exemplo carregado ao iniciar | 🟠 Alta | ⬜ Pendente |
| **12** | Garantir inicialização com projeto vazio quando não existir Auto Save | 🟠 Alta | ⬜ Pendente |
| **13** | Remover/ocultar menu lateral direito quando entrar na aba DER | 🟡 Média | ⬜ Pendente |
| **14** | Expandir canvas do DER para utilizar o espaço liberado pelo menu | 🟡 Média | ⬜ Pendente |
| **15** | Remover `ENGINE=InnoDB` do SQL gerado | 🟡 Média | ⬜ Pendente |
| **16** | Remover `DEFAULT CHARSET=utf8mb4` do SQL gerado | 🟡 Média | ⬜ Pendente |
| **17** | Validar geração de SQL após remoção das opções específicas do MySQL | 🟡 Média | ⬜ Pendente |

---

# 7. Ordem Recomendada de Execução

```text
1. Corrigir Auto Save
        ↓
2. Corrigir bug da Primary Key no DER
        ↓
3. Corrigir/garantir edição de nome sem perda de foco
        ↓
4. Implementar foco automático na edição ao clicar nas formas
        ↓
5. Implementar linhas tracejadas das Foreign Keys
        ↓
6. Remover sincronização manual
        ↓
7. Remover estrutura de exemplo
        ↓
8. Remover menu lateral direito do DER
        ↓
9. Ajustar layout do DER
        ↓
10. Ajustar geração de SQL
```

---

# 8. Critérios Gerais de Aceite

- [ ] O Auto Save persiste automaticamente alterações do usuário.
- [ ] Recarregar a página restaura corretamente o último projeto salvo.
- [ ] Clicar em uma Primary Key no DER não gera erros.
- [ ] Clicar em uma Entidade permite editar imediatamente seu nome.
- [ ] Clicar em um Atributo permite editar imediatamente seu nome.
- [ ] Clicar em um Relacionamento permite editar imediatamente seu nome.
- [ ] A digitação não perde foco durante a edição.
- [ ] Foreign Keys possuem linhas tracejadas indicando visualmente seus relacionamentos.
- [ ] As linhas acompanham as tabelas durante movimentação.
- [ ] O botão "Sincronizar" não existe mais.
- [ ] A aplicação inicia vazia quando não existir projeto salvo.
- [ ] O DER não apresenta o menu lateral direito.
- [ ] O espaço liberado pelo menu é utilizado pelo canvas DER.
- [ ] O SQL gerado não possui `ENGINE=InnoDB`.
- [ ] O SQL gerado não possui `DEFAULT CHARSET=utf8mb4`.
- [ ] MER e DER continuam consistentes após as alterações.

---

# 9. Resultado Esperado

Após a implementação deste plano, o editor deverá apresentar um fluxo mais direto de modelagem.

No MER, o usuário poderá clicar diretamente sobre Entidades, Atributos e Relacionamentos e começar imediatamente a alterar seus nomes.

No DER, as tabelas ocuparão uma área maior da tela, sem o menu lateral direito e sem necessidade de utilizar um botão manual de sincronização.

Os relacionamentos entre tabelas ficarão mais claros através de linhas tracejadas ligando visualmente Foreign Keys às respectivas referências.

A aplicação deverá iniciar limpa, sem estruturas de demonstração, respeitando apenas projetos existentes no Auto Save.

Por fim, a exportação SQL deverá gerar estruturas `CREATE TABLE` mais limpas e neutras, sem adicionar automaticamente configurações específicas como `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`.
