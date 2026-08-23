/**
 * Application Entry Point & Module Orchestrator
 * Editor de MER v1.0
 */

class App {
  constructor() {
    this.init();
  }

  init() {
    document.documentElement.classList.toggle('touch-device', navigator.maxTouchPoints > 0);
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
    this.modals = new window.ModalManager(this.state, this.relational);
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
      this.state,
      this.sqlGen
    );
    this.state.on('change', () => {
      if (this.tabs.activeTab !== 'sql') return;
      const output = document.getElementById('sql-code-output');
      if (output) output.value = this.sqlGen.generateDDL(this.state);
    });

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

    // Copy SQL Button
    const btnCopySql = document.getElementById('btn-copy-sql');
    if (btnCopySql) {
      btnCopySql.addEventListener('click', async () => {
        const textarea = document.getElementById('sql-code-output');
        if (textarea) {
          try {
            if (navigator.clipboard && window.isSecureContext) {
              await navigator.clipboard.writeText(textarea.value);
            } else {
              textarea.select();
              document.execCommand('copy');
              textarea.setSelectionRange(0, 0);
            }
            this.modals.showToast('Código SQL copiado para a área de transferência!', 'success');
          } catch (error) {
            this.modals.showToast('Não foi possível copiar o SQL.', 'error');
          }
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
    this.storage.loadLocal();
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.merApp = new App();
});
