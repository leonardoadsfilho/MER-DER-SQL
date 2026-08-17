/**
 * PNG Exporter Service (Academic & Clean Black & White Mode)
 * Renders SVG canvas to clean B&W line art with PK marked with asterisk (*)
 * Also supports exporting DER Logical Model as PNG
 * Editor de MER v1.0
 */

class ExportPngService {
  constructor(svgElement, themeManager, storageService) {
    this.svg = svgElement;
    this.theme = themeManager;
    this.storage = storageService;
  }

  async exportPNG(filename = 'diagrama-mer-academico.png', isBlackAndWhite = true) {
    return new Promise((resolve, reject) => {
      try {
        const svgClone = this.svg.cloneNode(true);
        const rect = this.svg.getBoundingClientRect();
        const width = Math.max(rect.width, 1400);
        const height = Math.max(rect.height, 900);

        svgClone.setAttribute('width', width);
        svgClone.setAttribute('height', height);

        // Remove background grid and handles from export clone
        const bgPatternRects = svgClone.querySelectorAll('rect[fill^="url(#"]');
        bgPatternRects.forEach(r => r.remove());

        const handles = svgClone.querySelectorAll('.connect-handle, .connection-hitbox');
        handles.forEach(h => h.remove());

        if (isBlackAndWhite) {
          svgClone.querySelectorAll('.shape-entity, .shape-relation, .shape-attribute, .shape-multivalued-outer, .shape-multivalued-inner, .cardinality-pill').forEach(el => {
            el.setAttribute('fill', '#ffffff');
            el.setAttribute('stroke', '#000000');
            el.setAttribute('stroke-width', '1.75px');
            el.style.filter = 'none';
          });

          svgClone.querySelectorAll('.shape-multivalued-inner').forEach(el => {
            el.setAttribute('fill', 'transparent');
            el.setAttribute('stroke', '#000000');
            el.setAttribute('stroke-width', '1.5px');
          });

          svgClone.querySelectorAll('.diagram-node.attribute-derived .shape-attribute').forEach(el => {
            el.setAttribute('stroke-dasharray', '4 3');
          });

          svgClone.querySelectorAll('.connection-line').forEach(line => {
            line.setAttribute('stroke', '#000000');
            line.setAttribute('stroke-width', '1.5px');
            line.style.filter = 'none';
          });

          svgClone.querySelectorAll('text').forEach(t => {
            t.setAttribute('fill', '#000000');
            t.style.fill = '#000000';
            t.style.fontFamily = 'Inter, Arial, sans-serif';
          });

          svgClone.querySelectorAll('.diagram-node.attribute-primary text').forEach(t => {
            if (!t.textContent.startsWith('*')) {
              t.textContent = `*${t.textContent}`;
            }
            t.setAttribute('font-weight', 'bold');
            t.setAttribute('text-decoration', 'underline');
          });
        }

        const svgString = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URLObj = window.URL || window.webkitURL || window;
        const blobURL = URLObj.createObjectURL(svgBlob);

        const image = new Image();
        image.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = width * 2;
          canvas.height = height * 2;

          const ctx = canvas.getContext('2d');
          ctx.scale(2, 2);

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(image, 0, 0, width, height);

          URLObj.revokeObjectURL(blobURL);

          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error('Falha ao gerar imagem PNG.'));
              return;
            }

            // Use File System Access API through storage if available
            if (this.storage && this.storage.exportFile) {
              const saved = await this.storage.exportFile(blob, filename, 'Imagem PNG', { 'image/png': ['.png'] });
              resolve(saved);
            } else {
              const pngUrl = URLObj.createObjectURL(blob);
              const downloadLink = document.createElement('a');
              downloadLink.href = pngUrl;
              downloadLink.download = filename;
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
              URLObj.revokeObjectURL(pngUrl);
              resolve(true);
            }
          }, 'image/png');
        };

        image.onerror = () => {
          URLObj.revokeObjectURL(blobURL);
          reject(new Error('Erro na renderização da imagem SVG.'));
        };

        image.src = blobURL;
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Export DER Logical Model as PNG
   * Programmatically draws tables/columns on a canvas
   */
  async exportDerPNG(tables, filename = 'modelo-logico-der.png') {
    return new Promise(async (resolve, reject) => {
      try {
        if (!tables || tables.length === 0) {
          reject(new Error('Nenhuma tabela no modelo lógico para exportar.'));
          return;
        }

        const CARD_W = 280;
        const HEADER_H = 34;
        const ROW_H = 22;
        const CARD_PAD = 24;
        const COLS_PER_ROW = 3;
        const MARGIN = 40;

        // Calculate grid layout
        const cardHeights = tables.map(t => HEADER_H + t.columns.length * ROW_H + 8);
        const rows = Math.ceil(tables.length / COLS_PER_ROW);
        const maxRowHeights = [];
        for (let r = 0; r < rows; r++) {
          let maxH = 0;
          for (let c = 0; c < COLS_PER_ROW; c++) {
            const idx = r * COLS_PER_ROW + c;
            if (idx < cardHeights.length) maxH = Math.max(maxH, cardHeights[idx]);
          }
          maxRowHeights.push(maxH);
        }

        const totalW = MARGIN * 2 + COLS_PER_ROW * (CARD_W + CARD_PAD) - CARD_PAD;
        const totalH = MARGIN * 2 + maxRowHeights.reduce((s, h) => s + h + CARD_PAD, 0) - CARD_PAD + 50;

        const canvas = document.createElement('canvas');
        canvas.width = totalW * 2;
        canvas.height = totalH * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalW, totalH);

        // Title
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Inter, Arial, sans-serif';
        ctx.fillText('Modelo Lógico Relacional (DER) — MER Studio v1.0', MARGIN, MARGIN - 10);

        let cursorY = MARGIN + 20;

        tables.forEach((table, tIdx) => {
          const col = tIdx % COLS_PER_ROW;
          const row = Math.floor(tIdx / COLS_PER_ROW);

          const x = MARGIN + col * (CARD_W + CARD_PAD);
          let y = MARGIN + 20;
          for (let r = 0; r < row; r++) y += maxRowHeights[r] + CARD_PAD;

          const cardH = HEADER_H + table.columns.length * ROW_H + 8;

          // Card border
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, CARD_W, cardH);

          // Header bg
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(x, y, CARD_W, HEADER_H);
          ctx.strokeRect(x, y, CARD_W, HEADER_H);

          // Table name
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 13px Inter, Arial, sans-serif';
          ctx.fillText(table.name + (table.isAssociative ? ' (Associativa)' : ''), x + 8, y + 22);

          // Columns
          ctx.font = '12px "JetBrains Mono", monospace';
          table.columns.forEach((colData, cIdx) => {
            const rowY = y + HEADER_H + cIdx * ROW_H + 16;
            let prefix = '  ';
            if (colData.isPk) prefix = '🔑 ';
            if (colData.isFk) prefix = '🔗 ';
            if (colData.isPk && colData.isFk) prefix = '🔑🔗';

            const colText = `${prefix}${colData.name} : ${colData.type}`;
            ctx.fillStyle = '#000000';
            ctx.fillText(colText, x + 8, rowY);

            if (colData.isPk) {
              const textWidth = ctx.measureText(`${prefix}${colData.name}`).width;
              ctx.beginPath();
              ctx.moveTo(x + 8 + ctx.measureText(prefix).width, rowY + 2);
              ctx.lineTo(x + 8 + textWidth, rowY + 2);
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          });
        });

        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('Falha ao gerar imagem PNG do DER.'));
            return;
          }
          if (this.storage && this.storage.exportFile) {
            const saved = await this.storage.exportFile(blob, filename, 'Imagem PNG', { 'image/png': ['.png'] });
            resolve(saved);
          } else {
            const pngUrl = URL.createObjectURL(blob);
            const dl = document.createElement('a');
            dl.href = pngUrl;
            dl.download = filename;
            document.body.appendChild(dl);
            dl.click();
            document.body.removeChild(dl);
            URL.revokeObjectURL(pngUrl);
            resolve(true);
          }
        }, 'image/png');

      } catch (err) {
        reject(err);
      }
    });
  }
}

window.ExportPngService = ExportPngService;
