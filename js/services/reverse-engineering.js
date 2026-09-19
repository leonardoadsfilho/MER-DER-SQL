/**
 * Reverse Engineering Service
 * Converts parsed SQL tables into Conceptual Diagram (MER) elements, relationships,
 * and Logical Model (DER) state with automated layout.
 * Editor de MER Conceptual v2.0
 */

class ReverseEngineeringService {
  constructor(state, sqlParser) {
    this.state = state;
    this.sqlParser = sqlParser;
  }

  /**
   * Reconstructs MER and DER from SQL DDL script.
   * @param {string} sqlText
   * @returns {Object} { success: boolean, tablesCount: number, error?: string }
   */
  importSql(sqlText) {
    if (!sqlText || !sqlText.trim()) {
      return { success: false, error: 'O texto SQL fornecido está vazio.' };
    }

    let tables = [];
    try {
      tables = this.sqlParser.parse(sqlText);
    } catch (err) {
      return { success: false, error: `Erro de análise sintática no SQL: ${err.message}` };
    }

    if (!tables || tables.length === 0) {
      return { success: false, error: 'Nenhuma instrução CREATE TABLE válida foi encontrada no script SQL.' };
    }

    // Save history snapshot before clearing
    this.state.pushSnapshot();
    this.state.clearAll();

    // Map table names to entity elements
    const tableToEntityMap = new Map();
    const associativeTables = [];
    const regularTables = [];

    // 1. Separate regular entity tables from associative/junction tables
    tables.forEach(table => {
      const fkCols = table.columns.filter(c => c.isFk);
      const pkCols = table.columns.filter(c => c.isPk);

      const isAssociative = (pkCols.length >= 2 && pkCols.every(c => c.isFk)) ||
                            (fkCols.length >= 2 && table.columns.length <= fkCols.length + 3);

      if (isAssociative && fkCols.length >= 2) {
        associativeTables.push(table);
      } else {
        regularTables.push(table);
      }
    });

    // 2. Create Conceptual Entities for Regular Tables
    const colsCount = Math.max(1, Math.ceil(Math.sqrt(regularTables.length + associativeTables.length)));
    const cellWidth = 420;
    const cellHeight = 320;
    const startX = 220;
    const startY = 180;

    regularTables.forEach((table, index) => {
      const colIndex = index % colsCount;
      const rowIndex = Math.floor(index / colsCount);
      const x = startX + colIndex * cellWidth;
      const y = startY + rowIndex * cellHeight;

      const entity = this.state.addElement({
        name: table.name,
        type: 'entity',
        x,
        y
      }, false);

      tableToEntityMap.set(table.name.toLowerCase(), entity);

      // Save DER position in logical layout
      this.state.logicalLayout[entity.id] = {
        x: 60 + (index % 3) * 360,
        y: 60 + Math.floor(index / 3) * 320
      };

      // Create attributes for non-FK columns (or PK columns even if marked as reference)
      const nonFkCols = table.columns.filter(c => !c.isFk || c.isPk);
      nonFkCols.forEach((col, attrIdx) => {
        const radius = 110 + (Math.floor(attrIdx / 8) * 40);
        const angle = (attrIdx * (Math.PI / 4)) - (Math.PI / 2);
        const attrX = Math.round(x + Math.cos(angle) * radius);
        const attrY = Math.round(y + Math.sin(angle) * radius);

        this.state.addElement({
          name: col.name,
          type: 'attribute',
          attrType: col.isPk ? 'primary' : 'simple',
          sqlType: col.type,
          parentId: entity.id,
          x: attrX,
          y: attrY
        }, false);
      });
    });

    // 3. Process Associative Tables (N:N or N-ary relationships)
    associativeTables.forEach((table, index) => {
      const fkCols = table.columns.filter(c => c.isFk && c.refTable);
      const participatingEntities = [];

      fkCols.forEach(fk => {
        const targetEntity = tableToEntityMap.get(fk.refTable.toLowerCase());
        if (targetEntity && !participatingEntities.some(p => p.id === targetEntity.id)) {
          participatingEntities.push(targetEntity);
        }
      });

      // Calculate centroid position for the relation diamond
      let relX = startX + (regularTables.length + index) * 160;
      let relY = startY + 200;

      if (participatingEntities.length > 0) {
        const avgX = participatingEntities.reduce((sum, e) => sum + e.x, 0) / participatingEntities.length;
        const avgY = participatingEntities.reduce((sum, e) => sum + e.y, 0) / participatingEntities.length;
        relX = Math.round(avgX);
        relY = Math.round(avgY + (index % 2 === 0 ? 30 : -30));
      }

      const relation = this.state.addElement({
        name: table.name,
        type: 'relation',
        x: relX,
        y: relY
      }, false);

      // Connect relation to all participating entities
      participatingEntities.forEach(ent => {
        this.state.addConnection({
          fromId: relation.id,
          toId: ent.id,
          type: 'relationship',
          cardinalityTo: 'N'
        }, false);
      });

      // Add non-FK columns as relationship attributes
      const relAttrCols = table.columns.filter(c => !c.isFk);
      relAttrCols.forEach((col, aIdx) => {
        const angle = (aIdx * (Math.PI / 3)) + (Math.PI / 2);
        const radius = 95;
        this.state.addElement({
          name: col.name,
          type: 'attribute',
          attrType: 'simple',
          sqlType: col.type,
          parentId: relation.id,
          x: Math.round(relX + Math.cos(angle) * radius),
          y: Math.round(relY + Math.sin(angle) * radius)
        }, false);
      });
    });

    // 4. Process Direct 1:N Foreign Keys between Regular Tables
    const processedDirectRels = new Set();

    regularTables.forEach(table => {
      const sourceEntity = tableToEntityMap.get(table.name.toLowerCase());
      if (!sourceEntity) return;

      const directFks = table.columns.filter(c => c.isFk && c.refTable && !c.isPk);

      directFks.forEach(fk => {
        const targetEntity = tableToEntityMap.get(fk.refTable.toLowerCase());
        if (!targetEntity || targetEntity.id === sourceEntity.id) return;

        const relPairKey = [sourceEntity.id, targetEntity.id].sort().join('::');
        if (processedDirectRels.has(relPairKey)) return;
        processedDirectRels.add(relPairKey);

        const midX = Math.round((sourceEntity.x + targetEntity.x) / 2);
        const midY = Math.round((sourceEntity.y + targetEntity.y) / 2);

        const relationName = `rel_${targetEntity.name}_${sourceEntity.name}`;
        const relation = this.state.addElement({
          name: relationName,
          type: 'relation',
          x: midX,
          y: midY
        }, false);

        // Referenced entity is side 1
        this.state.addConnection({
          fromId: targetEntity.id,
          toId: relation.id,
          type: 'relationship',
          cardinalityTo: '1'
        }, false);

        // Entity with FK is side N
        this.state.addConnection({
          fromId: relation.id,
          toId: sourceEntity.id,
          type: 'relationship',
          cardinalityTo: 'N'
        }, false);
      });
    });

    this.state.emit('change', { type: 'reverse-engineering:complete' });
    return { success: true, tablesCount: tables.length };
  }
}

window.ReverseEngineeringService = ReverseEngineeringService;
