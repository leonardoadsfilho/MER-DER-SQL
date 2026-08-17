/**
 * Application Entry Point & Module Orchestrator
 * Editor de MER v1.0
 */

class App {
  constructor() {
    this.init();
  }

  init() {
    // 1. Theme Manager
    this.theme = new window.ThemeManager('dark');

    // 2. Core State Store
    this.state = new window.DiagramState();

    // 3. Canvas Elements & Rendering
    const svgElement = document.getElementById('diagram-canvas');
    const viewportElement = document.getElementById('canvas-viewport');

    this.renderer = new window.CanvasRenderer(svgElement, this.state);
    this.interaction = new window.CanvasInteraction(svgElement, viewportElement, this.state);

    // 4. Services
    this.relational = new window.RelationalEngine();
    this.sqlGen = new window.SqlGenerator(this.relational);
    this.storage = new window.StorageService(this.state);
    this.exportPng = new window.ExportPngService(svgElement, this.theme, this.storage);

    // 5. Modals & Context Panel
    this.modals = new window.ModalManager(this.state, this.relational, this.sqlGen);
    this.contextPanel = new window.ContextPanel(document.getElementById('app-context-panel'), this.state, this.modals);

    // 6. Logical Relational Editor (Tab 2)
    this.logicalEditor = new window.LogicalEditor(
      document.getElementById('logical-viewport'),
      this.state,
      this.relational,
      this.sqlGen,
      this.modals,
      this.exportPng
    );

    // 7. Toolbar & Minimap
    this.toolbar = new window.Toolbar(
      document.getElementById('app-toolbar'),
      this.state,
      this.interaction,
      this.logicalEditor,
      this.exportPng,
      this.modals
    );

    this.minimap = new window.CanvasMinimap(
      document.getElementById('canvas-minimap-container'),
      this.state,
      svgElement,
      viewportElement
    );

    // 8. Navigation Tabs (MER vs DER)
    this.tabs = new window.TabsManager(
      this.logicalEditor,
      this.toolbar,
      this.contextPanel,
      this.state
    );

    // 9. Bind Header Actions
    this.bindHeaderActions();

    // 10. Initial Diagram or Load Autosave
    this.loadInitialDiagram();

    console.log('🚀 MER Studio v1.0 operacional.');
  }

  bindHeaderActions() {
    // Theme Toggle
    const btnTheme = document.getElementById('btn-toggle-theme');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const newTheme = this.theme.toggleTheme();
        this.modals.showToast(`Modo ${newTheme === 'dark' ? 'Escuro' : 'Claro'} ativado`, 'info');
      });
    }

    // Undo / Redo
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) {
      btnUndo.addEventListener('click', () => {
        if (this.state.undo()) {
          this.modals.showToast('Ação desfeita', 'info', 1500);
        }
      });
    }
    if (btnRedo) {
      btnRedo.addEventListener('click', () => {
        if (this.state.redo()) {
          this.modals.showToast('Ação refeita', 'info', 1500);
        }
      });
    }

    // Save JSON
    const btnSaveJson = document.getElementById('btn-save-json');
    if (btnSaveJson) {
      btnSaveJson.addEventListener('click', async () => {
        const saved = await this.storage.exportJSON();
        if (saved) {
          this.modals.showToast('Arquivo .json salvo com sucesso!', 'success');
        }
      });
    }

    // Load JSON (File Input)
    const btnLoadJson = document.getElementById('btn-load-json');
    const inputJsonFile = document.getElementById('input-json-file');

    if (btnLoadJson && inputJsonFile) {
      btnLoadJson.addEventListener('click', () => inputJsonFile.click());
      inputJsonFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            await this.storage.importJSON(file);
            this.modals.showToast(`Diagrama carregado de "${file.name}"`, 'success');
          } catch (err) {
            this.modals.showToast(err.message || 'Erro ao carregar arquivo.', 'error');
          }
          inputJsonFile.value = '';
        }
      });
    }

    // Export PNG (Black and White Academic Style)
    const btnExportPng = document.getElementById('btn-export-png');
    if (btnExportPng) {
      btnExportPng.addEventListener('click', async () => {
        try {
          this.modals.showToast('Renderizando imagem P&B acadêmica com asterisco...', 'info', 1500);
          await this.exportPng.exportPNG('diagrama-mer-academico.png', true);
          this.modals.showToast('Imagem PNG (Preto e Branco) gerada com sucesso!', 'success');
        } catch (err) {
          this.modals.showToast('Erro ao exportar PNG: ' + err.message, 'error');
        }
      });
    }

    // Open SQL Modal
    const btnOpenSql = document.getElementById('btn-generate-sql');
    if (btnOpenSql) {
      btnOpenSql.addEventListener('click', () => {
        this.modals.openSqlModal();
      });
    }

    // Copy SQL Button
    const btnCopySql = document.getElementById('btn-copy-sql');
    if (btnCopySql) {
      btnCopySql.addEventListener('click', () => {
        const textarea = document.getElementById('sql-code-output');
        if (textarea) {
          navigator.clipboard.writeText(textarea.value).then(() => {
            this.modals.showToast('Código SQL copiado para a área de transferência!', 'success');
          });
        }
      });
    }

    // Download .sql File Button
    const btnDownloadSql = document.getElementById('btn-download-sql');
    if (btnDownloadSql) {
      btnDownloadSql.addEventListener('click', async () => {
        const textarea = document.getElementById('sql-code-output');
        const sqlCode = textarea ? textarea.value : '';
        const blob = new Blob([sqlCode], { type: 'text/plain;charset=utf-8' });

        if (this.storage && this.storage.exportFile) {
          await this.storage.exportFile(blob, 'schema.sql', 'Script SQL', { 'text/plain': ['.sql'] });
          this.modals.showToast('Arquivo schema.sql salvo!', 'success');
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'schema.sql';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          this.modals.showToast('Arquivo schema.sql baixado!', 'success');
        }
      });
    }

    // Clear Diagram
    const btnClearDiagram = document.getElementById('btn-clear-canvas');
    if (btnClearDiagram) {
      btnClearDiagram.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja limpar todo o diagrama?')) {
          this.state.clearAll();
          this.modals.showToast('Diagrama limpo.', 'info');
        }
      });
    }
  }

  loadInitialDiagram() {
    const hasAutosave = this.storage.loadLocal();
    if (!hasAutosave || this.state.elements.size === 0) {
      this.createSampleTemplate();
    }
  }

  createSampleTemplate() {
    // 1. Cliente Entity + Attributes
    const cliente = this.state.addElement({
      name: 'Cliente',
      type: 'entity',
      x: 280,
      y: 260
    }, false);

    this.state.addAttribute(cliente.id, { name: 'id_cliente', attrType: 'primary', x: 180, y: 160 });
    this.state.addAttribute(cliente.id, { name: 'nome', attrType: 'simple', x: 280, y: 140 });
    this.state.addAttribute(cliente.id, { name: 'email', attrType: 'simple', x: 380, y: 160 });
    this.state.addAttribute(cliente.id, { name: 'telefones', attrType: 'multivalued', x: 160, y: 260 });

    // 2. Pedido Entity + Attributes
    const pedido = this.state.addElement({
      name: 'Pedido',
      type: 'entity',
      x: 740,
      y: 260
    }, false);

    this.state.addAttribute(pedido.id, { name: 'id_pedido', attrType: 'primary', x: 740, y: 140 });
    this.state.addAttribute(pedido.id, { name: 'data_pedido', attrType: 'simple', x: 860, y: 160 });
    this.state.addAttribute(pedido.id, { name: 'valor_total', attrType: 'simple', x: 860, y: 260 });

    // 3. Faz Relationship (1:N)
    const relFaz = this.state.addElement({
      name: 'Realiza',
      type: 'relation',
      x: 510,
      y: 260
    }, false);

    this.state.addConnection({
      fromId: cliente.id,
      toId: relFaz.id,
      type: 'relationship',
      cardinalityTo: '1'
    }, false);

    this.state.addConnection({
      fromId: relFaz.id,
      toId: pedido.id,
      type: 'relationship',
      cardinalityTo: 'N'
    }, false);

    this.state.select(cliente.id);
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.merApp = new App();
});
