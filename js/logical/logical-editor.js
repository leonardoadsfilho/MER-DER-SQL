/**
 * Interactive Logical Model (DER / Relational Tables) Editor
 * Full CRUD, DER Relationship Creator (empty modal + auto name), Export DER PNG, Delete All,
 * PK cascading deletion/demotion
 * Editor de MER v1.0
 */

class LogicalEditor {
  constructor(containerElement, state, relationalEngine, sqlGenerator, modalManager, exportPngService) {
    this.container = containerElement;
    this.state = state;
    this.relational = relationalEngine;
    this.sqlGen = sqlGenerator;
    this.modals = modalManager;
    this.exportPng = exportPngService;

    this.tables = [];
    this.selectedTableIndex = null;
    this.userEditedRelName = false;

    this.init();
  }

  init() {
    this.state.on('change', () => this.syncFromState());
    this.state.on('state:reset', () => this.syncFromState());
    this.syncFromState();
  }

  syncFromState() {
    this.tables = this.relational.generateRelationalSchema(this.state);
    this.render();
  }

  render() {
    if (!this.container) return;

    if (this.tables.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state" style="margin-top: 5rem;">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          </div>
          <h3 style="font-weight: 700;">Nenhuma Tabela no Modelo Lógico</h3>
          <p style="font-size: var(--font-size-xs); max-width: 380px; text-align: center;">
            Crie Entidades no <strong>Diagrama Conceitual</strong> ou adicione uma nova tabela relacional manualmente pelo botão abaixo.
          </p>
          <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
            <button id="btn-add-table-empty" class="btn btn-primary">+ Criar Nova Tabela</button>
            <button id="btn-create-rel-empty" class="btn btn-accent">+ Novo Relacionamento</button>
          </div>
        </div>
      `;
      const btnEmpty = this.container.querySelector('#btn-add-table-empty');
      if (btnEmpty) btnEmpty.addEventListener('click', () => this.addNewTable());
      const btnRelEmpty = this.container.querySelector('#btn-create-rel-empty');
      if (btnRelEmpty) btnRelEmpty.addEventListener('click', () => this.openDerRelationshipDialog());
      return;
    }

    this.container.innerHTML = `
      <div class="logical-editor-header">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <h2 style="font-size: var(--font-size-lg); font-weight: 700;">Esquema Lógico Relacional (DER)</h2>
          <span class="badge badge-pk">${this.tables.length} Tabelas</span>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button id="btn-add-table-top" class="btn btn-primary btn-sm">+ Tabela</button>
          <button id="btn-create-rel-top" class="btn btn-accent btn-sm">+ Relacionamento</button>
          <button id="btn-export-der-png" class="btn btn-secondary btn-sm" title="Exportar PNG do Modelo Lógico (P&B)">📷 PNG (DER)</button>
          <button id="btn-sync-mer" class="btn btn-secondary btn-sm" title="Sincronizar com o Diagrama MER">🔄 Sincronizar</button>
          <button id="btn-clear-der" class="btn btn-danger btn-sm" title="Excluir todas as tabelas e relacionamentos">🗑 Excluir Tudo</button>
        </div>
      </div>

      <div class="logical-tables-grid">
        ${this.tables.map((table, tIndex) => `
          <div class="logical-table-card" data-table-idx="${tIndex}">
            <div class="logical-table-header">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                <span style="font-size: 16px;">📁</span>
                <input type="text" class="table-name-input" value="${table.name}" data-table-idx="${tIndex}" />
              </div>
              <div style="display: flex; align-items: center; gap: 0.25rem;">
                <span class="badge ${table.isAssociative ? 'badge-fk' : 'badge-pk'}">${table.isAssociative ? 'Pivot' : 'Tabela'}</span>
                <button class="btn btn-danger btn-sm btn-icon btn-delete-table" data-table-idx="${tIndex}" title="Excluir Tabela">✕</button>
              </div>
            </div>

            <div class="logical-columns-container">
              ${table.columns.map((col, cIndex) => `
                <div class="logical-col-item">
                  <div style="display: flex; align-items: center; gap: 0.35rem; flex: 1;">
                    <button class="btn-toggle-pk ${col.isPk ? 'active' : ''}" data-table-idx="${tIndex}" data-col-idx="${cIndex}" title="Alternar PK / COL">
                      ${col.isPk ? 'PK' : 'COL'}
                    </button>
                    ${col.isFk ? `
                      <span class="badge badge-fk" style="font-size: 9px;">FK</span>
                      <span class="fk-info-badge" data-tooltip="Referência: ${col.refTable || '?'}(${col.refColumn || '?'})" title="Referência: ${col.refTable || '?'}(${col.refColumn || '?'})">ℹ</span>
                    ` : ''}
                    <input type="text" class="col-name-input" value="${col.name}" data-table-idx="${tIndex}" data-col-idx="${cIndex}" />
                  </div>

                  <select class="col-type-select" data-table-idx="${tIndex}" data-col-idx="${cIndex}">
                    <option value="INT" ${col.type === 'INT' ? 'selected' : ''}>INT</option>
                    <option value="VARCHAR(255)" ${col.type.startsWith('VARCHAR') ? 'selected' : ''}>VARCHAR(255)</option>
                    <option value="TEXT" ${col.type === 'TEXT' ? 'selected' : ''}>TEXT</option>
                    <option value="DATETIME" ${col.type === 'DATETIME' ? 'selected' : ''}>DATETIME</option>
                    <option value="DECIMAL(10,2)" ${col.type.startsWith('DECIMAL') ? 'selected' : ''}>DECIMAL(10,2)</option>
                    <option value="BOOLEAN" ${col.type === 'BOOLEAN' ? 'selected' : ''}>BOOLEAN</option>
                  </select>

                  <button class="btn-delete-col" data-table-idx="${tIndex}" data-col-idx="${cIndex}" title="Remover Coluna">✕</button>
                </div>
              `).join('')}
            </div>

            <div class="logical-table-footer">
              <button class="btn btn-outline btn-sm btn-block btn-add-col" data-table-idx="${tIndex}">
                + Nova Coluna
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- DER Relationship Modal -->
      <div id="modal-der-rel" class="modal-backdrop">
        <div class="modal-container" style="max-width: 480px;">
          <div class="modal-header">
            <h2 class="modal-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 3 21 12 12 21 3 12"></polygon></svg>
              Criar Relacionamento no DER
            </h2>
            <button class="btn btn-outline btn-sm btn-icon" id="btn-close-der-rel" title="Fechar">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Tabela de Origem (Lado 1):</label>
              <select id="der-rel-source" class="form-select">
                <option value="">-- Selecione a Origem --</option>
                ${this.tables.map(t => `<option value="${t.name}">${t.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Tabela de Destino:</label>
              <select id="der-rel-target" class="form-select">
                <option value="">-- Selecione o Destino --</option>
                ${this.tables.map(t => `<option value="${t.name}">${t.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Tipo de Cardinalidade:</label>
              <select id="der-rel-type" class="form-select">
                <option value="1:N">1 : N (Um para Muitos - FK na tabela destino)</option>
                <option value="N:N">N : N (Muitos para Muitos - Tabela Associativa)</option>
                <option value="1:1">1 : 1 (Um para Um - Chave Única)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Nome da Relação:</label>
              <input type="text" id="der-rel-name" class="form-input" placeholder="Preenchido automaticamente..." />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-cancel-der-rel">Cancelar</button>
            <button class="btn btn-accent" id="btn-confirm-der-rel" disabled>Criar Relacionamento</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // ---- Header Buttons ----
    const btnAddTop = this.container.querySelector('#btn-add-table-top');
    if (btnAddTop) btnAddTop.addEventListener('click', () => this.addNewTable());

    const btnCreateRelTop = this.container.querySelector('#btn-create-rel-top');
    if (btnCreateRelTop) btnCreateRelTop.addEventListener('click', () => this.openDerRelationshipDialog());

    const btnExportDer = this.container.querySelector('#btn-export-der-png');
    if (btnExportDer) {
      btnExportDer.addEventListener('click', async () => {
        try {
          this.modals.showToast('Renderizando PNG do Modelo Lógico...', 'info', 1500);
          await this.exportPng.exportDerPNG(this.tables, 'modelo-logico-der.png');
          this.modals.showToast('PNG do DER exportado com sucesso!', 'success');
        } catch (err) {
          this.modals.showToast('Erro ao exportar PNG: ' + err.message, 'error');
        }
      });
    }

    const btnSync = this.container.querySelector('#btn-sync-mer');
    if (btnSync) {
      btnSync.addEventListener('click', () => {
        this.syncFromState();
        this.modals.showToast('Modelo sincronizado com o MER!', 'success');
      });
    }

    const btnClear = this.container.querySelector('#btn-clear-der');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja excluir TODAS as tabelas e relacionamentos?')) {
          this.state.clearAll();
          this.modals.showToast('Modelo inteiramente limpo.', 'info');
        }
      });
    }

    // ---- Modal DER Relationship ----
    const modalRel = this.container.querySelector('#modal-der-rel');
    const btnCloseRel = this.container.querySelector('#btn-close-der-rel');
    const btnCancelRel = this.container.querySelector('#btn-cancel-der-rel');
    const btnConfirmRel = this.container.querySelector('#btn-confirm-der-rel');
    const selSource = this.container.querySelector('#der-rel-source');
    const selTarget = this.container.querySelector('#der-rel-target');
    const inputRelName = this.container.querySelector('#der-rel-name');

    const closeDerModal = () => {
      if (modalRel) modalRel.classList.remove('active');
      this.userEditedRelName = false;
    };

    if (btnCloseRel) btnCloseRel.addEventListener('click', closeDerModal);
    if (btnCancelRel) btnCancelRel.addEventListener('click', closeDerModal);

    // Auto-update name and validate
    const updateRelState = () => {
      const srcVal = selSource ? selSource.value : '';
      const tgtVal = selTarget ? selTarget.value : '';
      const isValid = srcVal !== '' && tgtVal !== '' && srcVal !== tgtVal;

      if (btnConfirmRel) btnConfirmRel.disabled = !isValid;

      if (!this.userEditedRelName && inputRelName && srcVal && tgtVal) {
        inputRelName.value = `rel_${srcVal}_${tgtVal}`;
      }
    };

    if (selSource) selSource.addEventListener('change', updateRelState);
    if (selTarget) selTarget.addEventListener('change', updateRelState);

    if (inputRelName) {
      inputRelName.addEventListener('input', () => {
        this.userEditedRelName = true;
      });
    }

    if (btnConfirmRel) {
      btnConfirmRel.addEventListener('click', () => {
        const srcName = selSource.value;
        const tgtName = selTarget.value;
        const relType = this.container.querySelector('#der-rel-type').value;
        const relNameVal = inputRelName.value.trim();
        const relName = relNameVal || `rel_${srcName}_${tgtName}`;

        this.createRelationshipFromDER(srcName, tgtName, relType, relName);
        closeDerModal();
      });
    }

    // ---- Table CRUD ----
    this.container.querySelectorAll('.table-name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const tIdx = parseInt(e.target.dataset.tableIdx, 10);
        if (this.tables[tIdx]) {
          this.tables[tIdx].name = e.target.value.trim() || 'Tabela';
          if (this.tables[tIdx].id) {
            this.state.updateElement(this.tables[tIdx].id, { name: this.tables[tIdx].name });
          }
        }
      });
    });

    this.container.querySelectorAll('.btn-delete-table').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tIdx = parseInt(e.target.dataset.tableIdx, 10);
        const table = this.tables[tIdx];
        if (table && table.id) {
          this.state.removeElement(table.id);
        } else {
          this.tables.splice(tIdx, 1);
          this.render();
        }
      });
    });

    this.container.querySelectorAll('.btn-add-col').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tIdx = parseInt(e.target.dataset.tableIdx, 10);
        const table = this.tables[tIdx];
        if (table) {
          if (table.id) {
            this.state.addAttribute(table.id, {
              name: `coluna_${table.columns.length + 1}`,
              attrType: 'simple'
            });
          } else {
            table.columns.push({
              name: `coluna_${table.columns.length + 1}`,
              type: 'VARCHAR(255)',
              isPk: false,
              isFk: false
            });
            this.render();
          }
        }
      });
    });

    // Toggle PK with cascading FK cleanup
    this.container.querySelectorAll('.btn-toggle-pk').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tIdx = parseInt(e.target.dataset.tableIdx, 10);
        const cIdx = parseInt(e.target.dataset.colIdx, 10);
        const table = this.tables[tIdx];
        if (table && table.columns[cIdx]) {
          const col = table.columns[cIdx];
          const wasPk = col.isPk;
          col.isPk = !col.isPk;

          if (table.id) {
            const attrs = this.state.getAttributesFor(table.id);
            const matchedAttr = attrs.find(a =>
              a.name.toLowerCase() === col.name.toLowerCase() ||
              a.name.replace(/^\*/, '').toLowerCase() === col.name.toLowerCase()
            );
            if (matchedAttr) {
              this.state.updateElement(matchedAttr.id, { attrType: col.isPk ? 'primary' : 'simple' });
            }
          }

          // If demoting PK -> COL, cascade: remove FK references in other tables
          if (wasPk && !col.isPk) {
            this.handlePkDemotion(table.name, col.name);
          }

          this.render();
        }
      });
    });

    // Rename Column
    this.container.querySelectorAll('.col-name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const tIdx = parseInt(e.target.dataset.tableIdx, 10);
        const cIdx = parseInt(e.target.dataset.colIdx, 10);
        const table = this.tables[tIdx];
        if (table && table.columns[cIdx]) {
          const oldName = table.columns[cIdx].name;
          const newName = e.target.value.trim() || 'coluna';
          table.columns[cIdx].name = newName;
          if (table.id) {
            const attrs = this.state.getAttributesFor(table.id);
            const matchedAttr = attrs.find(a => a.name === oldName || a.name.replace(/^\*/, '') === oldName);
            if (matchedAttr) {
              this.state.updateElement(matchedAttr.id, { name: newName });
            }
          }
        }
      });
    });

    // Change Column Type
    this.container.querySelectorAll('.col-type-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const tIdx = parseInt(e.target.dataset.tableIdx, 10);
        const cIdx = parseInt(e.target.dataset.colIdx, 10);
        if (this.tables[tIdx] && this.tables[tIdx].columns[cIdx]) {
          this.tables[tIdx].columns[cIdx].type = e.target.value;
        }
      });
    });

    // Delete Column (with PK cascade)
    this.container.querySelectorAll('.btn-delete-col').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tIdx = parseInt(e.target.dataset.tableIdx, 10);
        const cIdx = parseInt(e.target.dataset.colIdx, 10);
        const table = this.tables[tIdx];
        if (table) {
          const col = table.columns[cIdx];

          // If deleting a PK column, cascade FK removals
          if (col.isPk) {
            this.handlePkDemotion(table.name, col.name);
          }

          if (table.id) {
            const attrs = this.state.getAttributesFor(table.id);
            const matchedAttr = attrs.find(a => a.name === col.name || a.name.replace(/^\*/, '') === col.name);
            if (matchedAttr) {
              this.state.removeElement(matchedAttr.id);
            }
          } else {
            table.columns.splice(cIdx, 1);
            this.render();
          }
        }
      });
    });
  }

  /**
   * When a PK is demoted or deleted, find FK columns in other tables
   * that reference this PK and remove the corresponding relationships
   */
  handlePkDemotion(tableName, pkColName) {
    // Find connections where this table's PK was the source of an FK in another table
    const entities = Array.from(this.state.elements.values()).filter(el => el.type === 'entity');
    const sourceEntity = entities.find(el => this.relational.sanitizeIdentifier(el.name) === tableName);

    if (!sourceEntity) return;

    // Find relations connected to this entity
    const relConns = this.state.connections.filter(
      c => (c.fromId === sourceEntity.id || c.toId === sourceEntity.id) && c.type !== 'attribute_link'
    );

    // Remove relationships connected to this entity's side
    relConns.forEach(conn => {
      const relId = conn.fromId === sourceEntity.id ? conn.toId : conn.fromId;
      const relEl = this.state.elements.get(relId);
      if (relEl && relEl.type === 'relation') {
        this.state.removeElement(relId, false);
      }
    });

    this.state.pushSnapshot();
  }

  openDerRelationshipDialog() {
    const modalRel = this.container.querySelector('#modal-der-rel');
    if (!modalRel) return;

    // Reset all fields
    const selSource = modalRel.querySelector('#der-rel-source');
    const selTarget = modalRel.querySelector('#der-rel-target');
    const inputRelName = modalRel.querySelector('#der-rel-name');
    const btnConfirm = modalRel.querySelector('#btn-confirm-der-rel');

    if (selSource) selSource.value = '';
    if (selTarget) selTarget.value = '';
    if (inputRelName) inputRelName.value = '';
    if (btnConfirm) btnConfirm.disabled = true;
    this.userEditedRelName = false;

    modalRel.classList.add('active');
  }

  createRelationshipFromDER(srcName, tgtName, relType, relName) {
    if (srcName === tgtName) {
      this.modals.showToast('Selecione duas tabelas distintas para relacionar.', 'error');
      return;
    }

    let srcEl = Array.from(this.state.elements.values()).find(el => el.name.toLowerCase() === srcName.toLowerCase() && el.type === 'entity');
    let tgtEl = Array.from(this.state.elements.values()).find(el => el.name.toLowerCase() === tgtName.toLowerCase() && el.type === 'entity');

    if (!srcEl) {
      srcEl = this.state.addElement({ name: srcName, type: 'entity', x: 200, y: 200 });
    }
    if (!tgtEl) {
      tgtEl = this.state.addElement({ name: tgtName, type: 'entity', x: 600, y: 200 });
    }

    const midX = Math.round((srcEl.x + tgtEl.x) / 2);
    const midY = Math.round((srcEl.y + tgtEl.y) / 2);

    const relation = this.state.addElement({
      name: relName,
      type: 'relation',
      x: midX,
      y: midY
    });

    let cardSrc = '1';
    let cardTgt = 'N';

    if (relType === '1:1') { cardSrc = '1'; cardTgt = '1'; }
    else if (relType === 'N:N') { cardSrc = 'N'; cardTgt = 'N'; }

    this.state.addConnection({
      fromId: srcEl.id,
      toId: relation.id,
      type: 'relationship',
      cardinalityTo: cardSrc
    });

    this.state.addConnection({
      fromId: relation.id,
      toId: tgtEl.id,
      type: 'relationship',
      cardinalityTo: cardTgt
    });

    this.syncFromState();
    this.modals.showToast(`Relacionamento "${relName}" (${relType}) criado!`, 'success');
  }

  addNewTable() {
    const entity = this.state.addElement({
      name: `Tabela_${this.state.elements.size + 1}`,
      type: 'entity',
      x: 350,
      y: 280
    });
    this.state.addAttribute(entity.id, {
      name: `id_${entity.name.toLowerCase()}`,
      attrType: 'primary'
    });
    this.syncFromState();
    this.modals.showToast(`Tabela "${entity.name}" criada!`, 'success');
  }
}

window.LogicalEditor = LogicalEditor;
