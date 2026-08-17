/**
 * Navigation Tabs Manager
 * Controls switching between Diagrama Conceitual (MER) and Modelo Lógico (DER)
 * Hides Context Panel on DER tab
 * Editor de MER v1.0
 */

class TabsManager {
  constructor(logicalEditor, toolbar, contextPanel, state) {
    this.logicalEditor = logicalEditor;
    this.toolbar = toolbar;
    this.contextPanel = contextPanel;
    this.state = state;

    this.activeTab = 'conceptual'; // 'conceptual' or 'logical'

    this.init();
  }

  init() {
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    // 1. Update Tab Header Buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 2. Toggle Viewports
    const viewConceptual = document.getElementById('canvas-viewport');
    const viewLogical = document.getElementById('logical-viewport');
    const toolbarConceptual = document.getElementById('toolbar-conceptual-tools');
    const toolbarLogical = document.getElementById('toolbar-logical-tools');
    const contextPanel = document.getElementById('app-context-panel');

    if (tabName === 'conceptual') {
      if (viewConceptual) viewConceptual.style.display = 'block';
      if (viewLogical) viewLogical.style.display = 'none';
      if (toolbarConceptual) toolbarConceptual.style.display = 'flex';
      if (toolbarLogical) toolbarLogical.style.display = 'none';
      // Show Context Panel in MER tab
      if (contextPanel) contextPanel.style.display = 'flex';
      this.state.emit('change', { type: 'tab:switched' });
    } else {
      if (viewConceptual) viewConceptual.style.display = 'none';
      if (viewLogical) viewLogical.style.display = 'block';
      if (toolbarConceptual) toolbarConceptual.style.display = 'none';
      if (toolbarLogical) toolbarLogical.style.display = 'flex';
      // Hide Context Panel in DER tab
      if (contextPanel) contextPanel.style.display = 'none';
      if (this.logicalEditor) {
        this.logicalEditor.syncFromState();
      }
    }
  }
}

window.TabsManager = TabsManager;
