/**
 * Minimap Navigation Component
 * Provides a real-time radar overview and interactive viewport panning
 * Editor de MER Conceptual v2.1
 */

class CanvasMinimap {
  constructor(containerElement, state, canvasSvg, canvasViewport) {
    this.container = containerElement;
    this.state = state;
    this.svg = canvasSvg;
    this.viewport = canvasViewport;

    this.isDragging = false;
    this.isCollapsed = false;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="minimap-header">
        <span class="minimap-title">Minimapa</span>
        <button id="btn-toggle-minimap" class="btn-minimap-toggle" title="Recolher/Expandir Minimapa">▾</button>
      </div>
      <div class="minimap-canvas-wrapper" id="minimap-wrapper">
        <canvas id="minimap-canvas" width="180" height="120"></canvas>
        <div id="minimap-viewport-box" class="minimap-viewport-box"></div>
      </div>
    `;

    this.canvas = this.container.querySelector('#minimap-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.viewportBox = this.container.querySelector('#minimap-viewport-box');
    this.wrapper = this.container.querySelector('#minimap-wrapper');

    // Toggle button
    const btnToggle = this.container.querySelector('#btn-toggle-minimap');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        this.isCollapsed = !this.isCollapsed;
        this.wrapper.style.display = this.isCollapsed ? 'none' : 'block';
        btnToggle.textContent = this.isCollapsed ? '▴' : '▾';
      });
    }

    // Minimap drag/click events to pan the main viewport
    this.wrapper.addEventListener('pointerdown', (e) => {
      this.wrapper.setPointerCapture(e.pointerId);
      this.onMinimapMouseDown(e);
    });
    this.wrapper.addEventListener('pointermove', (e) => this.onMinimapMouseMove(e));
    this.wrapper.addEventListener('pointerup', () => { this.isDragging = false; });
    this.wrapper.addEventListener('pointercancel', () => { this.isDragging = false; });

    // Listen to changes
    this.state.on('change', () => this.draw());
    this.state.on('viewport:changed', () => this.draw());

    this.draw();
  }

  getDiagramBounds() {
    let minX = -400;
    let minY = -300;
    let maxX = 1200;
    let maxY = 800;

    this.state.elements.forEach(el => {
      minX = Math.min(minX, el.x - 150);
      minY = Math.min(minY, el.y - 150);
      maxX = Math.max(maxX, el.x + 150);
      maxY = Math.max(maxY, el.y + 150);
    });

    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  draw() {
    if (this.isCollapsed) return;

    const bounds = this.getDiagramBounds();
    const mapW = this.canvas.width;
    const mapH = this.canvas.height;

    this.ctx.clearRect(0, 0, mapW, mapH);

    const scaleX = mapW / bounds.width;
    const scaleY = mapH / bounds.height;
    const scale = Math.min(scaleX, scaleY) * 0.85;

    const offsetX = (mapW - bounds.width * scale) / 2 - bounds.minX * scale;
    const offsetY = (mapH - bounds.height * scale) / 2 - bounds.minY * scale;

    this.scale = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    // 1. Draw Connections
    this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    this.ctx.lineWidth = 1;
    this.state.connections.forEach(conn => {
      const fromEl = this.state.elements.get(conn.fromId);
      const toEl = this.state.elements.get(conn.toId);
      if (fromEl && toEl) {
        this.ctx.beginPath();
        this.ctx.moveTo(fromEl.x * scale + offsetX, fromEl.y * scale + offsetY);
        this.ctx.lineTo(toEl.x * scale + offsetX, toEl.y * scale + offsetY);
        this.ctx.stroke();
      }
    });

    // 2. Draw Nodes
    this.state.elements.forEach(el => {
      const x = el.x * scale + offsetX;
      const y = el.y * scale + offsetY;

      if (el.type === 'entity') {
        this.ctx.fillStyle = '#3b82f6';
        this.ctx.fillRect(x - 8, y - 5, 16, 10);
      } else if (el.type === 'relation') {
        this.ctx.fillStyle = '#a855f7';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - 5);
        this.ctx.lineTo(x + 6, y);
        this.ctx.lineTo(x, y + 5);
        this.ctx.lineTo(x - 6, y);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (el.type === 'attribute') {
        this.ctx.fillStyle = el.attrType === 'primary' ? '#f59e0b' : '#06b6d4';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    // 3. Position Viewport Box in Minimap
    const viewW = this.viewport.clientWidth;
    const viewH = this.viewport.clientHeight;

    const visibleLeft = (-this.state.viewport.x) / this.state.viewport.zoom;
    const visibleTop = (-this.state.viewport.y) / this.state.viewport.zoom;
    const visibleWidth = viewW / this.state.viewport.zoom;
    const visibleHeight = viewH / this.state.viewport.zoom;

    const boxX = visibleLeft * scale + offsetX;
    const boxY = visibleTop * scale + offsetY;
    const boxW = Math.max(12, visibleWidth * scale);
    const boxH = Math.max(10, visibleHeight * scale);

    this.viewportBox.style.left = `${Math.round(boxX)}px`;
    this.viewportBox.style.top = `${Math.round(boxY)}px`;
    this.viewportBox.style.width = `${Math.round(boxW)}px`;
    this.viewportBox.style.height = `${Math.round(boxH)}px`;
  }

  onMinimapMouseDown(e) {
    this.isDragging = true;
    this.panFromMinimap(e);
  }

  onMinimapMouseMove(e) {
    if (!this.isDragging) return;
    this.panFromMinimap(e);
  }

  panFromMinimap(e) {
    const rect = this.wrapper.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (!this.scale) return;

    // Convert minimap pixel to canvas world coordinate
    const worldX = (clickX - this.offsetX) / this.scale;
    const worldY = (clickY - this.offsetY) / this.scale;

    // Center camera on world coordinate
    const viewW = this.viewport.clientWidth;
    const viewH = this.viewport.clientHeight;

    this.state.viewport.x = -(worldX * this.state.viewport.zoom) + viewW / 2;
    this.state.viewport.y = -(worldY * this.state.viewport.zoom) + viewH / 2;

    const mainGroup = this.svg.querySelector('#canvas-root-group');
    if (mainGroup) {
      mainGroup.setAttribute(
        'transform',
        `translate(${this.state.viewport.x}, ${this.state.viewport.y}) scale(${this.state.viewport.zoom})`
      );
    }

    this.draw();
  }
}

window.CanvasMinimap = CanvasMinimap;
