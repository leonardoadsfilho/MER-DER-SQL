/**
 * Dynamic Contextual Panel Component
 * Supports editing Source and Target entities of Relationships, properties and attributes
 * Editor de MER Conceptual v2.2
 */

class ContextPanel {
  constructor(panelElement, state, modalManager) {
    this.panel = panelElement;
    this.state = state;
    this.modals = modalManager;

    this.selectedAttrType = 'simple';
    this.isTyping = false;

    this.init();
  }

  init() {
    this.state.on('selection:changed', () => this.render());
    this.state.on('state:reset', () => this.render());
    this.state.on('element:removed', () => this.render());
    this.state.on('connection:removed', () => this.render());
    
    this.state.on('element:updated', () => {
      if (!this.isTyping) {
        this.render();
      }
    });

    this.render();
  }

  render() {
    if (this.isTyping) return;

    const selectedNodes = this.state.getSelectedElements();
    const selectedConns = this.state.getSelectedConnections();

    const totalSelected = selectedNodes.length + selectedConns.length;

    if (totalSelected === 0) {
      this.renderEmptyState();
    } else if (totalSelected === 1) {
      if (selectedNodes.length === 1) {
        const element = selectedNodes[0];
        if (element.type === 'entity') {
          this.renderEntityPanel(element);
        } else if (element.type === 'relation') {
          this.renderRelationPanel(element);
        } else if (element.type === 'attribute') {
          this.renderAttributePanel(element);
        }
      } else if (selectedConns.length === 1) {
        this.renderConnectionPanel(selectedConns[0]);
      }
    } else {
      this.renderMultiSelectPanel(selectedNodes, selectedConns);
    }
  }

  // ------------------------------------------------------------------------
  // Empty State
  // ------------------------------------------------------------------------
  renderEmptyState() {
    this.panel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          Propriedades
        </h3>
      </div>
      <div class="panel-body">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path></svg>
          </div>
          <p style="font-weight: 600; color: var(--text-main);">Nenhum elemento selecionado</p>
          <p style="font-size: var(--font-size-xs); line-height: 1.5;">Clique em uma Entidade, Linha, Relacionamento ou Atributo para editar suas propriedades.</p>
        </div>
        
        <div class="panel-section" style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
          <span class="section-label">⚡ Dicas e Atalhos</span>
          <ul style="font-size: var(--font-size-xs); color: var(--text-muted); list-style: none; display: flex; flex-direction: column; gap: 0.5rem;">
            <li>🔹 <strong>Puxar Linha:</strong> Arraste de uma porta na borda para conectar</li>
            <li>🔹 <strong>Ctrl / Shift + Clique:</strong> Seleção em grupo (inclui linhas)</li>
            <li>🔹 <strong>Ctrl + A:</strong> Selecionar todo o diagrama</li>
            <li>🔹 <strong>Clique em Linha + Delete:</strong> Exclui a conexão</li>
            <li>🔹 <strong>Espaço + Arraste:</strong> Mover o Canvas (Pan)</li>
          </ul>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------------
  // Entity Selected Panel
  // ------------------------------------------------------------------------
  renderEntityPanel(entity) {
    const attachedAttrs = this.state.getAttributesFor(entity.id);

    this.panel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">
          <span class="badge badge-pk" style="font-size: 11px;">Entidade</span>
          <span class="panel-title-text">${entity.name}</span>
        </h3>
        <button id="btn-delete-element" class="btn btn-danger btn-sm btn-icon" title="Excluir Entidade">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>

      <div class="panel-body">
        <div class="form-group">
          <label class="form-label">Nome da Entidade</label>
          <input type="text" id="input-entity-name" class="form-input" value="${entity.name}" placeholder="Ex: Cliente, Produto, Pedido" />
        </div>

        <button id="btn-quick-wizard" class="btn btn-accent btn-block" style="gap: 0.625rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          Relacionamento Rápido (Wizard)
        </button>

        <div class="quick-attribute-box">
          <span class="section-label">Adicionar Novo Atributo</span>
          
          <div class="attribute-type-pills" id="attr-type-pills">
            <button type="button" class="type-pill ${this.selectedAttrType === 'primary' ? 'active' : ''}" data-type="primary">PK (Chave)</button>
            <button type="button" class="type-pill ${this.selectedAttrType === 'simple' ? 'active' : ''}" data-type="simple">Simples</button>
            <button type="button" class="type-pill ${this.selectedAttrType === 'multivalued' ? 'active' : ''}" data-type="multivalued">Multivalorado</button>
            <button type="button" class="type-pill ${this.selectedAttrType === 'derived' ? 'active' : ''}" data-type="derived">Derivado</button>
            <button type="button" class="type-pill ${this.selectedAttrType === 'composite' ? 'active' : ''}" data-type="composite">Composto</button>
          </div>

          <div style="display: flex; gap: 0.375rem;">
            <input type="text" id="input-quick-attr-name" class="form-input" placeholder="Nome do atributo..." />
            <button type="button" id="btn-add-quick-attr" class="btn btn-primary btn-sm" style="padding: 0 0.875rem;">+ Adicionar</button>
          </div>
        </div>

        <div class="panel-section">
          <span class="section-label">
            Atributos Vinculados (${attachedAttrs.length})
          </span>
          
          <div class="attributes-list" id="attached-attrs-list">
            ${attachedAttrs.length === 0 ? `
              <p style="font-size: var(--font-size-xs); color: var(--text-muted); padding: 0.5rem 0;">Nenhum atributo cadastrado.</p>
            ` : attachedAttrs.map(attr => `
              <div class="attribute-item-row" data-attr-id="${attr.id}">
                <div class="attribute-item-name">
                  <span class="badge ${this.getBadgeClass(attr.attrType)}">${this.getBadgeLabel(attr.attrType)}</span>
                  <span>${attr.name}</span>
                </div>
                <div style="display: flex; gap: 0.25rem;">
                  <button class="btn btn-secondary btn-sm btn-icon btn-edit-attr" title="Editar Atributo">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  </button>
                  <button class="btn btn-danger btn-sm btn-icon btn-remove-attr" title="Excluir Atributo">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.bindEntityEvents(entity);
  }

  bindEntityEvents(entity) {
    const inputName = this.panel.querySelector('#input-entity-name');
    const titleText = this.panel.querySelector('.panel-title-text');

    if (inputName) {
      inputName.addEventListener('focus', () => { this.isTyping = true; });
      inputName.addEventListener('blur', () => { 
        this.isTyping = false; 
        this.state.pushSnapshot();
      });
      inputName.addEventListener('input', (e) => {
        const val = e.target.value;
        if (titleText) titleText.textContent = val;
        this.state.updateElement(entity.id, { name: val }, false, false);
        this.state.emit('change', { type: 'element:name_live', id: entity.id });
      });
    }

    const btnDelete = this.panel.querySelector('#btn-delete-element');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
        this.state.removeElement(entity.id);
      });
    }

    const btnWizard = this.panel.querySelector('#btn-quick-wizard');
    if (btnWizard) {
      btnWizard.addEventListener('click', () => {
        this.modals.openWizard(entity.id);
      });
    }

    const pills = this.panel.querySelectorAll('.type-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedAttrType = pill.getAttribute('data-type');
      });
    });

    const inputQuickAttr = this.panel.querySelector('#input-quick-attr-name');
    const btnAddQuickAttr = this.panel.querySelector('#btn-add-quick-attr');

    const handleAddAttr = () => {
      const name = inputQuickAttr.value.trim();
      this.state.addAttribute(entity.id, {
        name: name || undefined,
        attrType: this.selectedAttrType
      });
      inputQuickAttr.value = '';
      inputQuickAttr.focus();
      this.refreshAttachedAttributesList(entity.id);
    };

    if (btnAddQuickAttr) {
      btnAddQuickAttr.addEventListener('click', handleAddAttr);
    }
    if (inputQuickAttr) {
      inputQuickAttr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddAttr();
        }
      });
    }

    this.bindAttributeRowButtons();
  }

  refreshAttachedAttributesList(entityId) {
    const list = this.panel.querySelector('#attached-attrs-list');
    if (!list) return;

    const attachedAttrs = this.state.getAttributesFor(entityId);
    list.innerHTML = attachedAttrs.length === 0 ? `
      <p style="font-size: var(--font-size-xs); color: var(--text-muted); padding: 0.5rem 0;">Nenhum atributo cadastrado.</p>
    ` : attachedAttrs.map(attr => `
      <div class="attribute-item-row" data-attr-id="${attr.id}">
        <div class="attribute-item-name">
          <span class="badge ${this.getBadgeClass(attr.attrType)}">${this.getBadgeLabel(attr.attrType)}</span>
          <span>${attr.name}</span>
        </div>
        <div style="display: flex; gap: 0.25rem;">
          <button class="btn btn-secondary btn-sm btn-icon btn-edit-attr" title="Editar Atributo">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
          <button class="btn btn-danger btn-sm btn-icon btn-remove-attr" title="Excluir Atributo">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
    `).join('');

    this.bindAttributeRowButtons();
  }

  bindAttributeRowButtons() {
    this.panel.querySelectorAll('.attribute-item-row').forEach(row => {
      const attrId = row.getAttribute('data-attr-id');
      const btnRemove = row.querySelector('.btn-remove-attr');
      const btnEdit = row.querySelector('.btn-edit-attr');

      if (btnRemove) {
        btnRemove.addEventListener('click', (e) => {
          e.stopPropagation();
          this.state.removeElement(attrId);
          const parent = this.state.getSelectedElements()[0];
          if (parent) this.refreshAttachedAttributesList(parent.id);
        });
      }

      if (btnEdit) {
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          this.state.select(attrId);
        });
      }
    });
  }

  // ------------------------------------------------------------------------
  // Relationship Selected Panel with Source/Target Entity Dropdowns
  // ------------------------------------------------------------------------
  renderRelationPanel(relation) {
    const allEntities = Array.from(this.state.elements.values()).filter(el => el.type === 'entity');
    
    // Find all connections connected to this relation
    const relatedConns = this.state.connections.filter(
      c => (c.fromId === relation.id || c.toId === relation.id) && c.type !== 'attribute_link'
    );

    const conn1 = relatedConns[0] || null;
    const conn2 = relatedConns[1] || null;

    const sourceEntityId = conn1 ? (conn1.fromId === relation.id ? conn1.toId : conn1.fromId) : '';
    const targetEntityId = conn2 ? (conn2.fromId === relation.id ? conn2.toId : conn2.fromId) : '';

    this.panel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">
          <span class="badge badge-fk" style="font-size: 11px;">Relacionamento</span>
          <span class="panel-title-text">${relation.name}</span>
        </h3>
        <button id="btn-delete-element" class="btn btn-danger btn-sm btn-icon" title="Excluir Relacionamento">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>

      <div class="panel-body">
        <div class="form-group">
          <label class="form-label">Nome do Relacionamento</label>
          <input type="text" id="input-relation-name" class="form-input" value="${relation.name}" placeholder="Ex: Contém, Pertence, Realiza" />
        </div>

        <!-- Source Entity Dropdown -->
        <div class="panel-section" style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <span class="section-label" style="margin-bottom: 0.35rem;">Entidade de Origem</span>
          <div class="form-group">
            <select id="select-rel-source-entity" class="form-select">
              <option value="">-- Selecione uma Entidade --</option>
              ${allEntities.map(ent => `
                <option value="${ent.id}" ${ent.id === sourceEntityId ? 'selected' : ''}>${ent.name}</option>
              `).join('')}
            </select>
          </div>
          ${conn1 ? `
            <div class="form-group" style="margin-top: 0.35rem;">
              <label class="form-label">Cardinalidade Origem:</label>
              <select id="select-rel-source-card" class="form-select select-cardinality" data-conn-id="${conn1.id}">
                <option value="1" ${conn1.cardinalityTo === '1' ? 'selected' : ''}>1 (Um)</option>
                <option value="N" ${conn1.cardinalityTo === 'N' ? 'selected' : ''}>N (Muitos)</option>
                <option value="(0,1)" ${conn1.cardinalityTo === '(0,1)' ? 'selected' : ''}>(0,1) Opcional Um</option>
                <option value="(1,1)" ${conn1.cardinalityTo === '(1,1)' ? 'selected' : ''}>(1,1) Obrigatório Um</option>
                <option value="(0,n)" ${conn1.cardinalityTo === '(0,n)' ? 'selected' : ''}>(0,n) Opcional Muitos</option>
                <option value="(1,n)" ${conn1.cardinalityTo === '(1,n)' ? 'selected' : ''}>(1,n) Obrigatório Muitos</option>
              </select>
            </div>
          ` : ''}
        </div>

        <!-- Target Entity Dropdown -->
        <div class="panel-section" style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <span class="section-label" style="margin-bottom: 0.35rem;">Entidade de Destino</span>
          <div class="form-group">
            <select id="select-rel-target-entity" class="form-select">
              <option value="">-- Selecione uma Entidade --</option>
              ${allEntities.map(ent => `
                <option value="${ent.id}" ${ent.id === targetEntityId ? 'selected' : ''}>${ent.name}</option>
              `).join('')}
            </select>
          </div>
          ${conn2 ? `
            <div class="form-group" style="margin-top: 0.35rem;">
              <label class="form-label">Cardinalidade Destino:</label>
              <select id="select-rel-target-card" class="form-select select-cardinality" data-conn-id="${conn2.id}">
                <option value="N" ${conn2.cardinalityTo === 'N' ? 'selected' : ''}>N (Muitos)</option>
                <option value="1" ${conn2.cardinalityTo === '1' ? 'selected' : ''}>1 (Um)</option>
                <option value="(0,1)" ${conn2.cardinalityTo === '(0,1)' ? 'selected' : ''}>(0,1) Opcional Um</option>
                <option value="(1,1)" ${conn2.cardinalityTo === '(1,1)' ? 'selected' : ''}>(1,1) Obrigatório Um</option>
                <option value="(0,n)" ${conn2.cardinalityTo === '(0,n)' ? 'selected' : ''}>(0,n) Opcional Muitos</option>
                <option value="(1,n)" ${conn2.cardinalityTo === '(1,n)' ? 'selected' : ''}>(1,n) Obrigatório Muitos</option>
              </select>
            </div>
          ` : ''}
        </div>

        <button id="btn-add-rel-attr" class="btn btn-secondary btn-block">
          + Adicionar Atributo ao Relacionamento
        </button>
      </div>
    `;

    this.bindRelationEvents(relation, conn1, conn2);
  }

  bindRelationEvents(relation, conn1, conn2) {
    const inputName = this.panel.querySelector('#input-relation-name');
    const titleText = this.panel.querySelector('.panel-title-text');

    if (inputName) {
      inputName.addEventListener('focus', () => { this.isTyping = true; });
      inputName.addEventListener('blur', () => { 
        this.isTyping = false; 
        this.state.pushSnapshot();
      });
      inputName.addEventListener('input', (e) => {
        const val = e.target.value;
        if (titleText) titleText.textContent = val;
        this.state.updateElement(relation.id, { name: val }, false, false);
        this.state.emit('change', { type: 'element:name_live', id: relation.id });
      });
    }

    const btnDelete = this.panel.querySelector('#btn-delete-element');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
        this.state.removeElement(relation.id);
      });
    }

    // Change Source Entity
    const selSource = this.panel.querySelector('#select-rel-source-entity');
    if (selSource) {
      selSource.addEventListener('change', (e) => {
        const newSourceId = e.target.value;
        if (conn1) {
          this.state.removeConnection(conn1.id, false);
        }
        if (newSourceId) {
          this.state.addConnection({
            fromId: newSourceId,
            toId: relation.id,
            type: 'relationship',
            cardinalityTo: '1'
          });
        }
        this.render();
      });
    }

    // Change Target Entity
    const selTarget = this.panel.querySelector('#select-rel-target-entity');
    if (selTarget) {
      selTarget.addEventListener('change', (e) => {
        const newTargetId = e.target.value;
        if (conn2) {
          this.state.removeConnection(conn2.id, false);
        }
        if (newTargetId) {
          this.state.addConnection({
            fromId: relation.id,
            toId: newTargetId,
            type: 'relationship',
            cardinalityTo: 'N'
          });
        }
        this.render();
      });
    }

    // Change Cardinalities
    this.panel.querySelectorAll('.select-cardinality').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const connId = sel.getAttribute('data-conn-id');
        const conn = this.state.connections.find(c => c.id === connId);
        if (conn) {
          conn.cardinalityTo = e.target.value;
          this.state.emit('change', { type: 'cardinality:updated', conn });
        }
      });
    });

    const btnAddRelAttr = this.panel.querySelector('#btn-add-rel-attr');
    if (btnAddRelAttr) {
      btnAddRelAttr.addEventListener('click', () => {
        this.state.addAttribute(relation.id, { name: 'data_registro', attrType: 'simple' });
      });
    }
  }

  // ------------------------------------------------------------------------
  // Attribute Selected Panel
  // ------------------------------------------------------------------------
  renderAttributePanel(attr) {
    const parent = attr.parentId ? this.state.elements.get(attr.parentId) : null;
    const isComposite = attr.attrType === 'composite';
    const subAttrs = isComposite ? this.state.getAttributesFor(attr.id) : [];

    this.panel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">
          <span class="badge ${this.getBadgeClass(attr.attrType)}">${this.getBadgeLabel(attr.attrType)}</span>
          <span class="panel-title-text">${attr.name}</span>
        </h3>
        <button id="btn-delete-element" class="btn btn-danger btn-sm btn-icon" title="Excluir Atributo">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>

      <div class="panel-body">
        <div class="form-group">
          <label class="form-label">Nome do Atributo</label>
          <input type="text" id="input-attr-name" class="form-input" value="${attr.name}" />
        </div>

        <div class="form-group">
          <label class="form-label">Classificação do Atributo</label>
          <select id="select-attr-type" class="form-select">
            <option value="primary" ${attr.attrType === 'primary' ? 'selected' : ''}>Chave Primária (PK)</option>
            <option value="simple" ${attr.attrType === 'simple' ? 'selected' : ''}>Simples / Convencional</option>
            <option value="multivalued" ${attr.attrType === 'multivalued' ? 'selected' : ''}>Multivalorado (Ex: Telefones)</option>
            <option value="derived" ${attr.attrType === 'derived' ? 'selected' : ''}>Derivado / Calculado (Ex: Idade)</option>
            <option value="composite" ${attr.attrType === 'composite' ? 'selected' : ''}>Composto (Ex: Endereço)</option>
          </select>
        </div>

        ${isComposite ? `
          <!-- Sub-Attributes Section for Composite Attributes -->
          <div class="quick-attribute-box" style="margin-top: 0.75rem;">
            <span class="section-label">Sub-Atributos do Composto (${subAttrs.length})</span>
            <div style="display: flex; gap: 0.375rem; margin-top: 0.35rem;">
              <input type="text" id="input-sub-attr-name" class="form-input" placeholder="Ex: Rua, Número, CEP..." />
              <button type="button" id="btn-add-sub-attr" class="btn btn-primary btn-sm" style="padding: 0 0.75rem;">+ Adicionar</button>
            </div>

            <div class="attributes-list" id="sub-attrs-list" style="margin-top: 0.5rem;">
              ${subAttrs.length === 0 ? `
                <p style="font-size: var(--font-size-xs); color: var(--text-muted); padding: 0.25rem 0;">Nenhum sub-atributo adicionado.</p>
              ` : subAttrs.map(sub => `
                <div class="attribute-item-row" data-sub-id="${sub.id}">
                  <div class="attribute-item-name">
                    <span class="badge badge-simple">Sub</span>
                    <span>${sub.name}</span>
                  </div>
                  <button class="btn btn-danger btn-sm btn-icon btn-remove-sub" data-sub-id="${sub.id}" title="Excluir Sub-Atributo">✕</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${parent ? `
          <div class="form-group" style="margin-top: 0.5rem;">
            <label class="form-label">Elemento Pai Vinculado</label>
            <button id="btn-focus-parent" class="btn btn-secondary btn-block" style="justify-content: flex-start;">
              🔹 ${parent.name} (${parent.type === 'entity' ? 'Entidade' : parent.type === 'relation' ? 'Relacionamento' : 'Atributo'})
            </button>
          </div>
        ` : ''}
      </div>
    `;

    this.bindAttributeEvents(attr);
  }

  bindAttributeEvents(attr) {
    const inputName = this.panel.querySelector('#input-attr-name');
    const titleText = this.panel.querySelector('.panel-title-text');

    if (inputName) {
      inputName.addEventListener('focus', () => { this.isTyping = true; });
      inputName.addEventListener('blur', () => { 
        this.isTyping = false; 
        this.state.pushSnapshot();
      });
      inputName.addEventListener('input', (e) => {
        const val = e.target.value;
        if (titleText) titleText.textContent = val;
        this.state.updateElement(attr.id, { name: val }, false, false);
        this.state.emit('change', { type: 'element:name_live', id: attr.id });
      });
    }

    const selectType = this.panel.querySelector('#select-attr-type');
    if (selectType) {
      selectType.addEventListener('change', (e) => {
        this.state.updateElement(attr.id, { attrType: e.target.value });
        this.render();
      });
    }

    // Add Sub-attribute handler
    const inputSubName = this.panel.querySelector('#input-sub-attr-name');
    const btnAddSub = this.panel.querySelector('#btn-add-sub-attr');

    const handleAddSub = () => {
      const name = inputSubName ? inputSubName.value.trim() : '';
      if (!name) return;
      this.state.addAttribute(attr.id, {
        name: name,
        attrType: 'simple'
      });
      if (inputSubName) {
        inputSubName.value = '';
        inputSubName.focus();
      }
      this.render();
    };

    if (btnAddSub) btnAddSub.addEventListener('click', handleAddSub);
    if (inputSubName) {
      inputSubName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddSub();
        }
      });
    }

    // Remove sub-attribute
    this.panel.querySelectorAll('.btn-remove-sub').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const subId = btn.getAttribute('data-sub-id');
        this.state.removeElement(subId);
        this.render();
      });
    });

    const btnDelete = this.panel.querySelector('#btn-delete-element');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
        this.state.removeElement(attr.id);
      });
    }

    const btnParent = this.panel.querySelector('#btn-focus-parent');
    if (btnParent && attr.parentId) {
      btnParent.addEventListener('click', () => {
        this.state.select(attr.parentId);
      });
    }
  }

  // ------------------------------------------------------------------------
  // Connection Line Selected Panel
  // ------------------------------------------------------------------------
  renderConnectionPanel(conn) {
    const fromEl = this.state.elements.get(conn.fromId);
    const toEl = this.state.elements.get(conn.toId);

    const fromName = fromEl ? fromEl.name : 'Origem';
    const toName = toEl ? toEl.name : 'Destino';

    this.panel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">
          <span class="badge badge-fk" style="font-size: 11px;">Linha</span>
          Conexão
        </h3>
        <button id="btn-delete-conn" class="btn btn-danger btn-sm btn-icon" title="Excluir Linha de Conexão (Delete)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>

      <div class="panel-body">
        <div class="form-group" style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <div style="font-size: var(--font-size-xs); color: var(--text-muted); margin-bottom: 0.25rem;">Vínculo</div>
          <div style="font-weight: 700; font-size: var(--font-size-sm);">${fromName} ⟷ ${toName}</div>
        </div>

        ${conn.type !== 'attribute_link' ? `
          <div class="form-group">
            <label class="form-label">Cardinalidade da Relação</label>
            <select id="select-conn-cardinality" class="form-select">
              <option value="1" ${conn.cardinalityTo === '1' ? 'selected' : ''}>1 (Um)</option>
              <option value="N" ${conn.cardinalityTo === 'N' ? 'selected' : ''}>N (Muitos)</option>
              <option value="(0,1)" ${conn.cardinalityTo === '(0,1)' ? 'selected' : ''}>(0,1) Opcional Um</option>
              <option value="(1,1)" ${conn.cardinalityTo === '(1,1)' ? 'selected' : ''}>(1,1) Obrigatório Um</option>
              <option value="(0,n)" ${conn.cardinalityTo === '(0,n)' ? 'selected' : ''}>(0,n) Opcional Muitos</option>
              <option value="(1,n)" ${conn.cardinalityTo === '(1,n)' ? 'selected' : ''}>(1,n) Obrigatório Muitos</option>
            </select>
          </div>
        ` : `
          <p style="font-size: var(--font-size-xs); color: var(--text-muted);">Esta linha conecta o atributo à sua respectiva entidade ou relação.</p>
        `}

        <button id="btn-delete-conn-action" class="btn btn-danger btn-block" style="margin-top: 1rem;">
          Excluir Esta Linha
        </button>
      </div>
    `;

    const btnDel = this.panel.querySelector('#btn-delete-conn');
    const btnDelAct = this.panel.querySelector('#btn-delete-conn-action');
    const selCard = this.panel.querySelector('#select-conn-cardinality');

    const handleDelete = () => {
      this.state.removeConnection(conn.id);
      this.modals.showToast('Linha de conexão removida.', 'info');
    };

    if (btnDel) btnDel.addEventListener('click', handleDelete);
    if (btnDelAct) btnDelAct.addEventListener('click', handleDelete);

    if (selCard) {
      selCard.addEventListener('change', (e) => {
        conn.cardinalityTo = e.target.value;
        this.state.emit('change', { type: 'cardinality:updated', conn });
      });
    }
  }

  // ------------------------------------------------------------------------
  // Multi-Select Panel (Nodes + Connections)
  // ------------------------------------------------------------------------
  renderMultiSelectPanel(elements, connections) {
    const total = elements.length + connections.length;

    this.panel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">
          <span class="badge badge-pk">${total}</span>
          Itens Selecionados
        </h3>
        <button id="btn-delete-all-selected" class="btn btn-danger btn-sm btn-icon" title="Excluir Todos">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
      <div class="panel-body">
        <p style="font-size: var(--font-size-xs); color: var(--text-muted);">
          Você selecionou <strong>${total} itens</strong> simultaneamente usando <strong>Ctrl</strong> ou <strong>Shift</strong>.
        </p>

        <div class="panel-section">
          <span class="section-label">Itens no Grupo</span>
          <div class="attributes-list">
            ${elements.map(el => `
              <div class="attribute-item-row">
                <span style="font-weight: 600;">${el.name}</span>
                <span class="badge ${this.getBadgeClass(el.type === 'attribute' ? el.attrType : el.type)}">${el.type}</span>
              </div>
            `).join('')}
            ${connections.map(c => `
              <div class="attribute-item-row">
                <span style="font-weight: 600;">Linha de Conexão</span>
                <span class="badge badge-fk">Linha</span>
              </div>
            `).join('')}
          </div>
        </div>

        <button id="btn-bulk-delete" class="btn btn-danger btn-block">
          Excluir Todos os ${total} Itens
        </button>
      </div>
    `;

    const handleDelete = () => {
      elements.forEach(el => this.state.removeElement(el.id, false));
      connections.forEach(c => this.state.removeConnection(c.id, false));
      this.state.clearSelection();
      this.state.pushSnapshot();
      this.modals.showToast(`${total} itens excluídos.`, 'info');
    };

    const btnDel = this.panel.querySelector('#btn-delete-all-selected');
    const btnBulkDel = this.panel.querySelector('#btn-bulk-delete');
    if (btnDel) btnDel.addEventListener('click', handleDelete);
    if (btnBulkDel) btnBulkDel.addEventListener('click', handleDelete);
  }

  getBadgeClass(type) {
    switch (type) {
      case 'primary': return 'badge-pk';
      case 'multivalued': return 'badge-multivalued';
      case 'derived': return 'badge-derived';
      case 'relation': return 'badge-fk';
      default: return 'badge-simple';
    }
  }

  getBadgeLabel(type) {
    switch (type) {
      case 'primary': return 'PK';
      case 'multivalued': return 'Multi';
      case 'derived': return 'Derivado';
      case 'composite': return 'Composto';
      default: return 'Simples';
    }
  }
}

window.ContextPanel = ContextPanel;
