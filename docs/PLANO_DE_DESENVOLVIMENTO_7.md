# Plano de Desenvolvimento — Melhoria de Responsividade e Usabilidade Mobile (#7)

## 1. Objetivo geral

Melhorar a experiência de uso da aplicação em dispositivos móveis (smartphones e tablets) e telas pequenas, garantindo que todas as funcionalidades do MER Studio sejam acessíveis, intuitivas e agradáveis através de interações de toque (touch) e layouts adaptativos.

---

## 2. Nova disposição da barra de ferramentas (Toolbar) no Mobile

### Situação atual
A barra lateral de ferramentas (`app-toolbar`) fica à esquerda e reduz o espaço útil do canvas em telas pequenas.

### Novo comportamento
Em dispositivos com telas pequenas (ex: `< 768px`), a barra de ferramentas deverá se transformar em uma barra inferior flutuante (Bottom Navigation) ou uma barra retrátil.
- O canvas deverá ocupar 100% da largura disponível.
- As ferramentas de adição (Entidade, Relação, Atributo) devem ser de fácil acesso com o polegar.
- Ferramentas menos comuns (Gerar PNG, Limpar) podem ser movidas para um menu expansível (hamburger menu) ou um sub-menu.

---

## 3. Painel de Contexto (Context Panel) Adaptável

### Situação atual
O painel da direita (`app-context-panel`) que edita propriedades de entidades/relacionamentos divide a tela, apertando muito o canvas no mobile.

### Novo comportamento
No mobile, o painel de contexto não deve "espremer" o canvas.
- O painel deve abrir como um **Bottom Sheet** (gaveta inferior que sobe pela tela) ou um modal cobrindo total ou parcialmente a tela.
- O usuário deve poder arrastar o Bottom Sheet para baixo para fechá-lo ou usar um botão de fechar proeminente.
- Isso permitirá editar as propriedades sem perder completamente o contexto visual do diagrama.

---

## 4. Interações Multitouch Avançadas no Canvas

### Pinch-to-Zoom
Implementar suporte nativo a gestos de "Pinch-to-Zoom" (pinça com dois dedos) para ampliar ou reduzir o zoom do diagrama tanto no MER quanto no DER.
- Mapear os eventos de `touch` e `pointer` para calcular a distância entre os dedos e ajustar o `derViewport.scale` de forma suave.

### Pan com Dois Dedos ou Arraste Livre
- Permitir arrastar a tela do canvas de forma fluida usando um dedo na área vazia, ou dois dedos se a movimentação de elementos já estiver usando um dedo.

### Tap e Long Press (Toque Longo)
- Toque simples (Tap) para selecionar um elemento.
- Toque longo (Long Press) pode abrir opções de contexto rápido (ex: Excluir, Duplicar) sem precisar abrir todo o painel lateral.

---

## 5. Refinamento de Modais e Diálogos

### Modal "Relacionamento Rápido (Wizard)"
- Atualmente tem largura máxima estática.
- No mobile, o modal deve expandir para ocupar toda a largura da tela (com pequenas margens) ou se transformar em uma visualização de tela cheia, facilitando o preenchimento de inputs de texto sem que o teclado virtual quebre o layout.

---

## 6. Otimização do Minimapa no Mobile

### Situação atual
O minimapa fica flutuando na parte inferior direita, podendo sobrepor conteúdo importante.

### Novo comportamento
No mobile, o minimapa deve ser:
- Ocultado por padrão para economizar espaço de tela.
- Acessível através de um botão discreto para visualização rápida (toggling).
- Alternativamente, pode ser minimizado a um ícone que se expande ao ser tocado.

---

## 7. Ajustes de Tipografia e Área de Toque (Hit Areas)

- Garantir que todos os botões e ícones interativos (`btn`, `tool-card`) possuam dimensões mínimas de 44x44 pixels em dispositivos touch para evitar toques acidentais.
- Aumentar levemente o tamanho base das fontes (`var(--font-size-base)`) no mobile para melhorar a legibilidade sem a necessidade de zoom no navegador.
- Revisar os inputs textuais para evitar zoom automático nos sistemas operacionais (como iOS) usando `font-size: 16px` no mínimo para `<input>` e `<select>`.

---

## 8. Tratamento do Teclado Virtual (On-Screen Keyboard)

- Durante a edição de nomes de entidades ou no preenchimento de modais, o surgimento do teclado virtual muitas vezes esconde o conteúdo (problema do 100vh em navegadores móveis).
- Adotar extensamente variáveis de ambiente mais modernas como `100dvh` (Dynamic Viewport Height) para garantir que a interface se redimensione corretamente quando a barra de endereços do navegador e o teclado aparecerem/sumirem.

---

## 9. Interface da Aba SQL em Mobile

- A área de visualização (`textarea`) do SQL precisa consumir o máximo de espaço.
- O botão de "Copiar Código" deve ter destaque para facilitar o uso da interface como um gerador instantâneo a ser colado em outras aplicações via mobile.

---

## 10. Arquivos e módulos com impacto esperado

### CSS
- `css/base.css`: Adição de `dvh`, ajustes nas tipografias e regras focadas no teclado.
- `css/components.css`: Estilização do *Bottom Sheet* para o painel de propriedades. Aumentar hit areas.
- `css/sidebar.css`: Regras para transformar a toolbar esquerda em bottom navigation em telas menores.

### JavaScript
- `js/canvas/interaction.js`: Implementação de suporte a gestos pinch-to-zoom e long-press.
- `js/components/context-panel.js`: Lógica para transformar o painel num Bottom Sheet no mobile.
- `js/components/minimap.js`: Lógica para colapsar o minimapa no mobile.

### HTML
- `index.html`: Possível adição de wrappers estruturais para melhor comportamento do bottom sheet e menu expansível de ferramentas.

---

## 11. Ordem recomendada de execução

1. Configuração do CSS base para uso de `dvh` e proteção de zoom em inputs.
2. Refatoração da Toolbar Esquerda para se tornar Bottom Navigation no mobile.
3. Transformar o Context Panel (Painel da Direita) em um Bottom Sheet.
4. Ajustes nos Modais (tela cheia/responsivos) para o mobile.
5. Melhoria do minimapa (auto-ocultar ou colapsar no mobile).
6. Implementação de interações avançadas no canvas (Pinch-to-zoom).
7. Testes e refinamento de tipografia / áreas de toque.
8. Validação fina em emuladores e dispositivos físicos.

---

## 12. Critérios de aceite

- [ ] Barra de ferramentas lateral torna-se inferior/retrátil em telas < 768px.
- [ ] Painel de edição de propriedades não espreme o canvas; age como um *Bottom Sheet* móvel no celular.
- [ ] O usuário consegue usar gesto de pinça para aplicar zoom (pinch-to-zoom).
- [ ] Modais de wizard ocupam melhor o espaço no mobile, não quebrando com o teclado virtual.
- [ ] Todas as áreas interativas têm área mínima segura de toque (~44px).
- [ ] Inputs não forçam zoom automático do navegador (iOS).
- [ ] O layout principal e canvas redimensionam corretamente usando `dvh`.
- [ ] O minimapa não obstrui áreas úteis no mobile de forma invasiva.
