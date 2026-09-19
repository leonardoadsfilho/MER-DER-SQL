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
    this.sqlParser = new window.SqlParser();
    this.reverseEngineering = new window.ReverseEngineeringService(this.state, this.sqlParser);
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
      this.updateStatusBar();
      if (this.tabs.activeTab !== 'sql') return;
      const output = document.getElementById('sql-code-output');
      if (output) output.innerHTML = this.sqlGen.generateDDL(this.state, true);
    });
    this.state.on('viewport:changed', () => this.updateStatusBar());

    // 9. Bind Header Actions
    this.bindHeaderActions();

    // 10. Initial Diagram or Load Autosave
    this.loadInitialDiagram();
    this.updateStatusBar();

    console.log('🚀 MER Studio v2.1 operacional.');
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
        const output = document.getElementById('sql-code-output');
        if (output) {
          const sqlText = output.innerText || output.textContent;
          try {
            if (navigator.clipboard && window.isSecureContext) {
              await navigator.clipboard.writeText(sqlText);
            } else {
              const tempInput = document.createElement('textarea');
              tempInput.value = sqlText;
              document.body.appendChild(tempInput);
              tempInput.select();
              document.execCommand('copy');
              document.body.removeChild(tempInput);
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
        const output = document.getElementById('sql-code-output');
        const sqlCode = output ? (output.innerText || output.textContent) : '';
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

    // Reverse Engineering: Import SQL Modal & File Upload
    const btnOpenSqlImport = document.getElementById('btn-import-sql-modal');
    const btnUploadSqlDirect = document.getElementById('btn-upload-sql-direct');
    const modalSqlImport = document.getElementById('modal-sql-import');
    const btnCloseSqlImport = document.getElementById('btn-close-sql-import');
    const btnCancelSqlImport = document.getElementById('btn-cancel-sql-import');
    const btnConfirmSqlImport = document.getElementById('btn-confirm-sql-import');
    const textareaImportSql = document.getElementById('textarea-import-sql');
    const inputSqlFileUpload = document.getElementById('input-sql-file-upload');
    const btnBrowseSqlFile = document.getElementById('btn-browse-sql-file');
    const dropzoneSql = document.getElementById('dropzone-sql-file');
    const selectedFileName = document.getElementById('sql-file-selected-name');

    const closeImportModal = () => {
      if (modalSqlImport) modalSqlImport.classList.remove('active');
      if (selectedFileName) selectedFileName.style.display = 'none';
    };

    if (btnOpenSqlImport && modalSqlImport) {
      btnOpenSqlImport.addEventListener('click', () => {
        modalSqlImport.classList.add('active');
        if (textareaImportSql) {
          setTimeout(() => textareaImportSql.focus(), 100);
        }
      });
    }

    if (btnBrowseSqlFile && inputSqlFileUpload) {
      btnBrowseSqlFile.addEventListener('click', () => inputSqlFileUpload.click());
    }

    if (btnUploadSqlDirect && inputSqlFileUpload) {
      btnUploadSqlDirect.addEventListener('click', () => inputSqlFileUpload.click());
    }

    const processSqlFile = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        if (textareaImportSql) textareaImportSql.value = content;
        if (selectedFileName) {
          selectedFileName.textContent = `Arquivo carregado: ${file.name} (${Math.round(file.size / 1024 * 10) / 10} KB)`;
          selectedFileName.style.display = 'block';
        }
        if (modalSqlImport && !modalSqlImport.classList.contains('active')) {
          modalSqlImport.classList.add('active');
        }
        this.modals.showToast(`Arquivo "${file.name}" carregado. Clique em Gerar Diagramas para confirmar.`, 'info');
      };
      reader.onerror = () => {
        this.modals.showToast('Erro ao ler o arquivo SQL.', 'error');
      };
      reader.readAsText(file, 'UTF-8');
    };

    if (inputSqlFileUpload) {
      inputSqlFileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          processSqlFile(file);
          inputSqlFileUpload.value = '';
        }
      });
    }

    // Drag and Drop on Dropzone
    if (dropzoneSql) {
      dropzoneSql.addEventListener('click', (e) => {
        if (e.target !== btnBrowseSqlFile && inputSqlFileUpload) {
          inputSqlFileUpload.click();
        }
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzoneSql.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzoneSql.classList.add('drag-active');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzoneSql.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzoneSql.classList.remove('drag-active');
        });
      });

      dropzoneSql.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt && dt.files[0];
        if (file) {
          processSqlFile(file);
        }
      });
    }

    if (btnCloseSqlImport) btnCloseSqlImport.addEventListener('click', closeImportModal);
    if (btnCancelSqlImport) btnCancelSqlImport.addEventListener('click', closeImportModal);

    if (btnConfirmSqlImport && textareaImportSql) {
      btnConfirmSqlImport.addEventListener('click', () => {
        const sqlText = textareaImportSql.value;
        const result = this.reverseEngineering.importSql(sqlText);

        if (result.success) {
          closeImportModal();
          textareaImportSql.value = '';
          this.modals.showToast(`Engenharia Reversa concluída! ${result.tablesCount} tabela(s) importada(s).`, 'success');
          // Switch to conceptual MER diagram tab so the user sees the generated model
          this.tabs.switchTab('conceptual');
        } else {
          this.modals.showToast(result.error || 'Erro ao importar SQL.', 'error');
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

  updateStatusBar() {
    const summaryEl = document.getElementById('status-model-summary');
    const zoomEl = document.getElementById('status-zoom-level');
    if (!summaryEl) return;

    let entityCount = 0;
    let relationCount = 0;
    this.state.elements.forEach(el => {
      if (el.type === 'entity') entityCount++;
      else if (el.type === 'relation') relationCount++;
    });

    const tables = this.relational ? this.relational.generateRelationalSchema(this.state) : [];
    summaryEl.textContent = `${entityCount} Entidade(s) | ${relationCount} Relação(ões) | ${tables.length} Tabela(s)`;

    if (zoomEl) {
      const currentZoom = Math.round((this.state.viewport.zoom || 1) * 100);
      zoomEl.textContent = `Zoom: ${currentZoom}%`;
    }
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.merApp = new App();
});
