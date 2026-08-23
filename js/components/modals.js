/**
 * Modal & Toast Notification Manager
 * Editor de MER Conceptual v2.0
 */

class ModalManager {
  constructor(state, relationalEngine) {
    this.state = state;
    this.relational = relationalEngine;

    this.activeModal = null;
    this.toastContainer = document.getElementById('toast-container') || this.createToastContainer();

    this.init();
  }

  createToastContainer() {
    const div = document.createElement('div');
    div.id = 'toast-container';
    div.className = 'toast-container';
    document.body.appendChild(div);
    return div;
  }

  init() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.closeModal(this.activeModal);
      }
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.closeModal(backdrop);
        }
      });

      const closeBtns = backdrop.querySelectorAll('[data-close-modal]');
      closeBtns.forEach(btn => {
        btn.addEventListener('click', () => this.closeModal(backdrop));
      });
    });
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('active');
    this.activeModal = modal;
  }

  closeModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('active');
    this.activeModal = null;
  }

  showToast(message, type = 'success', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '✔';
    if (type === 'error') icon = '✖';
    if (type === 'info') icon = 'ℹ';

    toast.innerHTML = `
      <span style="font-size: 16px;">${icon}</span>
      <span style="flex: 1;">${message}</span>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  openRelationalModal() {
    const tables = this.relational.generateRelationalSchema(this.state);
    const container = document.getElementById('relational-tables-container');

    if (!container) return;

    if (tables.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p style="font-weight: 600;">Nenhuma tabela pôde ser gerada.</p>
          <p style="font-size: var(--font-size-xs);">Adicione Entidades com atributos ao diagrama para visualizar o Modelo Relacional Lógico.</p>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="relational-tables-grid">
          ${tables.map(table => `
            <div class="relational-table-card">
              <div class="relational-table-header">
                <span>📁 ${table.name}</span>
                <span class="badge ${table.isAssociative ? 'badge-fk' : 'badge-pk'}">${table.isAssociative ? 'Associativa' : 'Tabela'}</span>
              </div>
              <div class="relational-columns-list">
                ${table.columns.map(col => `
                  <div class="relational-column-row">
                    <div class="relational-col-name">
                      ${col.isPk ? '<span class="badge badge-pk">PK</span>' : ''}
                      ${col.isFk ? '<span class="badge badge-fk">FK</span>' : ''}
                      ${!col.isPk && !col.isFk ? '<span class="badge badge-simple">COL</span>' : ''}
                      <span>${col.name}</span>
                    </div>
                    <div class="relational-col-type">${col.type}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    this.openModal('modal-relational');
  }

  openWizard(sourceEntityId) {
    const sourceEntity = this.state.elements.get(sourceEntityId);
    if (!sourceEntity) return;

    const sourceNameLabel = document.getElementById('wizard-source-name');
    const inputRelName = document.getElementById('wizard-rel-name');
    const inputTargetName = document.getElementById('wizard-target-name');
    const selCardSource = document.getElementById('wizard-card-source');
    const selCardTarget = document.getElementById('wizard-card-target');
    const btnConfirm = document.getElementById('btn-wizard-confirm');

    if (sourceNameLabel) sourceNameLabel.textContent = sourceEntity.name;
    if (inputRelName) inputRelName.value = 'Pertence_A';
    if (inputTargetName) inputTargetName.value = 'Departamento';

    const handleConfirm = () => {
      const relName = inputRelName ? inputRelName.value.trim() : 'Relaciona';
      const targetName = inputTargetName ? inputTargetName.value.trim() : 'Destino';
      const cardSrc = selCardSource ? selCardSource.value : '1';
      const cardTgt = selCardTarget ? selCardTarget.value : 'N';

      this.state.quickRelationWizard(sourceEntityId, relName, targetName, cardSrc, cardTgt);
      this.closeModal(document.getElementById('modal-wizard'));
      this.showToast(`Relacionamento "${relName}" e Entidade "${targetName}" criados com sucesso!`, 'success');
      btnConfirm.removeEventListener('click', handleConfirm);
    };

    if (btnConfirm) {
      const newBtn = btnConfirm.cloneNode(true);
      btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);
      newBtn.addEventListener('click', handleConfirm);
    }

    this.openModal('modal-wizard');
  }
}

window.ModalManager = ModalManager;
