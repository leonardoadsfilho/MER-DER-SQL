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
        const sourceRoot = this.svg.querySelector('#canvas-root-group');
        const cloneRoot = svgClone.querySelector('#canvas-root-group');
        const margin = 60;
        let bounds = null;
        try {
          const measured = sourceRoot && sourceRoot.getBBox();
          if (measured && measured.width > 0 && measured.height > 0) bounds = measured;
        } catch (error) {
          // getBBox can fail while the SVG is detached/hidden; viewport is a
          // safe fallback, but never influences normal populated exports.
        }

        const width = bounds ? Math.max(200, Math.ceil(bounds.width + margin * 2)) : Math.max(rect.width, 800);
        const height = bounds ? Math.max(160, Math.ceil(bounds.height + margin * 2)) : Math.max(rect.height, 600);

        svgClone.setAttribute('width', width);
        svgClone.setAttribute('height', height);
        svgClone.setAttribute('viewBox', bounds
          ? `${bounds.x - margin} ${bounds.y - margin} ${width} ${height}`
          : `0 0 ${width} ${height}`);
        svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // Pan and zoom belong only to the editor camera. Export the world
        // coordinates themselves so a distant minimap/viewport never crops
        // or displaces the model.
        if (cloneRoot) cloneRoot.removeAttribute('transform');

        // Remove background grid and handles from export clone
        const bgPatternRects = svgClone.querySelectorAll('rect[fill^="url(#"]');
        bgPatternRects.forEach(r => r.remove());

        const handles = svgClone.querySelectorAll('.connect-handle, .connection-hitbox, .name-edit-caret');
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

        this.prepareMerClone(svgClone);

        const svgString = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URLObj = window.URL || window.webkitURL || window;
        const blobURL = URLObj.createObjectURL(svgBlob);

        const image = new Image();
        image.onload = async () => {
          const canvas = document.createElement('canvas');
          const outputScale = Math.max(0.25, Math.min(2, 8192 / width, 8192 / height));
          canvas.width = Math.round(width * outputScale);
          canvas.height = Math.round(height * outputScale);

          const ctx = canvas.getContext('2d');
          ctx.scale(outputScale, outputScale);

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

  prepareMerClone(svgClone) {
    const measureCanvas = document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');

    svgClone.querySelectorAll('.diagram-node').forEach(node => {
      const text = node.querySelector(':scope > text');
      if (!text) return;

      let font = '500 12px Inter, Arial, sans-serif';
      let fontSize = 12;
      let fontWeight = '500';
      if (node.classList.contains('entity')) {
        font = '700 14px Inter, Arial, sans-serif';
        fontSize = 14;
        fontWeight = '700';
      } else if (node.classList.contains('relation')) {
        font = '600 13px Inter, Arial, sans-serif';
        fontSize = 13;
        fontWeight = '600';
      } else if (node.classList.contains('attribute-primary')) {
        font = '700 12px Inter, Arial, sans-serif';
        fontWeight = '700';
      }

      ctx.font = font;
      const textWidth = Math.ceil(ctx.measureText(text.textContent || ' ').width);
      text.setAttribute('font-family', 'Inter, Arial, sans-serif');
      text.setAttribute('font-size', String(fontSize));
      text.setAttribute('font-weight', fontWeight);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('alignment-baseline', 'middle');

      if (node.classList.contains('entity')) {
        const shape = node.querySelector('.shape-entity');
        if (!shape) return;
        const oldWidth = parseFloat(shape.getAttribute('width')) || 130;
        const height = Math.max(parseFloat(shape.getAttribute('height')) || 48, fontSize + 28);
        const width = Math.max(oldWidth, textWidth + 52);
        shape.setAttribute('width', width);
        shape.setAttribute('height', height);
        text.setAttribute('x', width / 2);
        text.setAttribute('y', height / 2);

        const transform = node.getAttribute('transform') || '';
        const match = transform.match(/translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/);
        if (match && width !== oldWidth) {
          node.setAttribute('transform', `translate(${parseFloat(match[1]) - (width - oldWidth) / 2}, ${parseFloat(match[2])})`);
        }
      } else if (node.classList.contains('relation')) {
        const shape = node.querySelector('.shape-relation');
        if (!shape) return;
        const width = Math.max(110, textWidth + 64);
        const height = Math.max(56, width * 0.52, fontSize + 32);
        shape.setAttribute('points', `0,${-height / 2} ${width / 2},0 0,${height / 2} ${-width / 2},0`);
        text.setAttribute('x', '0');
        text.setAttribute('y', '0');
      } else if (node.classList.contains('attribute')) {
        const rx = Math.max(45, (textWidth + 38) / 2);
        const ry = Math.max(20, (fontSize + 24) / 2);
        node.querySelectorAll('.shape-attribute, .shape-multivalued-outer').forEach(shape => {
          shape.setAttribute('rx', rx);
          shape.setAttribute('ry', ry);
        });
        node.querySelectorAll('.shape-multivalued-inner').forEach(shape => {
          shape.setAttribute('rx', Math.max(1, rx - 4));
          shape.setAttribute('ry', Math.max(1, ry - 4));
        });
        text.setAttribute('x', '0');
        text.setAttribute('y', '0');
      }
    });

    // Inline cardinality alignment as external stylesheets are not available
    // after the SVG is serialized into an image.
    svgClone.querySelectorAll('.cardinality-text').forEach(text => {
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('alignment-baseline', 'middle');
      text.setAttribute('font-family', 'JetBrains Mono, monospace');
      text.setAttribute('font-size', '11');
    });
  }

  /**
   * Export DER Logical Model as PNG
   * Programmatically draws tables/columns on a canvas
   */
  async exportDerPNG(tables, filename = 'modelo-logico-der.png', logicalLayout = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!tables || tables.length === 0) {
          reject(new Error('Nenhuma tabela no modelo lógico para exportar.'));
          return;
        }

        const CARD_W = 280;
        const HEADER_H = 34;
        const ROW_H = 22;
        const MARGIN = 40;
        const cardHeights = tables.map(t => HEADER_H + t.columns.length * ROW_H + 8);
        const positions = tables.map((table, index) => logicalLayout[table.id || table.name] || {
          x: (index % 3) * 330,
          y: Math.floor(index / 3) * 300
        });
        const minX = Math.min(...positions.map(p => p.x));
        const minY = Math.min(...positions.map(p => p.y));
        const maxX = Math.max(...positions.map(p => p.x + CARD_W));
        const maxY = Math.max(...positions.map((p, index) => p.y + cardHeights[index]));
        const totalW = maxX - minX + MARGIN * 2;
        const totalH = maxY - minY + MARGIN * 2 + 30;

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

        // FK lines preserve the same spatial relationships visible in DER.
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#666666';
        tables.forEach((table, tableIndex) => {
          table.columns.forEach((column, columnIndex) => {
            if (!column.isFk || !column.refTable || !column.refColumn) return;
            const targetIndex = tables.findIndex(item => item.name === column.refTable);
            if (targetIndex < 0) return;
            const targetColumn = tables[targetIndex].columns.findIndex(item => item.name === column.refColumn);
            if (targetColumn < 0) return;
            const sourcePos = positions[tableIndex];
            const targetPos = positions[targetIndex];
            ctx.beginPath();
            ctx.moveTo(sourcePos.x - minX + MARGIN + CARD_W / 2, sourcePos.y - minY + MARGIN + HEADER_H + columnIndex * ROW_H + ROW_H / 2);
            ctx.lineTo(targetPos.x - minX + MARGIN + CARD_W / 2, targetPos.y - minY + MARGIN + HEADER_H + targetColumn * ROW_H + ROW_H / 2);
            ctx.stroke();
          });
        });
        ctx.setLineDash([]);

        tables.forEach((table, tIdx) => {
          const x = positions[tIdx].x - minX + MARGIN;
          const y = positions[tIdx].y - minY + MARGIN;

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
