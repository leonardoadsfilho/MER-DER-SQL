/**
 * SQL DDL Generator Service
 * Generates clean, standard CREATE TABLE scripts from Relational Schema
 * Editor de MER Conceptual v2.0
 */

class SqlGenerator {
  constructor(relationalEngine) {
    this.relationalEngine = relationalEngine;
  }

  generateDDL(state) {
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

    sortedTables.forEach(table => {
      lines.push(`-- Tabela: ${table.name}`);
      lines.push(`CREATE TABLE IF NOT EXISTS \`${table.name}\` (`);

      const columnDefs = [];
      const primaryKeys = [];
      const foreignKeys = [];

      table.columns.forEach(col => {
        let def = `  \`${col.name}\` ${col.type}`;

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
          primaryKeys.push(`\`${col.name}\``);
        }

        if (col.isFk && col.refTable && col.refColumn) {
          foreignKeys.push(
            `  CONSTRAINT \`fk_${table.name}_${col.name}\` FOREIGN KEY (\`${col.name}\`) REFERENCES \`${col.refTable}\` (\`${col.refColumn}\`) ON DELETE CASCADE ON UPDATE CASCADE`
          );
        }
      });

      if (primaryKeys.length > 0) {
        columnDefs.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
      }

      const allDefinitions = [...columnDefs, ...foreignKeys];
      lines.push(allDefinitions.join(',\n'));
      lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n');
    });

    return lines.join('\n');
  }
}

window.SqlGenerator = SqlGenerator;
