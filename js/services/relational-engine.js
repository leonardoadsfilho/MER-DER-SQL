/**
 * Relational Schema Engine
 * Converts Conceptual MER into Logical Relational Tables (1:1, 1:N, N:N)
 * Supports expansion of Composite attributes into individual columns
 * Editor de MER v1.0
 */

class RelationalEngine {
  generateRelationalSchema(state) {
    const tablesMap = new Map();

    // 1. Convert all Entities into Base Relational Tables
    state.elements.forEach(el => {
      if (el.type === 'entity') {
        const tableName = this.sanitizeIdentifier(el.name);
        const attrs = state.getAttributesFor(el.id);

        const columns = [];
        let hasPk = false;

        attrs.forEach(attr => {
          const colName = this.sanitizeIdentifier(attr.name);
          const attrType = attr.attrType || 'simple';

          if (attrType === 'primary') {
            hasPk = true;
            columns.push({
              name: colName,
              type: attr.sqlType || 'INT',
              isPk: true,
              isFk: false,
              isNullable: false,
              isAutoIncrement: true
            });
          } else if (attrType === 'multivalued') {
            const multiTableName = `${tableName}_${colName}`;
            const parentPkName = `id_${tableName.toLowerCase()}`;

            tablesMap.set(multiTableName, {
              name: multiTableName,
              isAssociative: true,
              isMultivalued: true,
              columns: [
                { name: parentPkName, type: 'INT', isPk: true, isFk: true, refTable: tableName, refColumn: parentPkName },
                { name: colName, type: 'VARCHAR(255)', isPk: true, isFk: false }
              ]
            });
          } else if (attrType === 'composite') {
            // Check for sub-attributes attached to this composite attribute
            const subAttrs = state.getAttributesFor(attr.id);
            if (subAttrs.length > 0) {
              subAttrs.forEach(sub => {
                const subColName = this.sanitizeIdentifier(sub.name);
                columns.push({
                  name: `${colName}_${subColName}`,
                  type: sub.sqlType || this.guessDataType(subColName),
                  isPk: false,
                  isFk: false,
                  isNullable: true
                });
              });
            } else {
              columns.push({
                name: colName,
                type: attr.sqlType || 'VARCHAR(255)',
                isPk: false,
                isFk: false,
                isNullable: true
              });
            }
          } else if (attrType !== 'derived') {
            columns.push({
              name: colName,
              type: attr.sqlType || this.guessDataType(colName),
              isPk: false,
              isFk: false,
              isNullable: true
            });
          }
        });

        const implicitPkName = `id_${tableName.toLowerCase()}`;
        const alreadyHasImplicitColumn = columns.some(column => column.name === implicitPkName);
        if (!hasPk && !el.suppressImplicitPk && !alreadyHasImplicitColumn) {
          columns.unshift({
            name: implicitPkName,
            type: 'INT',
            isPk: true,
            isFk: false,
            isNullable: false,
            isAutoIncrement: true
          });
        }

        tablesMap.set(tableName, {
          id: el.id,
          name: tableName,
          isAssociative: false,
          columns
        });
      }
    });

    // 2. Process Relationships (1:1, 1:N, N:N)
    state.elements.forEach(rel => {
      if (rel.type === 'relation') {
        const relConns = state.connections.filter(
          c => (c.fromId === rel.id || c.toId === rel.id) && c.type !== 'attribute_link'
        );

        const connectedEntities = [];
        relConns.forEach(conn => {
          const targetId = conn.fromId === rel.id ? conn.toId : conn.fromId;
          const entityEl = state.elements.get(targetId);
          if (entityEl && entityEl.type === 'entity') {
            connectedEntities.push({
              entity: entityEl,
              cardinality: conn.cardinalityTo || 'N',
              connId: conn.id
            });
          }
        });

        if (connectedEntities.length === 2) {
          const [entA, entB] = connectedEntities;
          const tableA = tablesMap.get(this.sanitizeIdentifier(entA.entity.name));
          const tableB = tablesMap.get(this.sanitizeIdentifier(entB.entity.name));

          if (tableA && tableB) {
            const isManyA = this.isManyCardinality(entA.cardinality);
            const isManyB = this.isManyCardinality(entB.cardinality);

            // N:N Relationship -> Creates Associative Table
            if (isManyA && isManyB) {
              const assocTableName = `${tableA.name}_${tableB.name}`;
              const pkColA = tableA.columns.find(c => c.isPk) || { name: `id_${tableA.name.toLowerCase()}`, type: 'INT' };
              const pkColB = tableB.columns.find(c => c.isPk) || { name: `id_${tableB.name.toLowerCase()}`, type: 'INT' };

              const fkColA = `fk_${pkColA.name}`;
              const fkColB = `fk_${pkColB.name}`;

              const assocColumns = [
                { name: fkColA, type: pkColA.type, isPk: true, isFk: true, refTable: tableA.name, refColumn: pkColA.name },
                { name: fkColB, type: pkColB.type, isPk: true, isFk: true, refTable: tableB.name, refColumn: pkColB.name }
              ];

              const relAttrs = state.getAttributesFor(rel.id);
              relAttrs.forEach(rAttr => {
                assocColumns.push({
                  name: this.sanitizeIdentifier(rAttr.name),
                  type: this.guessDataType(rAttr.name),
                  isPk: false,
                  isFk: false,
                  isNullable: true
                });
              });

              tablesMap.set(assocTableName, {
                name: assocTableName,
                isAssociative: true,
                columns: assocColumns
              });
            }
            // 1:N Relationship -> tableB is 'N' and gets FK from tableA
            else if (!isManyA && isManyB) {
              const pkColA = tableA.columns.find(c => c.isPk) || { name: `id_${tableA.name.toLowerCase()}`, type: 'INT' };
              const fkName = `fk_${pkColA.name}`;
              
              if (!tableB.columns.some(c => c.name === fkName)) {
                tableB.columns.push({
                  name: fkName,
                  type: pkColA.type,
                  isPk: false,
                  isFk: true,
                  refTable: tableA.name,
                  refColumn: pkColA.name,
                  isNullable: true
                });
              }
            } else if (isManyA && !isManyB) {
              const pkColB = tableB.columns.find(c => c.isPk) || { name: `id_${tableB.name.toLowerCase()}`, type: 'INT' };
              const fkName = `fk_${pkColB.name}`;

              if (!tableA.columns.some(c => c.name === fkName)) {
                tableA.columns.push({
                  name: fkName,
                  type: pkColB.type,
                  isPk: false,
                  isFk: true,
                  refTable: tableB.name,
                  refColumn: pkColB.name,
                  isNullable: true
                });
              }
            }
            // 1:1 Relationship
            else {
              const pkColA = tableA.columns.find(c => c.isPk) || { name: `id_${tableA.name.toLowerCase()}`, type: 'INT' };
              const fkName = `fk_${pkColA.name}`;

              if (!tableB.columns.some(c => c.name === fkName)) {
                tableB.columns.push({
                  name: fkName,
                  type: pkColA.type,
                  isPk: false,
                  isFk: true,
                  refTable: tableA.name,
                  refColumn: pkColA.name,
                  isUnique: true,
                  isNullable: true
                });
              }
            }
          }
        }
      }
    });

    const tables = Array.from(tablesMap.values());

    // DER-only property changes belong to the shared state too. This keeps a
    // generated FK/implicit PK as the same column instead of creating an
    // attribute with a duplicate name merely to persist the edit.
    tables.forEach(table => {
      const tableKey = table.id || table.name;
      table.columns.forEach(column => {
        const override = state.logicalColumnOverrides &&
          state.logicalColumnOverrides[`${tableKey}::${column.name}`];
        if (override) Object.assign(column, override);
      });
    });

    return tables;
  }

  isManyCardinality(card) {
    if (!card) return false;
    const str = card.toString().toLowerCase();
    return str.includes('n') || str === 'm' || str.includes('muitos');
  }

  sanitizeIdentifier(name) {
    return (name || 'tabela')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '') || 'elemento';
  }

  guessDataType(columnName) {
    const lower = (columnName || '').toLowerCase();
    if (lower.startsWith('id_') || lower.endsWith('_id') || lower === 'id') return 'INT';
    if (lower.includes('data') || lower.includes('date') || lower.includes('criado_em')) return 'DATETIME';
    if (lower.includes('valor') || lower.includes('preco') || lower.includes('salario') || lower.includes('total')) return 'DECIMAL(10,2)';
    if (lower.includes('idade') || lower.includes('quantidade') || lower.includes('qtd') || lower.includes('numero') || lower.includes('cep')) return 'INT';
    if (lower.includes('ativo') || lower.includes('status') || lower.startsWith('is_')) return 'BOOLEAN';
    if (lower.includes('descricao') || lower.includes('observacao') || lower.includes('texto')) return 'TEXT';
    return 'VARCHAR(255)';
  }
}

window.RelationalEngine = RelationalEngine;
