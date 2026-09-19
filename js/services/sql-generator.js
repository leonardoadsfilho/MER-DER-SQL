/**
 * SQL DDL Generator Service
 * Generates clean, standard CREATE TABLE scripts from Relational Schema
 * Features:
 * - Topological ordering (Domain / Independent tables first)
 * - Smart AUTO_INCREMENT only on numeric integer types (excluding decimals)
 * Editor de MER Conceptual v2.0
 */

class SqlGenerator {
  constructor(relationalEngine) {
    this.relationalEngine = relationalEngine;
  }

  /**
   * Checks if a SQL type is an integer numeric type eligible for auto-increment.
   * Includes INT, INTEGER, BIGINT, SMALLINT, TINYINT, MEDIUMINT, SERIAL and unsigned variants.
   * Excludes DECIMAL, NUMERIC, FLOAT, DOUBLE, REAL, VARCHAR, etc.
   */
  isIntegerNumericType(type) {
    if (!type) return false;
    const t = type.trim().toLowerCase();

    // Explicitly reject decimal and floating point types
    if (t.includes('decimal') || t.includes('numeric') || t.includes('float') ||
        t.includes('double') || t.includes('real') || t.includes('fixed')) {
      return false;
    }

    // Matches integer types, optionally with display width e.g. INT(11) and UNSIGNED
    return /^(tinyint|smallint|mediumint|int|integer|bigint|serial)(\s*\(\s*\d+\s*\))?(\s+unsigned)?$/i.test(t) ||
           /^unsigned\s+(tinyint|smallint|mediumint|int|integer|bigint)(\s*\(\s*\d+\s*\))?$/i.test(t);
  }

  /**
   * Sorts tables topologically so domain tables (tables with 0 external FK dependencies)
   * are generated first, followed by dependent tables and junction/associative tables.
   */
  sortTablesTopologically(tables) {
    const tableMap = new Map();
    tables.forEach(t => tableMap.set(t.name, t));

    // Calculate external dependencies for each table
    const dependencies = new Map();
    tables.forEach(t => {
      const deps = new Set();
      t.columns.forEach(col => {
        if (col.isFk && col.refTable && col.refTable !== t.name && tableMap.has(col.refTable)) {
          deps.add(col.refTable);
        }
      });
      dependencies.set(t.name, deps);
    });

    const sorted = [];
    const visited = new Set();
    const tempVisiting = new Set();

    const visit = (tableName) => {
      if (visited.has(tableName)) return;
      if (tempVisiting.has(tableName)) {
        // Cycle detected, break to avoid infinite recursion
        return;
      }

      tempVisiting.add(tableName);
      const deps = dependencies.get(tableName) || new Set();
      deps.forEach(depName => {
        if (tableMap.has(depName)) {
          visit(depName);
        }
      });
      tempVisiting.delete(tableName);
      visited.add(tableName);
      sorted.push(tableMap.get(tableName));
    };

    // First pass: domain tables (0 dependencies)
    tables.filter(t => (dependencies.get(t.name) || new Set()).size === 0)
          .forEach(t => visit(t.name));

    // Second pass: any remaining tables
    tables.forEach(t => {
      if (!visited.has(t.name)) {
        visit(t.name);
      }
    });

    return sorted;
  }

  generateDDL(state, asHtml = false) {
    const tables = this.relationalEngine.generateRelationalSchema(state);

    if (tables.length === 0) {
      return '-- Nenhum elemento encontrado no diagrama para gerar DDL.\n-- Crie entidades e atributos no canvas primeiro.';
    }

    const lines = [];
    lines.push('-- =================================================================');
    lines.push('-- Script SQL DDL gerado automaticamente');
    lines.push('-- Ferramenta: Editor de MER Conceptual v2.0');
    lines.push(`-- Data de Geração: ${new Date().toLocaleString('pt-BR')}`);
    lines.push('-- =================================================================\n');

    // 1. Order tables topologically: Domain tables (independent) first
    const sortedTables = this.sortTablesTopologically(tables);

    const wrapHtml = (text, type) => {
      if (!asHtml) return text;
      let colorVar = '';
      if (type === 'entity') colorVar = 'var(--shape-entity-stroke)';
      else if (type === 'relation') colorVar = 'var(--shape-relation-stroke)';
      else if (type === 'attribute') colorVar = 'var(--shape-attribute-stroke)';
      return `<span style="color: ${colorVar}; font-weight: bold;">${text}</span>`;
    };

    sortedTables.forEach(table => {
      lines.push(`-- Tabela: ${table.name}`);
      const tableType = table.isAssociative ? 'relation' : 'entity';
      lines.push(`CREATE TABLE IF NOT EXISTS \`${wrapHtml(table.name, tableType)}\` (`);

      const columnDefs = [];
      const primaryKeys = [];
      const foreignKeys = [];

      // Check if this table has a composite PK formed purely by FKs
      const pkColumns = table.columns.filter(c => c.isPk);
      const isPureCompositeFkPk = pkColumns.length > 1 && pkColumns.every(c => c.isFk);

      table.columns.forEach(col => {
        let def = `  \`${wrapHtml(col.name, 'attribute')}\` ${col.type}`;

        // Auto increment only on integer numeric types, single PKs, and non-FK columns
        const isAutoInc = col.isPk &&
          !col.isFk &&
          !isPureCompositeFkPk &&
          this.isIntegerNumericType(col.type);

        if (isAutoInc) {
          def += ' AUTO_INCREMENT';
        }

        if (!col.isNullable || col.isPk) {
          def += ' NOT NULL';
        }

        if (col.isUnique && !col.isPk) {
          def += ' UNIQUE';
        }

        columnDefs.push(def);

        if (col.isPk) {
          primaryKeys.push(`\`${wrapHtml(col.name, 'attribute')}\``);
        }

        if (col.isFk && col.refTable && col.refColumn) {
          const refTbl = tables.find(t => t.name === col.refTable);
          const refType = refTbl && refTbl.isAssociative ? 'relation' : 'entity';
          foreignKeys.push(
            `  CONSTRAINT \`fk_${table.name}_${col.name}\` FOREIGN KEY (\`${wrapHtml(col.name, 'attribute')}\`) REFERENCES \`${wrapHtml(col.refTable, refType)}\` (\`${wrapHtml(col.refColumn, 'attribute')}\`) ON DELETE CASCADE ON UPDATE CASCADE`
          );
        }
      });

      if (primaryKeys.length > 0) {
        columnDefs.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
      }

      const allDefinitions = [...columnDefs, ...foreignKeys];
      lines.push(allDefinitions.join(',\n'));
      lines.push(');\n');
    });

    return lines.join('\n');
  }
}

window.SqlGenerator = SqlGenerator;
