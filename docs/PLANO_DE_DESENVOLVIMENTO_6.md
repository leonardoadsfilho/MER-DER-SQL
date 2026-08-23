# Plano de Desenvolvimento — Reestruturação das Abas MER, DER e SQL (#6)

## 1. Objetivo geral

Reorganizar a interface para que cada aba tenha responsabilidades bem definidas:

```text
MER
├── Ferramentas de modelagem
├── Gerar PNG do MER
└── Minimapa

DER
├── Adicionar Tabela
├── Adicionar Relacionamento
├── Gerar PNG do DER
├── Excluir Tudo
├── Movimentação livre de tabelas
└── Minimapa

SQL
├── Visualização do SQL gerado
├── Copiar SQL
└── Baixar arquivo .sql
```

Ao mesmo tempo, adaptar a aplicação para mouse, touchscreen, tablets e diferentes tamanhos de tela.

---

## 2. Nova arquitetura de abas

A navegação principal deverá passar de duas para três abas:

```text
[ Diagrama Conceitual (MER) ]
[ Modelo Lógico (DER) ]
[ SQL ]
```

Atualmente existem apenas `conceptual` e `logical`. A terceira aba deverá ser adicionada ao mesmo sistema de navegação existente.

A nova aba deverá utilizar algo equivalente a:

```html
<button class="nav-tab-btn" data-tab="sql">
    SQL
</button>
```

A troca de abas deverá continuar sendo responsabilidade do componente atual de navegação/tabs, sem criar um segundo sistema paralelo.

---

## 3. Transformar SQL em uma terceira aba

### Situação atual

O SQL é aberto através do botão `Gerar SQL (DDL)` presente no `app-header`.

Também existe `Ver SQL` na lateral esquerda do DER e existe atualmente um modal para visualização do SQL.

### Novo comportamento

Remover os dois pontos de acesso anteriores.

O SQL passa a ser uma aba permanente:

```text
MER | DER | SQL
```

Ao clicar em `SQL`, deverá ser exibido o SQL correspondente ao estado atual do modelo.

Não será necessário clicar em "Gerar".

Fluxo:

```text
MER / DER alterado
       ↓
State atualizado
       ↓
Usuário abre aba SQL
       ↓
SQLGenerator lê estado atual
       ↓
SQL atualizado é exibido
```

Não duplicar a lógica existente de geração SQL.

---

## 4. Interface da nova aba SQL

A aba deverá aproveitar a implementação existente do gerador SQL.

Não duplicar a lógica de geração.

A tela deverá conter uma área principal de código e manter as ações:

- Copiar Código
- Baixar `.sql`

A área de código deve ocupar o espaço disponível da aba.

Remover a necessidade do modal SQL.

---

## 5. Remover "Gerar SQL" do `app-header`

Remover do `app-header` o botão `Gerar SQL (DDL)`.

Remover também:

- HTML do botão;
- listener associado;
- código utilizado exclusivamente para abrir o modal;
- divisores visuais que ficarem desnecessários.

Não remover o `SQLGenerator`.

Somente a forma de acesso muda.

---

## 6. Remover "Ver SQL" da lateral do DER

Remover o botão `Ver SQL` de `#toolbar-logical-tools`.

Remover também listener ou integração utilizada exclusivamente por esse botão.

A visualização SQL estará disponível somente pela nova aba `SQL`.

---

## 7. Remover os botões do `logical-editor-header`

O `logical-editor.js` atualmente renderiza dentro de `.logical-editor-header`:

```text
+ Tabela
+ Relacionamento
PNG (DER)
Sincronizar
Excluir Tudo
```

Todos esses botões deverão ser removidos do `logical-editor-header`.

Não apenas esconder via CSS.

O cabeçalho poderá continuar contendo apenas informações como nome da visão e quantidade de tabelas, ou poderá ser reduzido para maximizar o canvas.

---

## 8. Nova barra lateral esquerda do DER

A toolbar esquerda do DER deverá concentrar suas ferramentas:

```text
+ Tabela
Relacionamento
Gerar PNG
Excluir Tudo
```

Manter o padrão visual de `tool-card` utilizado atualmente.

O botão de exclusão deverá manter confirmação antes de limpar o modelo.

---

## 9. Adicionar "Relacionamento" à lateral do DER

Transferir `+ Relacionamento` do `logical-editor-header` para `#toolbar-logical-tools`.

O botão deverá continuar utilizando a funcionalidade existente equivalente a:

```javascript
openDerRelationshipDialog()
```

Não duplicar o modal ou a lógica de criação de relacionamento.

---

## 10. Transferir "Gerar PNG do DER" para a lateral

Remover `PNG (DER)` do `logical-editor-header`.

Adicionar `Gerar PNG` na lateral esquerda do DER.

Reutilizar o serviço existente de exportação DER, incluindo `exportDerPNG(...)` ou equivalente.

A exportação deverá representar as posições atuais das tabelas após a implementação do canvas móvel.

---

## 11. Transferir "Excluir Tudo" para a lateral do DER

Mover `Excluir Tudo` para a toolbar esquerda.

Fluxo:

```text
Clique
  ↓
Confirmação
  ↓
Excluir tabelas
  ↓
Excluir relacionamentos
  ↓
Atualizar state
  ↓
Auto Save
  ↓
Re-renderizar DER
```

O botão deverá ter distinção visual de ação destrutiva.

---

## 12. Transferir PNG do MER para sua barra lateral

Remover `PNG (P&B)` do `app-header`.

Adicionar `Gerar PNG` à toolbar esquerda da aba MER, junto das ferramentas existentes.

O serviço atual de exportação deverá continuar sendo utilizado.

Não criar uma segunda implementação de geração de PNG.

---

## 13. Simplificar o `app-header`

Após as alterações, o `app-header` não deverá possuir `Gerar PNG` nem `Gerar SQL`.

O cabeçalho deverá concentrar comandos globais:

```text
MER Studio

[ MER ] [ DER ] [ SQL ]

Undo
Redo

Carregar
Salvar JSON

Tema
```

---

## 14. Transformar o DER em canvas espacial

O DER atualmente utiliza `.logical-tables-grid`.

O novo DER deverá permitir posicionamento livre semelhante ao MER.

Cada tabela deverá possuir uma posição lógica persistente:

```javascript
{
    id: "...",
    name: "cliente",
    x: 420,
    y: 230
}
```

A posição deve fazer parte do estado persistente.

---

## 15. Movimentação das tabelas do DER

O usuário deverá poder clicar/tocar e arrastar uma tabela.

Fluxo:

```text
pointerdown
    ↓
identificar tabela
    ↓
capturar posição inicial
    ↓
pointermove
    ↓
atualizar x/y
    ↓
mover card
    ↓
redesenhar relacionamentos
    ↓
pointerup
    ↓
persistir posição
```

Utilizar preferencialmente Pointer Events:

```javascript
pointerdown
pointermove
pointerup
pointercancel
```

Isso deverá compartilhar a lógica entre mouse, caneta e touchscreen.

---

## 16. Não re-renderizar o DER inteiro durante drag

Durante a movimentação de uma tabela, evitar reconstruir `container.innerHTML` em cada movimento.

Isso poderia causar:

- lentidão;
- perda de eventos;
- perda de foco;
- flickering;
- problemas em touchscreen.

Durante o drag, atualizar diretamente posição/transform da tabela e as linhas relacionadas.

Persistir a posição ao final do gesto.

---

## 17. Relacionamentos tracejados acompanhando o movimento

A linha tracejada FK deverá acompanhar a movimentação livre das tabelas.

Fluxo:

```text
Tabela A move
     ↓
calcular novo anchor
     ↓
linha FK é atualizada
     ↓
Tabela B permanece
```

Separar conceitualmente as camadas:

```text
DER viewport
│
├── relationships-layer
│       ├── relation 1
│       └── relation 2
│
└── tables-layer
        ├── cliente
        ├── pedido
        └── produto
```

As linhas não deverão interceptar gestos quando não necessário.

---

## 18. Adicionar pan e zoom ao DER

O DER deverá passar a trabalhar com uma câmera semelhante ao MER.

Estado conceitual:

```javascript
derViewport = {
    x: 0,
    y: 0,
    scale: 1
}
```

Suportar:

- Pan
- Zoom
- Reset

Se a infraestrutura do MER puder ser reutilizada com segurança, reaproveitar os mecanismos necessários.

Evitar uma grande refatoração desnecessária do MER.

---

## 19. Adicionar minimapa ao DER

O DER deverá possuir seu próprio minimapa.

Ele deverá mostrar:

- todas as tabelas;
- posição relativa;
- viewport atual.

O minimapa deverá acompanhar:

- movimentação das tabelas;
- pan;
- zoom;
- criação de tabela;
- exclusão;
- relacionamentos.

Se a implementação atual do minimapa MER já permitir navegação, reutilizar o comportamento no DER quando possível.

---

## 20. Touchscreen como requisito de primeira classe

Analisar handlers atuais do MER e DER e migrar interações compatíveis para Pointer Events quando fizer sentido.

Suportar:

```text
Mouse
Touch
Stylus
```

Principalmente para:

- arrastar entidades;
- arrastar tabelas;
- pan;
- seleção;
- botões;
- modais;
- minimapa.

Usar `setPointerCapture(event.pointerId)` quando apropriado.

---

## 21. Tamanho mínimo para alvos touch

Botões e controles interativos devem possuir área adequada para toque.

Evitar controles muito pequenos como única região clicável.

Idealmente manter hit area próxima de 40–44px em interfaces touchscreen.

O ícone visual poderá ser menor, desde que a área interativa seja adequada.

---

## 22. Gestos de pan e movimentação no touchscreen

Definir comportamentos sem conflito:

```text
1 dedo sobre tabela
→ mover tabela

1 dedo sobre área vazia
→ pan do canvas

toque rápido
→ selecionar

pinch com 2 dedos
→ zoom
```

Caso pinch-to-zoom exija mudança excessiva, pelo menos garantir pan touch, botões de zoom e minimapa, mantendo arquitetura preparada para multitouch.

---

## 23. Solicitar modo horizontal em celulares/tablets

Quando detectar touchscreen + viewport em retrato, apresentar orientação ao usuário:

```text
┌───────────────────────────────────┐
│       ↻ Gire seu dispositivo      │
│                                   │
│ Para uma melhor experiência de    │
│ modelagem, utilize o dispositivo  │
│ no modo horizontal.               │
└───────────────────────────────────┘
```

Navegadores não devem ser tratados como capazes de forçar livremente a rotação.

Implementar como aviso/overlay de orientação.

Pode utilizar `@media (orientation: portrait)` em conjunto com detecção de touch.

---

## 24. Não bloquear desktop vertical desnecessariamente

O aviso não deve aparecer apenas porque uma janela desktop está vertical.

Combinar fatores como:

```javascript
navigator.maxTouchPoints > 0
```

com orientação portrait e breakpoint de largura adequado.

---

## 25. Layout responsivo mantendo proporção

A interface deverá se adaptar ao viewport sem deformar os diagramas.

Não utilizar escala X e Y diferentes.

A escala visual do canvas deverá ser uniforme.

Assim:

- retângulos continuam retângulos;
- losangos preservam proporção;
- elipses não ficam esmagadas;
- tabelas preservam proporção.

---

## 26. Responsividade da interface

Validar pelo menos:

- Desktop grande
- Desktop pequeno
- Notebook
- Tablet horizontal
- Tablet vertical → aviso de orientação
- Smartphone horizontal
- Smartphone vertical → aviso de orientação

A toolbar lateral poderá reduzir sua largura, mas seus controles devem continuar utilizáveis.

As funções não devem desaparecer silenciosamente em telas menores.

---

## 27. Usar tamanho do viewport real

Evitar dimensões rígidas para áreas principais.

Utilizar adequadamente:

```css
width: 100%;
height: 100%;
min-width
min-height
clamp()
dvh
dvw
```

Especial atenção a dispositivos móveis, onde `100vh` pode variar por causa das barras do navegador.

Preferir `100dvh` quando suportado, mantendo fallback.

---

## 28. Fit-to-screen inicial

Ao abrir MER ou DER em uma tela menor, considerar ajuste automático para que o conteúdo existente fique visível.

Fluxo:

```text
calcular bounding box dos elementos
           ↓
calcular escala disponível
           ↓
usar menor fator entre largura/altura
           ↓
centralizar
```

Sempre preservar aspect ratio e limites razoáveis de zoom.

---

## 29. Persistência das posições do DER

As posições das tabelas deverão sobreviver ao Auto Save.

Estrutura possível:

```javascript
logicalLayout: {
    tableId1: {
        x: 120,
        y: 350
    },
    tableId2: {
        x: 640,
        y: 200
    }
}
```

Não utilizar o nome da tabela como identificador permanente se IDs estiverem disponíveis.

Renomear uma tabela não pode resetar sua posição.

---

## 30. Posicionamento de novas tabelas

Novas tabelas deverão receber posição inicial automaticamente.

Evitar sobreposição em `x = 0`, `y = 0`.

Pode utilizar distribuição incremental ou algoritmo equivalente.

Depois disso, o usuário poderá reposicioná-las livremente.

---

## 31. Estado vazio do DER

Como as ações passarão para a sidebar, simplificar o estado vazio.

Em vez de botões dentro do centro, mostrar orientação semelhante a:

```text
Nenhuma tabela no modelo lógico.

Use "+ Tabela" na barra lateral para começar.
```

Manter um único local para as ações principais.

---

## 32. Arquivos e módulos com impacto esperado

### `index.html`
- terceira aba SQL;
- reorganização das toolbars;
- remover PNG/SQL do app-header;
- remover Ver SQL;
- criar viewport SQL;
- preparar container/minimapa DER.

### `js/logical/logical-editor.js`
- remover botões do header;
- implementar posições de tabelas;
- drag;
- atualização das linhas;
- integração com toolbar DER.

### `js/app.js`
- registrar novos botões laterais;
- integrar exportações;
- aba SQL;
- orientação/responsividade quando necessário.

### Componente de tabs
- adicionar estado `sql`;
- controlar MER/DER/SQL e respectivas barras laterais.

### `js/state.js`
- persistir posições/layout do DER;
- preservar integração com Auto Save.

### Serviço SQL existente
- reutilizar na nova aba SQL;
- não duplicar lógica.

### Serviço PNG existente
- reutilizar exportação MER/DER nos novos botões laterais.

### Componente de minimapa
- tornar reutilizável ou criar instância específica para DER.

### CSS
Revisar principalmente:
- `css/sidebar.css`
- `css/canvas.css`
- `css/components.css`
- `css/base.css`

para suportar canvas DER, touchscreen, orientação e responsividade.

---

## 33. Ordem recomendada de execução

```text
01. Adicionar terceira aba SQL
 ↓
02. Migrar modal SQL para viewport SQL
 ↓
03. Remover Gerar SQL do app-header
 ↓
04. Remover Ver SQL do DER
 ↓
05. Mover PNG MER para toolbar MER
 ↓
06. Remover ações do logical-editor-header
 ↓
07. Criar ações DER na sidebar
 ↓
08. Mover Novo Relacionamento
 ↓
09. Mover PNG DER
 ↓
10. Mover Excluir Tudo
 ↓
11. Criar modelo de posição das tabelas
 ↓
12. Transformar DER grid em canvas livre
 ↓
13. Implementar drag com Pointer Events
 ↓
14. Atualizar linhas FK durante drag
 ↓
15. Implementar pan/zoom DER
 ↓
16. Adicionar minimapa DER
 ↓
17. Persistir posições pelo Auto Save
 ↓
18. Adaptar MER/DER a touchscreen
 ↓
19. Criar aviso de orientação horizontal
 ↓
20. Implementar layout responsivo proporcional
 ↓
21. Validar desktop + tablet + smartphone
```

---

## 34. Critérios de aceite

- [ ] Existem três abas: MER, DER e SQL.
- [ ] `Gerar SQL` não existe mais no `app-header`.
- [ ] `PNG` não existe mais no `app-header`.
- [ ] `Ver SQL` não existe mais na toolbar DER.
- [ ] A aba SQL mostra automaticamente o SQL atual.
- [ ] É possível copiar o SQL.
- [ ] É possível baixar `.sql`.
- [ ] A lateral MER contém `Gerar PNG`.
- [ ] O `logical-editor-header` não contém botões de ação.
- [ ] A lateral DER contém `Tabela`.
- [ ] A lateral DER contém `Relacionamento`.
- [ ] A lateral DER contém `Gerar PNG`.
- [ ] A lateral DER contém `Excluir Tudo`.
- [ ] Tabelas DER podem ser arrastadas livremente.
- [ ] As posições das tabelas são persistidas.
- [ ] Renomear tabela não perde sua posição.
- [ ] Relações tracejadas acompanham a movimentação.
- [ ] DER possui pan.
- [ ] DER possui zoom.
- [ ] DER possui minimapa.
- [ ] Minimapa reflete posição de todas as tabelas.
- [ ] Mouse consegue operar MER e DER.
- [ ] Touchscreen consegue operar MER e DER.
- [ ] Drag utiliza Pointer Events ou solução unificada equivalente.
- [ ] A interface apresenta aviso de orientação em smartphones/tablets touch em modo retrato.
- [ ] O aviso desaparece em modo horizontal.
- [ ] Desktop não recebe aviso indevido.
- [ ] Interface adapta-se à resolução disponível.
- [ ] Diagramas mantêm proporção ao redimensionar.
- [ ] Não existem distorções horizontais/verticais.
- [ ] Nenhuma funcionalidade existente de PK/FK é perdida.
- [ ] Auto Save continua funcionando.
- [ ] Exportação de PNG continua funcionando para MER e DER.
- [ ] Geração SQL continua utilizando o gerador existente.

---

## 35. Resultado arquitetônico esperado

```text
                    MER Studio
       ┌────────┬────────┬────────┐
       │  MER   │  DER   │  SQL   │
       └────────┴────────┴────────┘


MER                    DER                    SQL
────────               ────────               ─────────

Entidade               Tabela                 CREATE TABLE...
Relação                 Relacionamento
Atributo                Gerar PNG
                        Excluir Tudo
Gerar PNG

Canvas                  Canvas
Pan / Zoom              Pan / Zoom
Minimapa                Minimapa
```

O DER deixa de ser essencialmente um `logical-tables-grid` e passa a ser uma superfície espacial, semelhante conceitualmente ao canvas MER.

Essa mudança deve ser tratada como uma alteração estrutural e não apenas visual, pois movimentação das tabelas, linhas FK tracejadas, pan/zoom, minimapa, touchscreen e persistência de posições dependem do mesmo modelo espacial.
