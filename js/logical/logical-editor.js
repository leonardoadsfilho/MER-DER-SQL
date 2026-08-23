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
    this.selectedColumn = null;
    this.dragState = null;

    this.init();
  }

  init() {
    this.state.on('change', (change) => {
      if (change && change.type === 'logical:position') {
        this.renderForeignKeyLinks();
        this.renderDerMinimap();
        return;
      }
      if (change && change.type === 'logical:viewport') {
        this.applyViewportTransform();
        return;
      }
      this.syncFromState();
    });
    this.syncFromState();
    if (this.container) {
      this.container.addEventListener('scroll', () => this.renderForeignKeyLinks(), { passive: true });
    }
    window.addEventListener('resize', () => this.refreshViewport());
  }

  syncFromState() {
    if (this.migrateLegacyForeignKeyOverrides()) return;
    this.tables = this.relational.generateRelationalSchema(this.state);
    this.ensureTablePositions();
    this.render();
  }

  ensureTablePositions() {
    this.tables.forEach((table, index) => {
      const key = table.id || table.name;
      if (!this.state.logicalLayout[key]) {
        this.state.logicalLayout[key] = {
          x: 80 + (index % 4) * 360,
          y: 80 + Math.floor(index / 4) * 360
        };
      }
    });
  }

  migrateLegacyForeignKeyOverrides() {
    if (this._migratingLegacyFk || !this.state.logicalColumnOverrides) return false;

    for (const [key, override] of Object.entries(this.state.logicalColumnOverrides)) {
      if (!override || override.isFk !== false) continue;
      const separator = key.indexOf('::');
      if (separator < 0) continue;
      const tableKey = key.slice(0, separator);
      const columnName = key.slice(separator + 2);
      if (!this.state.elements.has(tableKey)) continue;

      delete this.state.logicalColumnOverrides[key];
      const originalTables = this.relational.generateRelationalSchema(this.state);
      this.state.logicalColumnOverrides[key] = override;
      const table = originalTables.find(item => (item.id || item.name) === tableKey);
      const column = table && table.columns.find(item => item.name === columnName && item.isFk);
      if (!table || !column) continue;

      this._migratingLegacyFk = true;
      try {
        this.convertForeignKeyToColumn(table, column);
      } finally {
        this._migratingLegacyFk = false;
      }
      this.tables = this.relational.generateRelationalSchema(this.state);
      this.render();
      return true;
    }
    return false;
  }

  render() {
    if (!this.container) return;

    if (this.tables.length === 0) {
      this.container.innerHTML = `
        <div class="logical-editor-header"><h2 style="font-size: var(--font-size-lg);">Esquema Lógico Relacional (DER)</h2><span class="badge badge-pk">0 Tabelas</span></div>
        <div class="logical-canvas">
        <div class="logical-world"><svg class="logical-fk-layer" aria-hidden="true"></svg><div class="logical-tables-layer"></div></div>
        <div class="empty-state logical-empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          </div>
          <h3 style="font-weight: 700;">Nenhuma Tabela no Modelo Lógico</h3>
          <p style="font-size: var(--font-size-xs); max-width: 380px; text-align: center;">Use “+ Tabela” na barra lateral para começar.</p>
        </div>
        <div class="der-canvas-controls"><button class="btn btn-outline btn-icon" id="btn-der-zoom-out">−</button><span id="der-zoom-percentage">100%</span><button class="btn btn-outline btn-icon" id="btn-der-zoom-in">+</button><button class="btn btn-outline" id="btn-der-zoom-reset">Reset</button></div>
        <div class="der-minimap"><canvas width="200" height="130"></canvas><div class="der-minimap-viewport"></div></div>
        </div>
      `;
      this.bindTableDragging();
      return;
    }

    this.container.innerHTML = `
      <div class="logical-editor-header">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <h2 style="font-size: var(--font-size-lg); font-weight: 700;">Esquema Lógico Relacional (DER)</h2>
          <span class="badge badge-pk">${this.tables.length} Tabelas</span>
        </div>
      </div>

      <div class="logical-canvas">
      <div class="logical-world">
      <svg class="logical-fk-layer" aria-hidden="true"></svg>
      <div class="logical-tables-layer">
        ${this.tables.map((table, tIndex) => `
          <div class="logical-table-card" data-table-idx="${tIndex}" data-table-key="${table.id || table.name}" style="left: ${(this.state.logicalLayout[table.id || table.name] || {}).x || 0}px; top: ${(this.state.logicalLayout[table.id || table.name] || {}).y || 0}px">
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
                <div class="logical-col-item ${this.selectedColumn && this.selectedColumn.tableKey === (table.id || table.name) && this.selectedColumn.columnName === col.name ? 'selected' : ''}" data-table-idx="${tIndex}" data-col-idx="${cIndex}" data-column-name="${col.name}">
                  <div style="display: flex; align-items: center; gap: 0.35rem; flex: 1;">
                    <button class="btn-toggle-pk ${col.isPk ? 'active' : ''}" data-table-idx="${tIndex}" data-col-idx="${cIndex}" title="Alternar PK / COL">
                      ${col.isPk ? 'PK' : 'COL'}
                    </button>
                    ${col.isFk ? `
                      <button type="button" class="badge badge-fk btn-toggle-fk" data-table-idx="${tIndex}" data-col-idx="${cIndex}" title="Converter FK em coluna normal">FK</button>
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
      </div></div>
      <div class="der-canvas-controls"><button class="btn btn-outline btn-icon" id="btn-der-zoom-out">−</button><span id="der-zoom-percentage">100%</span><button class="btn btn-outline btn-icon" id="btn-der-zoom-in">+</button><button class="btn btn-outline" id="btn-der-zoom-reset">Reset</button></div>
      <div class="der-minimap"><canvas width="200" height="130"></canvas><div class="der-minimap-viewport"></div></div>
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
    window.requestAnimationFrame(() => this.renderForeignKeyLinks());
  }

  bindEvents() {
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
        const trigger = e.currentTarget.closest('.btn-toggle-pk');
        const tIdx = parseInt(trigger.dataset.tableIdx, 10);
        const cIdx = parseInt(trigger.dataset.colIdx, 10);
        const table = this.tables[tIdx];
        if (table && table.columns[cIdx]) {
          const col = table.columns[cIdx];
          col.isPk = !col.isPk;

          if (!col.isPk) {
            this.handlePkDemotion(table.name, col.name);
          }

          if (table.id) {
            const attrs = this.state.getAttributesFor(table.id);
            const matchedAttr = attrs.find(a =>
              a.name.toLowerCase() === col.name.toLowerCase() ||
              a.name.replace(/^\*/, '').toLowerCase() === col.name.toLowerCase()
            );
            if (matchedAttr) {
              this.state.updateElement(table.id, {
                suppressImplicitPk: !col.isPk
              }, false, false);
              this.state.updateElement(matchedAttr.id, { attrType: col.isPk ? 'primary' : 'simple' });
            } else {
              this.state.updateLogicalColumn(table.id, col.name, { isPk: col.isPk });
            }
          } else {
            this.state.updateLogicalColumn(table.name, col.name, { isPk: col.isPk });
          }
        }
      });
    });

    // Convert a generated FK into a real, regular MER attribute. Merely
    // hiding isFk would leave a DER-only "ghost" column.
    this.container.querySelectorAll('.btn-toggle-fk').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const trigger = e.currentTarget.closest('.btn-toggle-fk');
        const tIdx = parseInt(trigger.dataset.tableIdx, 10);
        const cIdx = parseInt(trigger.dataset.colIdx, 10);
        const table = this.tables[tIdx];
        const col = table && table.columns[cIdx];
        if (!table || !col) return;
        this.selectedColumn = { tableKey: table.id || table.name, columnName: col.name };
        this.convertForeignKeyToColumn(table, col);
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
          const table = this.tables[tIdx];
          if (table.id) {
            const column = table.columns[cIdx];
            const attr = this.state.getAttributesFor(table.id).find(item =>
              this.relational.sanitizeIdentifier(item.name) === column.name
            );
            if (attr) this.state.updateElement(attr.id, { sqlType: e.target.value });
          } else {
            this.state.emit('change', { type: 'logical:column-type' });
          }
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
              if (col.isPk) {
                this.state.updateElement(table.id, { suppressImplicitPk: true }, false, false);
              }
              this.state.removeElement(matchedAttr.id);
            } else if (col.isPk) {
              // An implicit PK has no MER attribute to remove. Suppress its
              // regeneration and clear any DER override for this column.
              this.state.updateElement(table.id, { suppressImplicitPk: true });
              this.state.removeLogicalColumnOverride(table.id, col.name);
            }
          } else {
            table.columns.splice(cIdx, 1);
            this.render();
          }
        }
      });
    });

    this.container.querySelectorAll('.logical-col-item').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-col')) return;
        const tIdx = parseInt(row.dataset.tableIdx, 10);
        const cIdx = parseInt(row.dataset.colIdx, 10);
        const table = this.tables[tIdx];
        const column = table && table.columns[cIdx];
        if (!table || !column) return;
        this.selectedColumn = { tableKey: table.id || table.name, columnName: column.name };
        this.container.querySelectorAll('.logical-col-item.selected').forEach(item => item.classList.remove('selected'));
        row.classList.add('selected');
        const input = row.querySelector('.col-name-input');
        if (input && e.target !== input && !e.target.closest('button, select')) input.focus();
      });
    });

    this.bindTableDragging();
  }

  convertForeignKeyToColumn(table, column) {
    // Associative tables do not have a single owning MER entity. Keep their
    // edit as a DER override, without changing the PK flag.
    if (!table.id) {
      this.state.updateLogicalColumn(table.name, column.name, {
        isFk: false,
        refTable: null,
        refColumn: null
      });
      return;
    }

    const owner = this.state.elements.get(table.id);
    if (!owner || owner.type !== 'entity') return;

    this.state.pushSnapshot();

    // Remove only relationships that produce this FK in this owner table.
    const producingRelations = Array.from(this.state.elements.values()).filter(element =>
      element.type === 'relation' && this.relationshipProducesForeignKey(element, owner, column)
    );
    producingRelations.forEach(relation => this.state.removeElement(relation.id, false));

    const existingAttribute = this.state.getAttributesFor(owner.id).find(attribute =>
      this.relational.sanitizeIdentifier(attribute.name) === column.name
    );

    if (existingAttribute) {
      this.state.updateElement(existingAttribute.id, {
        attrType: column.isPk ? 'primary' : 'simple',
        sqlType: column.type
      }, false);
    } else {
      this.state.addAttribute(owner.id, {
        name: column.name,
        attrType: column.isPk ? 'primary' : 'simple',
        sqlType: column.type
      });
    }

    this.state.removeLogicalColumnOverride(owner.id, column.name);
  }

  relationshipProducesForeignKey(relation, owner, column) {
    const endpoints = this.state.connections
      .filter(connection =>
        connection.type !== 'attribute_link' &&
        (connection.fromId === relation.id || connection.toId === relation.id)
      )
      .map(connection => ({
        entity: this.state.elements.get(
          connection.fromId === relation.id ? connection.toId : connection.fromId
        ),
        cardinality: connection.cardinalityTo || 'N'
      }))
      .filter(endpoint => endpoint.entity && endpoint.entity.type === 'entity');

    if (endpoints.length !== 2) return false;
    const [a, b] = endpoints;
    const manyA = this.relational.isManyCardinality(a.cardinality);
    const manyB = this.relational.isManyCardinality(b.cardinality);
    let fkOwner = null;
    let referenced = null;

    if (!manyA && manyB) {
      fkOwner = b.entity;
      referenced = a.entity;
    } else if (manyA && !manyB) {
      fkOwner = a.entity;
      referenced = b.entity;
    } else if (!manyA && !manyB) {
      fkOwner = b.entity;
      referenced = a.entity;
    }

    return fkOwner && fkOwner.id === owner.id &&
      this.relational.sanitizeIdentifier(referenced.name) === column.refTable;
  }

  bindTableDragging() {
    this.container.querySelectorAll('.logical-table-header').forEach(header => {
      header.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('input, button')) return;
        const card = header.closest('.logical-table-card');
        const key = card.dataset.tableKey;
        const start = this.state.logicalLayout[key] || { x: 0, y: 0 };
        this.dragState = { card, key, startX: e.clientX, startY: e.clientY, x: start.x, y: start.y };
        card.classList.add('dragging');
        header.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      header.addEventListener('pointermove', (e) => {
        if (!this.dragState) return;
        const scale = this.state.derViewport.scale || 1;
        const x = this.dragState.x + (e.clientX - this.dragState.startX) / scale;
        const y = this.dragState.y + (e.clientY - this.dragState.startY) / scale;
        this.dragState.card.style.left = `${x}px`;
        this.dragState.card.style.top = `${y}px`;
        this.renderForeignKeyLinks();
        this.renderDerMinimap();
      });
      const finishDrag = (e) => {
        if (!this.dragState) return;
        const drag = this.dragState;
        const scale = this.state.derViewport.scale || 1;
        this.dragState = null;
        drag.card.classList.remove('dragging');
        this.state.updateLogicalPosition(drag.key, {
          x: drag.x + (e.clientX - drag.startX) / scale,
          y: drag.y + (e.clientY - drag.startY) / scale
        });
      };
      header.addEventListener('pointerup', finishDrag);
      header.addEventListener('pointercancel', finishDrag);
    });

    const canvas = this.container.querySelector('.logical-canvas');
    if (canvas) {
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('.logical-table-card, button, .der-minimap')) return;
        this.panState = { startX: e.clientX, startY: e.clientY, x: this.state.derViewport.x, y: this.state.derViewport.y };
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add('panning');
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!this.panState) return;
        this.state.derViewport.x = this.panState.x + e.clientX - this.panState.startX;
        this.state.derViewport.y = this.panState.y + e.clientY - this.panState.startY;
        this.applyViewportTransform();
      });
      const finishPan = () => {
        if (!this.panState) return;
        this.panState = null;
        canvas.classList.remove('panning');
        this.state.updateDerViewport(this.state.derViewport);
      };
      canvas.addEventListener('pointerup', finishPan);
      canvas.addEventListener('pointercancel', finishPan);
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.zoomDer(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY);
      }, { passive: false });
    }

    this.container.querySelector('#btn-der-zoom-in')?.addEventListener('click', () => this.zoomDer(1.15));
    this.container.querySelector('#btn-der-zoom-out')?.addEventListener('click', () => this.zoomDer(1 / 1.15));
    this.container.querySelector('#btn-der-zoom-reset')?.addEventListener('click', () => this.resetDerViewport());
    const minimap = this.container.querySelector('.der-minimap');
    if (minimap) minimap.addEventListener('pointerdown', (e) => {
      const rect = minimap.getBoundingClientRect();
      const worldX = (e.clientX - rect.left) / rect.width * 2400;
      const worldY = (e.clientY - rect.top) / rect.height * 1600;
      const logicalCanvas = this.container.querySelector('.logical-canvas');
      const scale = this.state.derViewport.scale || 1;
      this.state.updateDerViewport({
        x: logicalCanvas.clientWidth / 2 - worldX * scale,
        y: logicalCanvas.clientHeight / 2 - worldY * scale
      });
      e.stopPropagation();
    });
    this.applyViewportTransform();
  }

  renderForeignKeyLinks() {
    const svg = this.container && this.container.querySelector('.logical-fk-layer');
    const world = this.container && this.container.querySelector('.logical-world');
    if (!svg || !world) return;
    const origin = world.getBoundingClientRect();
    const scale = this.state.derViewport.scale || 1;
    const links = [];
    this.tables.forEach((table, tableIndex) => {
      table.columns.forEach((column, columnIndex) => {
        if (!column.isFk || !column.refTable || !column.refColumn) return;
        const source = this.container.querySelector(`.logical-col-item[data-table-idx="${tableIndex}"][data-col-idx="${columnIndex}"]`);
        const targetTableIndex = this.tables.findIndex(item => item.name === column.refTable);
        const targetColumnIndex = targetTableIndex < 0 ? -1 : this.tables[targetTableIndex].columns.findIndex(item => item.name === column.refColumn);
        const target = targetColumnIndex < 0 ? null : this.container.querySelector(`.logical-col-item[data-table-idx="${targetTableIndex}"][data-col-idx="${targetColumnIndex}"]`);
        if (!source || !target) return;
        const a = source.getBoundingClientRect();
        const b = target.getBoundingClientRect();
        const ax = (a.left + a.width / 2 - origin.left) / scale;
        const ay = (a.top + a.height / 2 - origin.top) / scale;
        const bx = (b.left + b.width / 2 - origin.left) / scale;
        const by = (b.top + b.height / 2 - origin.top) / scale;
        links.push(`<line class="logical-fk-line" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" />`);
      });
    });
    svg.innerHTML = links.join('');
  }

  zoomDer(factor, clientX, clientY) {
    const canvas = this.container.querySelector('.logical-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const oldScale = this.state.derViewport.scale || 1;
    const scale = Math.max(0.25, Math.min(2.5, oldScale * factor));
    const px = (clientX ?? (rect.left + rect.width / 2)) - rect.left;
    const py = (clientY ?? (rect.top + rect.height / 2)) - rect.top;
    this.state.derViewport.x = px - (px - this.state.derViewport.x) * (scale / oldScale);
    this.state.derViewport.y = py - (py - this.state.derViewport.y) * (scale / oldScale);
    this.state.derViewport.scale = scale;
    this.state.updateDerViewport(this.state.derViewport);
  }

  resetDerViewport() {
    this.state.updateDerViewport({ x: 0, y: 0, scale: 1 });
  }

  applyViewportTransform() {
    const world = this.container && this.container.querySelector('.logical-world');
    if (!world) return;
    const view = this.state.derViewport;
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    const label = this.container.querySelector('#der-zoom-percentage');
    if (label) label.textContent = `${Math.round(view.scale * 100)}%`;
    this.renderForeignKeyLinks();
    this.renderDerMinimap();
  }

  refreshViewport() {
    this.applyViewportTransform();
  }

  fitToScreen() {
    const canvas = this.container && this.container.querySelector('.logical-canvas');
    if (!canvas || this.tables.length === 0) return;
    const positions = this.tables.map(table => this.state.logicalLayout[table.id || table.name]);
    const minX = Math.min(...positions.map(pos => pos.x));
    const minY = Math.min(...positions.map(pos => pos.y));
    const maxX = Math.max(...positions.map(pos => pos.x + 320));
    const maxY = Math.max(...positions.map((pos, index) => pos.y + 120 + this.tables[index].columns.length * 36));
    const scale = Math.max(.25, Math.min(1, (canvas.clientWidth - 80) / (maxX - minX), (canvas.clientHeight - 80) / (maxY - minY)));
    this.state.updateDerViewport({
      scale,
      x: (canvas.clientWidth - (maxX - minX) * scale) / 2 - minX * scale,
      y: (canvas.clientHeight - (maxY - minY) * scale) / 2 - minY * scale
    });
  }

  renderDerMinimap() {
    const canvas = this.container && this.container.querySelector('.der-minimap canvas');
    const viewport = this.container && this.container.querySelector('.der-minimap-viewport');
    const logicalCanvas = this.container && this.container.querySelector('.logical-canvas');
    if (!canvas || !viewport || !logicalCanvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-canvas') || '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sx = canvas.width / 2400;
    const sy = canvas.height / 1600;
    ctx.save();
    ctx.strokeStyle = '#8b5cf6';
    ctx.setLineDash([3, 2]);
    this.tables.forEach(table => {
      table.columns.forEach(column => {
        if (!column.isFk || !column.refTable) return;
        const target = this.tables.find(item => item.name === column.refTable);
        if (!target) return;
        const sourcePos = this.state.logicalLayout[table.id || table.name];
        const targetPos = this.state.logicalLayout[target.id || target.name];
        if (!sourcePos || !targetPos) return;
        ctx.beginPath();
        ctx.moveTo((sourcePos.x + 150) * sx, (sourcePos.y + 60) * sy);
        ctx.lineTo((targetPos.x + 150) * sx, (targetPos.y + 60) * sy);
        ctx.stroke();
      });
    });
    ctx.restore();
    ctx.fillStyle = '#3b82f6';
    this.tables.forEach(table => {
      const pos = this.state.logicalLayout[table.id || table.name] || { x: 0, y: 0 };
      ctx.fillRect(pos.x * sx, pos.y * sy, 300 * sx, Math.max(100, 80 + table.columns.length * 28) * sy);
    });
    const view = this.state.derViewport;
    viewport.style.left = `${Math.max(0, -view.x / view.scale * sx)}px`;
    viewport.style.top = `${Math.max(0, -view.y / view.scale * sy)}px`;
    viewport.style.width = `${logicalCanvas.clientWidth / view.scale * sx}px`;
    viewport.style.height = `${logicalCanvas.clientHeight / view.scale * sy}px`;
  }

  async exportCurrentPNG() {
    try {
      await this.exportPng.exportDerPNG(this.tables, 'modelo-logico-der.png', this.state.logicalLayout);
      this.modals.showToast('PNG do DER exportado com sucesso!', 'success');
    } catch (error) {
      this.modals.showToast('Erro ao exportar PNG: ' + error.message, 'error');
    }
  }

  /**
   * When a PK is demoted or deleted, find FK columns in other tables
   * that reference this PK and remove the corresponding relationships
   */
  handlePkDemotion(tableName, pkColName) {
    const entities = Array.from(this.state.elements.values()).filter(el => el.type === 'entity');
    const sourceEntity = entities.find(el => this.relational.sanitizeIdentifier(el.name) === tableName);
    if (!sourceEntity) return;

    const schema = this.relational.generateRelationalSchema(this.state);
    const references = [];
    schema.forEach(ownerTable => {
      ownerTable.columns.forEach(column => {
        if (column.isFk && column.refTable === tableName && column.refColumn === pkColName) {
          references.push({ ownerTable, column });
        }
      });
    });
    if (references.length === 0) return;

    const relationsToRemove = new Set();
    references.forEach(({ ownerTable, column }) => {
      const owner = ownerTable.id ? this.state.elements.get(ownerTable.id) : null;
      if (!owner) {
        // N:N relationships generate an associative table without an entity
        // id. Locate the relation through its two many-cardinality endpoints.
        this.state.elements.forEach(element => {
          if (element.type !== 'relation') return;
          const endpoints = this.state.connections
            .filter(connection => connection.type !== 'attribute_link' &&
              (connection.fromId === element.id || connection.toId === element.id))
            .map(connection => ({
              entity: this.state.elements.get(connection.fromId === element.id ? connection.toId : connection.fromId),
              cardinality: connection.cardinalityTo || 'N'
            }))
            .filter(endpoint => endpoint.entity?.type === 'entity');
          if (endpoints.length === 2 && endpoints.every(endpoint => this.relational.isManyCardinality(endpoint.cardinality)) &&
              endpoints.some(endpoint => endpoint.entity.id === sourceEntity.id)) {
            relationsToRemove.add(element.id);
          }
        });
        return;
      }
      this.state.elements.forEach(element => {
        if (element.type === 'relation' && this.relationshipProducesForeignKey(element, owner, column)) {
          relationsToRemove.add(element.id);
        }
      });
    });

    if (relationsToRemove.size === 0) return;
    this.state.pushSnapshot();
    relationsToRemove.forEach(relationId => this.state.removeElement(relationId, false));
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
