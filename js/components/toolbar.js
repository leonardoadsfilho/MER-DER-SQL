/**
 * Toolbar Component
 * Handles Left Sidebar Tool Cards for MER and DER modes
 * Editor de MER Conceptual v2.1
 */

class Toolbar {
  constructor(containerElement, state, canvasInteraction, logicalEditor, exportPngService, modalManager) {
    this.container = containerElement;
    this.state = state;
    this.interaction = canvasInteraction;
    this.logical = logicalEditor;
    this.exportPng = exportPngService;
    this.modals = modalManager;

    this.init();
  }

  init() {
    // 1. Conceptual Tools
    this.container.querySelectorAll('[data-tool]').forEach(card => {
      card.addEventListener('click', () => {
        const tool = card.getAttribute('data-tool');
        this.handleToolClick(tool);
      });
    });

    // 2. Logical Tools in Sidebar
    const btnAddTableSide = document.getElementById('btn-side-add-table');
    if (btnAddTableSide && this.logical) {
      btnAddTableSide.addEventListener('click', () => {
        this.logical.addNewTable();
      });
    }

    const btnRelationship = document.getElementById('btn-side-add-relationship');
    if (btnRelationship && this.logical) btnRelationship.addEventListener('click', () => this.logical.openDerRelationshipDialog());

    const btnMerPng = document.getElementById('btn-side-export-mer');
    if (btnMerPng) btnMerPng.addEventListener('click', async () => {
      try {
        await this.exportPng.exportPNG('diagrama-mer-academico.png', true);
        this.modals.showToast('PNG do MER exportado com sucesso!', 'success');
      } catch (error) {
        this.modals.showToast('Erro ao exportar PNG: ' + error.message, 'error');
      }
    });

    const btnDerPng = document.getElementById('btn-side-export-der');
    if (btnDerPng && this.logical) btnDerPng.addEventListener('click', () => this.logical.exportCurrentPNG());

    const btnClearDer = document.getElementById('btn-side-clear-der');
    if (btnClearDer) btnClearDer.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja excluir TODAS as tabelas e relacionamentos?')) {
        this.state.clearAll();
        this.modals.showToast('Modelo inteiramente limpo.', 'info');
      }
    });

    // 3. Zoom overlay buttons
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomReset = document.getElementById('btn-zoom-reset');

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        this.interaction.onWheel({ deltaY: -100, clientX: window.innerWidth / 2, clientY: window.innerHeight / 2, preventDefault: () => {} });
      });
    }

    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        this.interaction.onWheel({ deltaY: 100, clientX: window.innerWidth / 2, clientY: window.innerHeight / 2, preventDefault: () => {} });
      });
    }

    if (btnZoomReset) {
      btnZoomReset.addEventListener('click', () => {
        this.interaction.resetZoom();
      });
    }
  }

  handleToolClick(tool) {
    const centerX = (-this.state.viewport.x + (window.innerWidth / 2) - 200) / this.state.viewport.zoom;
    const centerY = (-this.state.viewport.y + (window.innerHeight / 2) - 50) / this.state.viewport.zoom;

    const jitterX = (Math.random() - 0.5) * 40;
    const jitterY = (Math.random() - 0.5) * 40;

    if (tool === 'entity') {
      const entity = this.state.addElement({
        name: `Entidade_${this.state.elements.size + 1}`,
        type: 'entity',
        x: Math.round(centerX + jitterX),
        y: Math.round(centerY + jitterY)
      });
      this.state.addAttribute(entity.id, {
        name: `id_${entity.name.toLowerCase()}`,
        attrType: 'primary'
      });
      this.state.select(entity.id);
    } else if (tool === 'relation') {
      const rel = this.state.addElement({
        name: `Relaciona_${this.state.elements.size + 1}`,
        type: 'relation',
        x: Math.round(centerX + jitterX),
        y: Math.round(centerY + jitterY)
      });
      this.state.select(rel.id);
    } else if (tool === 'attribute') {
      const selected = this.state.getSelectedElements();
      const parent = selected.find(el => el.type === 'entity' || el.type === 'relation');
      if (parent) {
        this.state.addAttribute(parent.id);
      } else {
        const attr = this.state.addElement({
          name: `atributo_${this.state.elements.size + 1}`,
          type: 'attribute',
          attrType: 'simple',
          x: Math.round(centerX + jitterX),
          y: Math.round(centerY + jitterY)
        });
        this.state.select(attr.id);
      }
    }
  }
}

window.Toolbar = Toolbar;
