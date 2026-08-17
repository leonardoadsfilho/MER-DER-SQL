/**
 * Storage Service
 * Handles JSON Export (with File System Access API), JSON Import & Local Autosave
 * Editor de MER v1.0
 */

class StorageService {
  constructor(state) {
    this.state = state;
    this.AUTOSAVE_KEY = 'mer_editor_autosave';
    this.DIR_PREF_KEY = 'mer_editor_saved_dir_handle';
    this.savedDirHandle = null;
    this.alwaysUseSavedDir = false;

    this.loadDirPreference();
  }

  loadDirPreference() {
    try {
      this.alwaysUseSavedDir = localStorage.getItem(this.DIR_PREF_KEY) === 'true';
    } catch (e) { /* ignore */ }
  }

  saveDirPreference(value) {
    this.alwaysUseSavedDir = value;
    try {
      localStorage.setItem(this.DIR_PREF_KEY, value ? 'true' : 'false');
    } catch (e) { /* ignore */ }
  }

  async exportJSON(filename = 'diagrama-mer.json') {
    const jsonStr = this.state.serialize();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });

    // Try File System Access API (showSaveFilePicker)
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Arquivo JSON',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (err) {
        if (err.name === 'AbortError') return false; // user cancelled
        // Fallback to download link below
      }
    }

    // Fallback: standard <a download>
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  async exportFile(blob, filename, description = 'Arquivo', accept = {}) {
    // Try File System Access API
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description, accept }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (err) {
        if (err.name === 'AbortError') return false;
        // Fallback below
      }
    }

    // Fallback
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const success = this.state.deserialize(e.target.result);
          if (success) {
            resolve(true);
          } else {
            reject(new Error('Formato de arquivo MER inválido.'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
      reader.readAsText(file);
    });
  }

  saveLocal() {
    try {
      localStorage.setItem(this.AUTOSAVE_KEY, this.state.serialize());
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }

  loadLocal() {
    try {
      const saved = localStorage.getItem(this.AUTOSAVE_KEY);
      if (saved) {
        return this.state.deserialize(saved);
      }
    } catch (e) {
      console.warn('LocalStorage load failed', e);
    }
    return false;
  }
}

window.StorageService = StorageService;
