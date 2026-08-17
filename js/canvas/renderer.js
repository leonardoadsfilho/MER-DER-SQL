/**
 * SVG Canvas Renderer
 * Handles shapes, external-boundary cardinality positioning, and 4-edge connection handles
 * Editor de MER Conceptual v2.2
 */

class CanvasRenderer {
  constructor(svgElement, state) {
    this.svg = svgElement;
    this.state = state;

    this.gridLayer = this.svg.querySelector('#layer-grid') || this.createLayer('layer-grid');
    this.connectionsLayer = this.svg.querySelector('#layer-connections') || this.createLayer('layer-connections');
    this.nodesLayer = this.svg.querySelector('#layer-nodes') || this.createLayer('layer-nodes');
    this.overlayLayer = this.svg.querySelector('#layer-overlay') || this.createLayer('layer-overlay');

    this.canvasCtx = document.createElement('canvas').getContext('2d');
    this.canvasCtx.font = '14px Inter, sans-serif';

    this.state.on('change', () => this.render());
    this.state.on('selection:changed', () => this.updateSelectionStyles());
  }

  createLayer(id) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', id);
    this.svg.appendChild(g);
    return g;
  }

  calculateTextDimensions(text, font = '14px Inter, sans-serif') {
    this.canvasCtx.font = font;
    const metrics = this.canvasCtx.measureText(text || ' ');
    return {
      width: Math.max(metrics.width, 30),
      height: 18
    };
  }

  calculateEntitySize(name) {
    const textDim = this.calculateTextDimensions(name, 'bold 14px Inter, sans-serif');
    const width = Math.max(130, Math.round(textDim.width + 48));
    const height = 48;
    return { width, height };
  }

  calculateRelationSize(name) {
    const textDim = this.calculateTextDimensions(name, '600 13px Inter, sans-serif');
    const width = Math.max(110, Math.round(textDim.width + 54));
    const height = Math.max(56, Math.round(width * 0.52));
    return { width, height };
  }

  calculateAttributeSize(name) {
    const textDim = this.calculateTextDimensions(name, '500 12px Inter, sans-serif');
    const rx = Math.max(45, Math.round((textDim.width + 30) / 2));
    const ry = 19;
    return { width: rx * 2, height: ry * 2, rx, ry };
  }

  render() {
    this.renderConnections();
    this.renderNodes();
    this.updateSelectionStyles();
  }

  renderNodes() {
    this.nodesLayer.innerHTML = '';

    this.state.elements.forEach(element => {
      let nodeGroup;

      if (element.type === 'entity') {
        nodeGroup = this.createEntityNode(element);
      } else if (element.type === 'relation') {
        nodeGroup = this.createRelationNode(element);
      } else if (element.type === 'attribute') {
        nodeGroup = this.createAttributeNode(element);
      }

      if (nodeGroup) {
        this.nodesLayer.appendChild(nodeGroup);
      }
    });
  }

  createEntityNode(element) {
    const { width, height } = this.calculateEntitySize(element.name);
    element.width = width;
    element.height = height;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `diagram-node entity ${this.state.selectedIds.has(element.id) ? 'selected' : ''}`);
    g.setAttribute('data-id', element.id);
    g.setAttribute('transform', `translate(${element.x - width / 2}, ${element.y - height / 2})`);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('class', 'shape-entity');
    g.appendChild(rect);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', width / 2);
    text.setAttribute('y', height / 2);
    text.textContent = element.name;
    g.appendChild(text);

    // 4 Edge Connection Handles (Right, Left, Top, Bottom)
    this.addConnectionPort(g, width, height / 2, element.id, 'right');
    this.addConnectionPort(g, 0, height / 2, element.id, 'left');
    this.addConnectionPort(g, width / 2, 0, element.id, 'top');
    this.addConnectionPort(g, width / 2, height, element.id, 'bottom');

    return g;
  }

  createRelationNode(element) {
    const { width, height } = this.calculateRelationSize(element.name);
    element.width = width;
    element.height = height;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `diagram-node relation ${this.state.selectedIds.has(element.id) ? 'selected' : ''}`);
    g.setAttribute('data-id', element.id);
    g.setAttribute('transform', `translate(${element.x}, ${element.y})`);

    const points = `0,${-height / 2} ${width / 2},0 0,${height / 2} ${-width / 2},0`;

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', points);
    polygon.setAttribute('class', 'shape-relation');
    g.appendChild(polygon);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', 0);
    text.setAttribute('y', 0);
    text.textContent = element.name;
    g.appendChild(text);

    // 4 Diamond Edge Connection Handles
    this.addConnectionPort(g, width / 2, 0, element.id, 'right');
    this.addConnectionPort(g, -width / 2, 0, element.id, 'left');
    this.addConnectionPort(g, 0, -height / 2, element.id, 'top');
    this.addConnectionPort(g, 0, height / 2, element.id, 'bottom');

    return g;
  }

  createAttributeNode(element) {
    const isPrimary = element.attrType === 'primary';
    const displayName = isPrimary && !element.name.startsWith('*') ? `*${element.name}` : element.name;
    const { width, height, rx, ry } = this.calculateAttributeSize(displayName);
    element.width = width;
    element.height = height;

    const attrType = element.attrType || 'simple';
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `diagram-node attribute attribute-${attrType} ${this.state.selectedIds.has(element.id) ? 'selected' : ''}`);
    g.setAttribute('data-id', element.id);
    g.setAttribute('transform', `translate(${element.x}, ${element.y})`);

    if (attrType === 'multivalued') {
      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      outer.setAttribute('cx', 0);
      outer.setAttribute('cy', 0);
      outer.setAttribute('rx', rx);
      outer.setAttribute('ry', ry);
      outer.setAttribute('class', 'shape-multivalued-outer');
      g.appendChild(outer);

      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      inner.setAttribute('cx', 0);
      inner.setAttribute('cy', 0);
      inner.setAttribute('rx', rx - 4);
      inner.setAttribute('ry', ry - 4);
      inner.setAttribute('class', 'shape-multivalued-inner');
      g.appendChild(inner);
    } else {
      const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      ellipse.setAttribute('cx', 0);
      ellipse.setAttribute('cy', 0);
      ellipse.setAttribute('rx', rx);
      ellipse.setAttribute('ry', ry);
      ellipse.setAttribute('class', 'shape-attribute');
      g.appendChild(ellipse);
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', 0);
    text.setAttribute('y', 0);
    text.textContent = displayName;
    g.appendChild(text);

    // Edge handles for attribute
    this.addConnectionPort(g, rx, 0, element.id, 'right');
    this.addConnectionPort(g, -rx, 0, element.id, 'left');

    return g;
  }

  addConnectionPort(parentNode, cx, cy, elementId, position = 'right') {
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle.setAttribute('cx', cx);
    handle.setAttribute('cy', cy);
    handle.setAttribute('r', 6);
    handle.setAttribute('class', `connect-handle handle-${position}`);
    handle.setAttribute('data-parent-id', elementId);
    parentNode.appendChild(handle);
  }

  renderConnections() {
    this.connectionsLayer.innerHTML = '';

    this.state.connections.forEach(conn => {
      const fromEl = this.state.elements.get(conn.fromId);
      const toEl = this.state.elements.get(conn.toId);

      if (!fromEl || !toEl) return;

      const isSelected = this.state.selectedConnectionIds.has(conn.id);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `connection-group ${isSelected ? 'selected' : ''}`);
      g.setAttribute('data-conn-id', conn.id);

      // Hitbox
      const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hitbox.setAttribute('x1', fromEl.x);
      hitbox.setAttribute('y1', fromEl.y);
      hitbox.setAttribute('x2', toEl.x);
      hitbox.setAttribute('y2', toEl.y);
      hitbox.setAttribute('class', 'connection-hitbox');
      hitbox.setAttribute('data-conn-id', conn.id);
      g.appendChild(hitbox);

      // Visible Line
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      path.setAttribute('x1', fromEl.x);
      path.setAttribute('y1', fromEl.y);
      path.setAttribute('x2', toEl.x);
      path.setAttribute('y2', toEl.y);
      path.setAttribute('class', `connection-line ${conn.isIdentifying ? 'identifying' : ''} ${isSelected ? 'selected' : ''}`);
      path.setAttribute('data-conn-id', conn.id);
      g.appendChild(path);

      // Cardinality Label
      if (conn.type !== 'attribute_link' && conn.cardinalityTo) {
        const cardGroup = this.createCardinalityLabel(fromEl, toEl, conn.cardinalityTo, conn.id);
        g.appendChild(cardGroup);
      }

      this.connectionsLayer.appendChild(g);
    });
  }

  // Smart external-boundary calculation: always places cardinality label 26px outside the target node boundary
  createCardinalityLabel(fromEl, toEl, textValue, connId) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'cardinality-group');
    g.setAttribute('data-conn-id', connId);

    const dx = toEl.x - fromEl.x;
    const dy = toEl.y - fromEl.y;
    const lineLen = Math.hypot(dx, dy) || 1;
    const dirX = dx / lineLen;
    const dirY = dy / lineLen;

    // Calculate approximate radius/half-size of toEl in the direction of the line
    const halfW = (toEl.width || 120) / 2;
    const halfH = (toEl.height || 50) / 2;
    const targetBoundaryDist = Math.min(
      Math.abs(halfW / (dirX || 0.001)),
      Math.abs(halfH / (dirY || 0.001))
    );

    // Position label 24px outside toEl's boundary towards fromEl
    const distFromTargetCenter = Math.max(30, targetBoundaryDist + 24);
    const labelX = toEl.x - dirX * distFromTargetCenter;
    const labelY = toEl.y - dirY * distFromTargetCenter;

    // Perpendicular slight offset for clean readability
    const perpX = -dirY * 12;
    const perpY = dirX * 12;

    const finalX = labelX + perpX;
    const finalY = labelY + perpY;

    const pill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const pillWidth = Math.max(26, textValue.length * 9 + 10);
    const pillHeight = 20;

    pill.setAttribute('x', finalX - pillWidth / 2);
    pill.setAttribute('y', finalY - pillHeight / 2);
    pill.setAttribute('width', pillWidth);
    pill.setAttribute('height', pillHeight);
    pill.setAttribute('class', 'cardinality-pill');
    pill.setAttribute('data-conn-id', connId);
    g.appendChild(pill);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', finalX);
    text.setAttribute('y', finalY);
    text.setAttribute('class', 'cardinality-text');
    text.setAttribute('data-conn-id', connId);
    text.textContent = textValue;
    g.appendChild(text);

    return g;
  }

  updateSelectionStyles() {
    const allNodes = this.nodesLayer.querySelectorAll('.diagram-node');
    allNodes.forEach(node => {
      const id = node.getAttribute('data-id');
      if (this.state.selectedIds.has(id)) {
        node.classList.add('selected');
      } else {
        node.classList.remove('selected');
      }
    });

    const allConnGroups = this.connectionsLayer.querySelectorAll('.connection-group');
    allConnGroups.forEach(group => {
      const connId = group.getAttribute('data-conn-id');
      const isSelected = this.state.selectedConnectionIds.has(connId);
      if (isSelected) {
        group.classList.add('selected');
        const line = group.querySelector('.connection-line');
        if (line) line.classList.add('selected');
      } else {
        group.classList.remove('selected');
        const line = group.querySelector('.connection-line');
        if (line) line.classList.remove('selected');
      }
    });
  }
}

window.CanvasRenderer = CanvasRenderer;
