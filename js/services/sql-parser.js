/**
 * SQL DDL Parser Service
 * Extracts relational tables, columns, primary keys, and foreign keys from standard SQL DDL scripts.
 * Supports CREATE TABLE statements, inline/table constraints, and ALTER TABLE ADD CONSTRAINT FOREIGN KEY.
 * Editor de MER Conceptual v2.0
 */

class SqlParser {
  /**
   * Cleans SQL by removing comments and unnecessary whitespace.
   */
  cleanSql(sqlText) {
    if (!sqlText) return '';

    // Remove multi-line comments /* ... */
    let cleaned = sqlText.replace(/\/\*[\s\S]*?\*\//g, '');

    // Remove single-line comments -- ... and # ...
    cleaned = cleaned.replace(/--.*$/gm, '');
    cleaned = cleaned.replace(/#.*$/gm, '');

    return cleaned;
  }

  /**
   * Strips delimiters from SQL identifiers (`, ", [ ], etc.)
   */
  cleanIdentifier(name) {
    if (!name) return '';
    return name.trim().replace(/^[`"\[]+|[`"\]]+$/g, '');
  }

  /**
   * Parses DDL SQL text and returns an array of table definitions.
   * @param {string} sqlText
   * @returns {Array<Object>} Array of parsed tables
   */
  parse(sqlText) {
    const cleaned = this.cleanSql(sqlText);
    const tablesMap = new Map();

    // 1. Match all CREATE TABLE statements
    // Handles CREATE TABLE [IF NOT EXISTS] [schema.]tableName (...)
    const createTableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([`"\[\w\].]+)\s*\(([\s\S]*?)\)(?:\s*ENGINE\s*=\s*\w+)?(?:\s*DEFAULT\s+CHARSET\s*=\s*[\w\d]+)?(?:\s*;|\s*$)/gi;

    let match;
    while ((match = createTableRegex.exec(cleaned)) !== null) {
      const rawTableName = match[1];
      const body = match[2];

      const parts = rawTableName.split('.');
      const tableName = this.cleanIdentifier(parts[parts.length - 1]);

      const table = {
        name: tableName,
        columns: [],
        primaryKeys: new Set(),
        foreignKeys: []
      };

      this.parseTableBody(body, table);
      tablesMap.set(tableName.toLowerCase(), table);
    }

    // 2. Match ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY
    const alterTableFkRegex = /ALTER\s+TABLE\s+([`"\[\w\].]+)\s+ADD(?:\s+CONSTRAINT\s+[`"\[\w\].]+)?\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([`"\[\w\].]+)\s*\(([^)]+)\)/gi;
    while ((match = alterTableFkRegex.exec(cleaned)) !== null) {
      const rawTarget = match[1];
      const rawCols = match[2];
      const rawRefTable = match[3];
      const rawRefCols = match[4];

      const targetParts = rawTarget.split('.');
      const targetName = this.cleanIdentifier(targetParts[targetParts.length - 1]).toLowerCase();

      const refParts = rawRefTable.split('.');
      const refTableName = this.cleanIdentifier(refParts[refParts.length - 1]);

      const targetCol = this.cleanIdentifier(rawCols.split(',')[0]);
      const refCol = this.cleanIdentifier(rawRefCols.split(',')[0]);

      if (tablesMap.has(targetName)) {
        const table = tablesMap.get(targetName);
        const existingCol = table.columns.find(c => c.name.toLowerCase() === targetCol.toLowerCase());
        if (existingCol) {
          existingCol.isFk = true;
          existingCol.refTable = refTableName;
          existingCol.refColumn = refCol;
        }
      }
    }

    // 3. Finalize tables: apply primaryKeys set to column definitions and mark isAssociative
    const resultTables = [];
    tablesMap.forEach(table => {
      table.columns.forEach(col => {
        if (table.primaryKeys.has(col.name.toLowerCase())) {
          col.isPk = true;
        }
      });

      // If no explicit PK found, check if there's an id or id_tablename column
      if (!table.columns.some(c => c.isPk)) {
        const autoPk = table.columns.find(c => c.name.toLowerCase() === 'id' || c.name.toLowerCase() === `id_${table.name.toLowerCase()}`);
        if (autoPk) autoPk.isPk = true;
      }

      // Check if this is an associative/junction table
      const pkCols = table.columns.filter(c => c.isPk);
      const isAssociative = pkCols.length >= 2 && pkCols.every(c => c.isFk);
      table.isAssociative = isAssociative;

      resultTables.push(table);
    });

    return resultTables;
  }

  /**
   * Parses the body inside CREATE TABLE (...)
   */
  parseTableBody(bodyText, table) {
    // Split lines by comma, respecting parentheses e.g. DECIMAL(10, 2)
    const tokens = this.splitColumnDefinitions(bodyText);

    tokens.forEach(token => {
      const trimmed = token.trim();
      if (!trimmed) return;

      // Table-level PRIMARY KEY constraint
      const pkMatch = trimmed.match(/^(?:CONSTRAINT\s+[`"\[\w\]]+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const cols = pkMatch[1].split(',').map(c => this.cleanIdentifier(c).toLowerCase());
        cols.forEach(c => table.primaryKeys.add(c));
        return;
      }

      // Table-level FOREIGN KEY constraint
      const fkMatch = trimmed.match(/^(?:CONSTRAINT\s+[`"\[\w\]]+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([`"\[\w\].]+)\s*\(([^)]+)\)/i);
      if (fkMatch) {
        const colName = this.cleanIdentifier(fkMatch[1].split(',')[0]);
        const refTableRaw = fkMatch[2].split('.');
        const refTableName = this.cleanIdentifier(refTableRaw[refTableRaw.length - 1]);
        const refColName = this.cleanIdentifier(fkMatch[3].split(',')[0]);

        const col = table.columns.find(c => c.name.toLowerCase() === colName.toLowerCase());
        if (col) {
          col.isFk = true;
          col.refTable = refTableName;
          col.refColumn = refColName;
        } else {
          table.foreignKeys.push({ colName, refTableName, refColName });
        }
        return;
      }

      // Table-level UNIQUE or KEY/INDEX (ignored for entity/DER generation)
      if (/^(?:CONSTRAINT\s+[`"\[\w\]]+\s+)?(?:UNIQUE|KEY|INDEX|CHECK)\b/i.test(trimmed)) {
        return;
      }

      // Column Definition
      this.parseColumnDefinition(trimmed, table);
    });

    // Resolve deferred FKs
    table.foreignKeys.forEach(fk => {
      const col = table.columns.find(c => c.name.toLowerCase() === fk.colName.toLowerCase());
      if (col) {
        col.isFk = true;
        col.refTable = fk.refTableName;
        col.refColumn = fk.refColName;
      }
    });
  }

  /**
   * Parses a single column line: name type [modifiers]
   */
  parseColumnDefinition(line, table) {
    const words = line.split(/\s+/);
    if (words.length < 2) return;

    const colName = this.cleanIdentifier(words[0]);

    // Reconstruct data type which might have spaces e.g. VARCHAR(255) or INT UNSIGNED or DECIMAL(10, 2)
    let typePart = '';
    let idx = 1;

    while (idx < words.length) {
      const w = words[idx];
      const upper = w.toUpperCase();

      if (['NOT', 'NULL', 'PRIMARY', 'KEY', 'AUTO_INCREMENT', 'UNIQUE', 'DEFAULT', 'REFERENCES', 'CHECK', 'CONSTRAINT'].includes(upper)) {
        break;
      }

      typePart += (typePart ? ' ' : '') + w;
      idx++;

      // Stop if type has balanced parentheses and next word is a recognized modifier
      if (typePart.includes('(') && !typePart.includes(')')) {
        continue;
      }
      if (['INT', 'BIGINT', 'VARCHAR', 'TEXT', 'DATE', 'DATETIME', 'BOOLEAN', 'DECIMAL', 'FLOAT'].some(t => upper.startsWith(t)) &&
          idx < words.length && words[idx].toUpperCase() === 'UNSIGNED') {
        typePart += ' ' + words[idx];
        idx++;
      }
    }

    typePart = typePart || 'VARCHAR(255)';

    const restOfLine = words.slice(idx).join(' ').toUpperCase();
    const isPkInline = restOfLine.includes('PRIMARY KEY');
    const isAutoInc = restOfLine.includes('AUTO_INCREMENT') || restOfLine.includes('IDENTITY') || typePart.toUpperCase() === 'SERIAL';
    const isNullable = !restOfLine.includes('NOT NULL') && !isPkInline;
    const isUnique = restOfLine.includes('UNIQUE');

    // Inline REFERENCES
    let isFk = false;
    let refTable = null;
    let refColumn = null;
    const inlineRefMatch = line.match(/REFERENCES\s+([`"\[\w\].]+)\s*\(([^)]+)\)/i);
    if (inlineRefMatch) {
      isFk = true;
      const refParts = inlineRefMatch[1].split('.');
      refTable = this.cleanIdentifier(refParts[refParts.length - 1]);
      refColumn = this.cleanIdentifier(inlineRefMatch[2].split(',')[0]);
    }

    if (isPkInline) {
      table.primaryKeys.add(colName.toLowerCase());
    }

    table.columns.push({
      name: colName,
      type: typePart,
      isPk: isPkInline,
      isFk,
      refTable,
      refColumn,
      isNullable,
      isAutoIncrement: isAutoInc,
      isUnique
    });
  }

  /**
   * Helper to split column definitions by commas, ignoring commas inside parentheses.
   */
  splitColumnDefinitions(text) {
    const tokens = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '(') {
        depth++;
        current += char;
      } else if (char === ')') {
        if (depth > 0) depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        tokens.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      tokens.push(current);
    }

    return tokens;
  }
}

window.SqlParser = SqlParser;
