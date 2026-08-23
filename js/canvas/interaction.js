/**
 * Canvas Interaction Engine
 * Direct drag-to-connect via edge handles, selection, multi-selection, pan & zoom
 * Editor de MER Conceptual v2.2
 */

class CanvasInteraction {
  constructor(svgElement, viewportElement, state) {
    this.svg = svgElement;
    this.viewport = viewportElement;
    this.state = state;

    this.isDragging = false;
    this.isPanning = false;
    this.isConnecting = false;
    this.connectSourceId = null;

    this.draggedElementId = null;
    this.dragStartPos = { x: 0, y: 0 };
    this.pointerMoved = false;
    this.initialPositions = new Map();
    this.panStartPos = { x: 0, y: 0 };
    this.spacePressed = false;

    this.previewLine = null;

    this.initEvents();
  }

  initEvents() {
    this.svg.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));

    this.viewport.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  getCanvasCoordinates(e) {
    const rect = this.svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    return {
      x: (clientX - this.state.viewport.x) / this.state.viewport.zoom,
      y: (clientY - this.state.viewport.y) / this.state.viewport.zoom
    };
  }

  onMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && this.spacePressed)) {
      this.isPanning = true;
      this.panStartPos = { x: e.clientX, y: e.clientY };
      this.viewport.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    if (e.button !== 0) return;

    const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;

    // 1. Direct Click on Connection Port / Handle -> Starts Drag-to-Connect immediately!
    const connectHandle = e.target.closest('.connect-handle');
    if (connectHandle) {
      const sourceId = connectHandle.getAttribute('data-parent-id');
      this.startConnecting(sourceId, e);
      e.stopPropagation();
      return;
    }

    // 2. Check if clicked on a Connection Line / Hitbox
    const connectionGroup = e.target.closest('[data-conn-id]');
    if (connectionGroup) {
      const connId = connectionGroup.getAttribute('data-conn-id');
      this.state.selectConnection(connId, isMultiKey);
      e.stopPropagation();
      return;
    }

    // 3. Check if clicked on a Node Element
    const nodeElement = e.target.closest('.diagram-node');
    if (nodeElement) {
      const elementId = nodeElement.getAttribute('data-id');

      if (e.altKey) {
        this.startConnecting(elementId, e);
        e.stopPropagation();
        return;
      }

      if (isMultiKey) {
        this.state.select(elementId, true);
      } else {
        this.state.select(elementId, false);
      }

      this.isDragging = true;
      this.draggedElementId = elementId;
      this.dragStartPos = this.getCanvasCoordinates(e);
      this.pointerMoved = false;

      this.initialPositions.clear();
      const draggedElementsToMove = new Set(this.state.selectedIds);

      this.state.selectedIds.forEach(id => {
        const el = this.state.elements.get(id);
        if (el && (el.type === 'entity' || el.type === 'relation')) {
          const attrs = this.state.getAttributesFor(id);
          attrs.forEach(attr => draggedElementsToMove.add(attr.id));
        }
      });

      draggedElementsToMove.forEach(id => {
        const el = this.state.elements.get(id);
        if (el) {
          this.initialPositions.set(id, { x: el.x, y: el.y });
        }
      });

      e.stopPropagation();
    } else {
      if (!isMultiKey) {
        this.state.clearSelection();
      }
    }
  }

  startConnecting(sourceId, e) {
    this.isConnecting = true;
    this.connectSourceId = sourceId;
    const sourceEl = this.state.elements.get(sourceId);
    if (!sourceEl) return;

    const coords = this.getCanvasCoordinates(e);

    const overlayLayer = this.svg.querySelector('#layer-overlay');
    this.previewLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.previewLine.setAttribute('x1', sourceEl.x);
    this.previewLine.setAttribute('y1', sourceEl.y);
    this.previewLine.setAttribute('x2', coords.x);
    this.previewLine.setAttribute('y2', coords.y);
    this.previewLine.setAttribute('class', 'connection-line connection-preview');
    this.previewLine.style.stroke = '#3b82f6';
    this.previewLine.style.strokeWidth = '3px';
    this.previewLine.style.strokeDasharray = '5 4';
    overlayLayer.appendChild(this.previewLine);
  }

  onMouseMove(e) {
    if (this.isPanning) {
      const dx = e.clientX - this.panStartPos.x;
      const dy = e.clientY - this.panStartPos.y;
      this.panStartPos = { x: e.clientX, y: e.clientY };

      this.state.viewport.x += dx;
      this.state.viewport.y += dy;
      this.applyViewportTransform();
      return;
    }

    if (this.isConnecting && this.previewLine) {
      const coords = this.getCanvasCoordinates(e);
      this.previewLine.setAttribute('x2', coords.x);
      this.previewLine.setAttribute('y2', coords.y);
      return;
    }

    if (!this.isDragging) return;

    const currentPos = this.getCanvasCoordinates(e);
    const dx = currentPos.x - this.dragStartPos.x;
    const dy = currentPos.y - this.dragStartPos.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.pointerMoved = true;

    this.initialPositions.forEach((initialPos, id) => {
      const el = this.state.elements.get(id);
      if (el) {
        el.x = Math.round(initialPos.x + dx);
        el.y = Math.round(initialPos.y + dy);
      }
    });

    this.state.emit('change', { type: 'elements:moved' });
  }

  onMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.viewport.style.cursor = this.spacePressed ? 'grab' : 'default';
    }

    if (this.isConnecting) {
      this.finishConnecting(e);
    }

    if (this.isDragging) {
      const clickedElementId = this.draggedElementId;
      const shouldEditName = !this.pointerMoved;
      this.isDragging = false;
      this.draggedElementId = null;
      this.initialPositions.clear();
      this.state.pushSnapshot();
      if (shouldEditName && clickedElementId) {
        this.state.emit('element:edit-name', { id: clickedElementId });
      }
    }
  }

  finishConnecting(e) {
    if (this.previewLine) {
      this.previewLine.remove();
      this.previewLine = null;
    }

    this.isConnecting = false;
    const sourceEl = this.state.elements.get(this.connectSourceId);
    this.connectSourceId = null;

    if (!sourceEl) return;

    const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
    const targetNode = dropTarget ? dropTarget.closest('.diagram-node') : null;

    if (targetNode) {
      const targetId = targetNode.getAttribute('data-id');
      const targetEl = this.state.elements.get(targetId);

      if (targetEl && targetEl.id !== sourceEl.id) {
        this.establishSmartConnection(sourceEl, targetEl);
      }
    }
  }

  establishSmartConnection(sourceEl, targetEl) {
    if (sourceEl.type === 'entity' && targetEl.type === 'relation') {
      this.state.addConnection({
        fromId: sourceEl.id,
        toId: targetEl.id,
        type: 'relationship',
        cardinalityTo: '1'
      });
    } else if (sourceEl.type === 'relation' && targetEl.type === 'entity') {
      this.state.addConnection({
        fromId: sourceEl.id,
        toId: targetEl.id,
        type: 'relationship',
        cardinalityTo: 'N'
      });
    } else if (sourceEl.type === 'entity' && targetEl.type === 'entity') {
      const midX = Math.round((sourceEl.x + targetEl.x) / 2);
      const midY = Math.round((sourceEl.y + targetEl.y) / 2);

      const rel = this.state.addElement({
        name: `Relaciona_${this.state.elements.size + 1}`,
        type: 'relation',
        x: midX,
        y: midY
      });

      this.state.addConnection({
        fromId: sourceEl.id,
        toId: rel.id,
        type: 'relationship',
        cardinalityTo: '1'
      });

      this.state.addConnection({
        fromId: rel.id,
        toId: targetEl.id,
        type: 'relationship',
        cardinalityTo: 'N'
      });
    } else if ((sourceEl.type === 'entity' || sourceEl.type === 'relation') && targetEl.type === 'attribute') {
      targetEl.parentId = sourceEl.id;
      this.state.addConnection({
        fromId: sourceEl.id,
        toId: targetEl.id,
        type: 'attribute_link'
      });
    }
  }

  onWheel(e) {
    e.preventDefault();

    const zoomFactor = 1.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    const newZoom = direction > 0 
      ? Math.min(this.state.viewport.zoom * zoomFactor, 3.0)
      : Math.max(this.state.viewport.zoom / zoomFactor, 0.2);

    const rect = this.svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const deltaZoom = newZoom - this.state.viewport.zoom;
    this.state.viewport.x -= (mouseX - this.state.viewport.x) * (deltaZoom / this.state.viewport.zoom);
    this.state.viewport.y -= (mouseY - this.state.viewport.y) * (deltaZoom / this.state.viewport.zoom);
    this.state.viewport.zoom = newZoom;

    this.applyViewportTransform();
    this.state.emit('viewport:changed', this.state.viewport);
  }

  applyViewportTransform() {
    const mainGroup = this.svg.querySelector('#canvas-root-group');
    if (mainGroup) {
      mainGroup.setAttribute(
        'transform',
        `translate(${this.state.viewport.x}, ${this.state.viewport.y}) scale(${this.state.viewport.zoom})`
      );
    }

    const zoomLabel = document.getElementById('zoom-percentage');
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(this.state.viewport.zoom * 100)}%`;
    }

    this.state.emit('viewport:changed', this.state.viewport);
  }

  resetZoom() {
    this.state.viewport = { x: 0, y: 0, zoom: 1 };
    this.applyViewportTransform();
  }

  onKeyDown(e) {
    if (e.code === 'Space' && !this.spacePressed && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      this.spacePressed = true;
      this.viewport.style.cursor = 'grab';
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      this.state.selectAll();
      return;
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      const hasNodes = this.state.selectedIds.size > 0;
      const hasConns = this.state.selectedConnectionIds.size > 0;

      if (hasNodes || hasConns) {
        Array.from(this.state.selectedIds).forEach(id => this.state.removeElement(id, false));
        Array.from(this.state.selectedConnectionIds).forEach(id => this.state.removeConnection(id, false));
        this.state.clearSelection();
        this.state.pushSnapshot();
      }
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          this.state.redo();
        } else {
          this.state.undo();
        }
        e.preventDefault();
      } else if (e.key === 'y' || e.key === 'Y') {
        this.state.redo();
        e.preventDefault();
      }
    }
  }

  onKeyUp(e) {
    if (e.code === 'Space') {
      this.spacePressed = false;
      this.viewport.style.cursor = 'default';
    }
  }
}

window.CanvasInteraction = CanvasInteraction;
