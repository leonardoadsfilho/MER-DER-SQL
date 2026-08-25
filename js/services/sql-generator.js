/**
 * SQL DDL Generator Service
 * Generates clean, standard CREATE TABLE scripts from Relational Schema
 * Editor de MER Conceptual v2.0
 */
/**
 * SQL DDL Generator Service
 * Generates clean, standard CREATE TABLE scripts from Relational Schema
 * Editor de MER Conceptual v2.0
 */

class SqlGenerator {
  constructor(relationalEngine) {
    this.relationalEngine = relationalEngine;
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

    const baseTables = tables.filter(t => !t.isAssociative);
    const dependentTables = tables.filter(t => t.isAssociative);
    const sortedTables = [...baseTables, ...dependentTables];

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

      table.columns.forEach(col => {
        let def = `  \`${wrapHtml(col.name, 'attribute')}\` ${col.type}`;

        if (col.isAutoIncrement && col.isPk) {
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
          // Find if the refTable is a relation or entity
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
