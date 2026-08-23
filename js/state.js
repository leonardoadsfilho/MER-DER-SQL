/**
 * State Manager & Event Store
 * Editor de MER v1.0
 */

class DiagramState {
  constructor() {
    this.elements = new Map();         // id -> Element Object
    this.connections = [];             // Array of Connection Objects
    this.selectedIds = new Set();      // Selected Node IDs
    this.selectedConnectionIds = new Set(); // Selected Connection IDs
    this.viewport = { x: 0, y: 0, zoom: 1 };
    this.logicalLayout = {};
    this.logicalColumnOverrides = {};
    this.derViewport = { x: 0, y: 0, scale: 1 };
    
    // Undo / Redo Stacks
    this.history = [];
    this.redoStack = [];
    this.maxHistory = 50;

    // Listeners
    this.listeners = new Map();
  }

  // ------------------------------------------------------------------------
  // Event Emitter
  // ------------------------------------------------------------------------
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  generateId(prefix = 'el') {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  // ------------------------------------------------------------------------
  // History (Undo / Redo)
  // ------------------------------------------------------------------------
  pushSnapshot() {
    const snapshot = this.serialize();
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.redoStack = [];
  }

  undo() {
    if (this.history.length === 0) return false;
    const current = this.serialize();
    this.redoStack.push(current);
    const prev = this.history.pop();
    this.deserialize(prev, false);
    this.emit('change', { type: 'undo' });
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    const next = this.redoStack.pop();
    this.history.push(this.serialize());
    this.deserialize(next, false);
    this.emit('change', { type: 'redo' });
    return true;
  }

  // ------------------------------------------------------------------------
  // Elements CRUD
  // ------------------------------------------------------------------------
  addElement(elementData, recordHistory = true) {
    if (recordHistory) this.pushSnapshot();

    const id = elementData.id || this.generateId(elementData.type);
    const element = {
      id,
      name: elementData.name || 'Nova_Entidade',
      type: elementData.type || 'entity', // 'entity', 'relation', 'attribute'
      attrType: elementData.attrType || 'simple',
      parentId: elementData.parentId || null,
      x: elementData.x || 100,
      y: elementData.y || 100,
      width: elementData.width || 130,
      height: elementData.height || 50,
      ...elementData
    };

    this.elements.set(id, element);

    if (element.type === 'attribute' && element.parentId) {
      this.addConnection({
        id: this.generateId('conn'),
        fromId: element.parentId,
        toId: id,
        type: 'attribute_link'
      }, false);
    }

    this.emit('element:added', element);
    this.emit('change', { type: 'element:added', element });
    return element;
  }

  updateElement(id, changes, recordHistory = true, emitEvent = true) {
    if (!this.elements.has(id)) return null;
    if (recordHistory) this.pushSnapshot();

    const element = this.elements.get(id);
    Object.assign(element, changes);

    if (emitEvent) {
      this.emit('element:updated', element);
      this.emit('change', { type: 'element:updated', element });
    }
    return element;
  }

  removeElement(id, recordHistory = true) {
    if (!this.elements.has(id)) return false;
    if (recordHistory) this.pushSnapshot();

    const element = this.elements.get(id);

    // Remove child attributes (for entity/relation AND for composite attributes)
    if (element.type === 'entity' || element.type === 'relation') {
      const attachedAttrs = this.getAttributesFor(id);
      attachedAttrs.forEach(attr => this.removeElement(attr.id, false));
    }

    // If this is a composite attribute, also remove its sub-attributes
    if (element.type === 'attribute' && element.attrType === 'composite') {
      const subAttrs = this.getAttributesFor(id);
      subAttrs.forEach(sub => this.removeElement(sub.id, false));
    }

    this.connections = this.connections.filter(
      conn => conn.fromId !== id && conn.toId !== id
    );

    this.selectedIds.delete(id);
    this.elements.delete(id);

    this.emit('element:removed', { id, element });
    this.emit('change', { type: 'element:removed', id });
    return true;
  }

  // ------------------------------------------------------------------------
  // Attributes Management
  // ------------------------------------------------------------------------
  getAttributesFor(parentId) {
    const attrs = [];
    this.elements.forEach(el => {
      if (el.type === 'attribute' && el.parentId === parentId) {
        attrs.push(el);
      }
    });
    return attrs;
  }

  addAttribute(parentId, attrData = {}) {
    const parent = this.elements.get(parentId);
    if (!parent) return null;

    this.pushSnapshot();

    const existingAttrs = this.getAttributesFor(parentId);
    const count = existingAttrs.length;
    const radius = 100 + (Math.floor(count / 8) * 40);
    const angle = (count * (Math.PI / 4)) - (Math.PI / 2);

    const x = parent.x + Math.cos(angle) * radius;
    const y = parent.y + Math.sin(angle) * radius;

    const attr = this.addElement({
      name: attrData.name || (attrData.attrType === 'primary' ? `id_${parent.name.toLowerCase()}` : `atributo_${count + 1}`),
      type: 'attribute',
      attrType: attrData.attrType || 'simple',
      parentId: parentId,
      x: attrData.x || Math.round(x),
      y: attrData.y || Math.round(y),
      width: 100,
      height: 38
    }, false);

    this.emit('change', { type: 'attribute:added', parentId, attr });
    return attr;
  }

  // ------------------------------------------------------------------------
  // Connections CRUD
  // ------------------------------------------------------------------------
  addConnection(connData, recordHistory = true) {
    if (recordHistory) this.pushSnapshot();

    const connection = {
      id: connData.id || this.generateId('conn'),
      fromId: connData.fromId,
      toId: connData.toId,
      type: connData.type || 'relationship',
      cardinalityFrom: connData.cardinalityFrom || '1',
      cardinalityTo: connData.cardinalityTo || 'N',
      isIdentifying: connData.isIdentifying || false,
      ...connData
    };

    const exists = this.connections.some(
      c => (c.fromId === connection.fromId && c.toId === connection.toId) ||
           (c.fromId === connection.toId && c.toId === connection.fromId && c.type === connection.type)
    );

    if (!exists) {
      this.connections.push(connection);
      this.emit('connection:added', connection);
      this.emit('change', { type: 'connection:added', connection });
    }

    return connection;
  }

  removeConnection(id, recordHistory = true) {
    if (recordHistory) this.pushSnapshot();
    const prevLen = this.connections.length;
    this.connections = this.connections.filter(c => c.id !== id);
    this.selectedConnectionIds.delete(id);

    if (this.connections.length !== prevLen) {
      this.emit('connection:removed', id);
      this.emit('change', { type: 'connection:removed', id });
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------------
  // Quick Relation Wizard & Auto-connect
  // ------------------------------------------------------------------------
  quickRelationWizard(sourceEntityId, relationName, targetEntityName, cardSource = '1', cardTarget = 'N') {
    const source = this.elements.get(sourceEntityId);
    if (!source || source.type !== 'entity') return null;

    this.pushSnapshot();

    const spacingX = 220;
    const relX = source.x + spacingX;
    const relY = source.y;
    const targetX = source.x + (spacingX * 2);
    const targetY = source.y;

    const relation = this.addElement({
      name: relationName || 'Relaciona',
      type: 'relation',
      x: relX,
      y: relY,
      width: 120,
      height: 60
    }, false);

    const targetEntity = this.addElement({
      name: targetEntityName || 'Nova_Entidade',
      type: 'entity',
      x: targetX,
      y: targetY,
      width: 140,
      height: 50
    }, false);

    this.addAttribute(targetEntity.id, {
      name: `id_${targetEntity.name.toLowerCase()}`,
      attrType: 'primary'
    });

    this.addConnection({
      fromId: source.id,
      toId: relation.id,
      type: 'relationship',
      cardinalityFrom: '',
      cardinalityTo: cardSource
    }, false);

    this.addConnection({
      fromId: relation.id,
      toId: targetEntity.id,
      type: 'relationship',
      cardinalityFrom: '',
      cardinalityTo: cardTarget
    }, false);

    this.emit('change', { type: 'wizard:completed', source, relation, targetEntity });
    return { relation, targetEntity };
  }

  // ------------------------------------------------------------------------
  // Selection
  // ------------------------------------------------------------------------
  select(id, multi = false) {
    if (!multi) {
      this.selectedIds.clear();
      this.selectedConnectionIds.clear();
    }
    if (id) {
      if (multi && this.selectedIds.has(id)) {
        this.selectedIds.delete(id);
      } else {
        this.selectedIds.add(id);
      }
    }
    this.emit('selection:changed', {
      nodes: Array.from(this.selectedIds),
      connections: Array.from(this.selectedConnectionIds)
    });
  }

  selectConnection(connId, multi = false) {
    if (!multi) {
      this.selectedIds.clear();
      this.selectedConnectionIds.clear();
    }
    if (connId) {
      if (multi && this.selectedConnectionIds.has(connId)) {
        this.selectedConnectionIds.delete(connId);
      } else {
        this.selectedConnectionIds.add(connId);
      }
    }
    this.emit('selection:changed', {
      nodes: Array.from(this.selectedIds),
      connections: Array.from(this.selectedConnectionIds)
    });
  }

  selectAll() {
    this.elements.forEach(el => this.selectedIds.add(el.id));
    this.connections.forEach(c => this.selectedConnectionIds.add(c.id));
    this.emit('selection:changed', {
      nodes: Array.from(this.selectedIds),
      connections: Array.from(this.selectedConnectionIds)
    });
  }

  clearSelection() {
    this.selectedIds.clear();
    this.selectedConnectionIds.clear();
    this.emit('selection:changed', { nodes: [], connections: [] });
  }

  getSelectedElements() {
    return Array.from(this.selectedIds)
      .map(id => this.elements.get(id))
      .filter(Boolean);
  }

  getSelectedConnections() {
    return Array.from(this.selectedConnectionIds)
      .map(id => this.connections.find(c => c.id === id))
      .filter(Boolean);
  }

  // ------------------------------------------------------------------------
  // Serialization (JSON Export / Import)
  // ------------------------------------------------------------------------
  serialize() {
    return JSON.stringify({
      version: '1.0',
      timestamp: new Date().toISOString(),
      elements: Array.from(this.elements.values()),
      connections: this.connections,
      viewport: this.viewport,
      logicalLayout: this.logicalLayout,
      logicalColumnOverrides: this.logicalColumnOverrides,
      derViewport: this.derViewport
    }, null, 2);
  }

  deserialize(jsonString, recordHistory = true) {
    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (!data || !Array.isArray(data.elements)) return false;

      if (recordHistory) this.pushSnapshot();

      this.elements.clear();
      this.connections = [];
      this.selectedIds.clear();
      this.selectedConnectionIds.clear();

      data.elements.forEach(el => {
        this.elements.set(el.id, el);
      });

      if (Array.isArray(data.connections)) {
        this.connections = data.connections;
      }

      if (data.viewport) {
        this.viewport = data.viewport;
      }
      this.logicalLayout = data.logicalLayout && typeof data.logicalLayout === 'object'
        ? data.logicalLayout
        : {};
      this.logicalColumnOverrides = data.logicalColumnOverrides && typeof data.logicalColumnOverrides === 'object'
        ? data.logicalColumnOverrides
        : {};
      this.derViewport = data.derViewport && typeof data.derViewport === 'object'
        ? data.derViewport
        : { x: 0, y: 0, scale: 1 };

      this.emit('state:reset');
      this.emit('change', { type: 'state:reset' });
      return true;
    } catch (e) {
      console.error('Failed to parse diagram JSON', e);
      return false;
    }
  }

  clearAll() {
    this.pushSnapshot();
    this.elements.clear();
    this.connections = [];
    this.selectedIds.clear();
    this.selectedConnectionIds.clear();
    this.logicalLayout = {};
    this.logicalColumnOverrides = {};
    this.derViewport = { x: 0, y: 0, scale: 1 };
    this.emit('state:reset');
    this.emit('change', { type: 'state:cleared' });
  }

  updateLogicalPosition(tableKey, position) {
    if (!tableKey) return;
    this.logicalLayout[tableKey] = {
      x: Math.round(position.x || 0),
      y: Math.round(position.y || 0)
    };
    this.emit('change', { type: 'logical:position', tableKey });
  }

  updateLogicalColumn(tableKey, columnName, changes) {
    if (!tableKey || !columnName) return;
    const key = `${tableKey}::${columnName}`;
    this.logicalColumnOverrides[key] = {
      ...(this.logicalColumnOverrides[key] || {}),
      ...changes
    };
    this.emit('change', { type: 'logical:column', tableKey, columnName });
  }

  removeLogicalColumnOverride(tableKey, columnName) {
    const key = `${tableKey}::${columnName}`;
    if (!Object.prototype.hasOwnProperty.call(this.logicalColumnOverrides, key)) return;
    delete this.logicalColumnOverrides[key];
    this.emit('change', { type: 'logical:column-override-removed', tableKey, columnName });
  }

  updateDerViewport(viewport) {
    this.derViewport = { ...this.derViewport, ...viewport };
    this.emit('change', { type: 'logical:viewport' });
  }
}

window.DiagramState = DiagramState;
