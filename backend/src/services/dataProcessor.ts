import * as xlsx from 'xlsx';
import { Readable } from 'stream';
import csvParser from 'csv-parser';

export interface ITransformAction {
  type:
    | 'remove_duplicates'
    | 'remove_blank_rows'
    | 'rename_column'
    | 'delete_column'
    | 'sort_data'
    | 'filter_data'
    | 'split_column'
    | 'merge_columns'
    | 'generate_formula'
    | 'add_row'
    | 'delete_row';
  params: Record<string, any>;
  description: string;
}

export interface ITransformPreview {
  currentRows: number;
  affectedRows: number;
  newRows: number;
  columnsChanged: string[];
  previewData: Record<string, any>[];
}

// Parse CSV buffer to JSON array
export const parseCSV = (buffer: Buffer): Promise<Record<string, any>[]> => {
  return new Promise((resolve, reject) => {
    const results: Record<string, any>[] = [];
    const stream = Readable.from(buffer);
    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

// Parse Excel buffer to JSON array
export const parseExcel = (buffer: Buffer): Record<string, any>[] => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet, { defval: '' });
};

// Export JSON array to Excel buffer
export const exportToExcel = (data: Record<string, any>[], sheetName = 'Sheet1'): Buffer => {
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

// Export JSON array to CSV string
export const exportToCSV = (data: Record<string, any>[]): string => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] === undefined || row[header] === null ? '' : row[header];
      const escaped = ('' + val).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
};

// Apply a single transformation rule on the data
export const applyTransformation = (
  data: Record<string, any>[],
  action: ITransformAction
): { data: Record<string, any>[]; affectedCount: number; columnsChanged: string[] } => {
  let modifiedData = JSON.parse(JSON.stringify(data)); // Deep clone
  let affectedCount = 0;
  const columnsChanged: string[] = [];

  switch (action.type) {
    case 'remove_duplicates': {
      const uniqueKeys = action.params.keys || [];
      const seen = new Set<string>();
      const initialLength = modifiedData.length;
      
      modifiedData = modifiedData.filter((row: Record<string, any>) => {
        let key = '';
        if (uniqueKeys.length === 0) {
          key = JSON.stringify(row);
        } else {
          key = uniqueKeys.map((k: string) => row[k]).join('|');
        }
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      affectedCount = initialLength - modifiedData.length;
      break;
    }

    case 'remove_blank_rows': {
      const keys = action.params.keys || [];
      const initialLength = modifiedData.length;
      
      modifiedData = modifiedData.filter((row: Record<string, any>) => {
        const targetKeys = keys.length > 0 ? keys : Object.keys(row);
        // Check if all selected keys are empty
        const isAllEmpty = targetKeys.every((k: string) => {
          const val = row[k];
          return val === undefined || val === null || String(val).trim() === '';
        });
        return !isAllEmpty;
      });
      affectedCount = initialLength - modifiedData.length;
      break;
    }

    case 'rename_column': {
      const { oldName, newName } = action.params;
      if (!oldName || !newName) break;
      
      modifiedData = modifiedData.map((row: Record<string, any>) => {
        const newRow: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          if (k === oldName) {
            newRow[newName] = v;
          } else {
            newRow[k] = v;
          }
        }
        return newRow;
      });
      affectedCount = modifiedData.length; // all rows affected by schema change
      columnsChanged.push(`${oldName} → ${newName}`);
      break;
    }

    case 'delete_column': {
      const { name } = action.params;
      if (!name) break;
      
      modifiedData = modifiedData.map((row: Record<string, any>) => {
        const newRow = { ...row };
        delete newRow[name];
        return newRow;
      });
      affectedCount = modifiedData.length;
      columnsChanged.push(`Removed column: ${name}`);
      break;
    }

    case 'sort_data': {
      const { column, order = 'asc' } = action.params; // order: 'asc' | 'desc'
      if (!column) break;
      
      modifiedData.sort((a: any, b: any) => {
        const valA = a[column];
        const valB = b[column];
        
        // Handle numbers
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return order === 'asc' ? numA - numB : numB - numA;
        }
        
        // Handle strings
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return order === 'asc' ? -1 : 1;
        if (strA > strB) return order === 'asc' ? 1 : -1;
        return 0;
      });
      affectedCount = modifiedData.length; // Sort order affects entire dataset representation
      break;
    }

    case 'filter_data': {
      const { column, operator, value } = action.params; // operator: 'equals' | 'contains' | 'gt' | 'lt'
      if (!column || !operator) break;
      
      const initialLength = modifiedData.length;
      
      modifiedData = modifiedData.filter((row: Record<string, any>) => {
        const val = row[column];
        const compVal = value;
        
        switch (operator) {
          case 'equals':
            return String(val).toLowerCase() === String(compVal).toLowerCase();
          case 'contains':
            return String(val).toLowerCase().includes(String(compVal).toLowerCase());
          case 'gt':
            return Number(val) > Number(compVal);
          case 'lt':
            return Number(val) < Number(compVal);
          default:
            return true;
        }
      });
      affectedCount = initialLength - modifiedData.length;
      break;
    }

    case 'split_column': {
      const { column, separator = ' ', newColumns = [] } = action.params;
      if (!column || newColumns.length === 0) break;
      
      modifiedData = modifiedData.map((row: Record<string, any>) => {
        const val = String(row[column] || '');
        const parts = val.split(separator);
        const newRow = { ...row };
        
        newColumns.forEach((newCol: string, idx: number) => {
          newRow[newCol] = parts[idx] || '';
          if (!columnsChanged.includes(newCol)) {
            columnsChanged.push(newCol);
          }
        });
        
        return newRow;
      });
      affectedCount = modifiedData.length;
      break;
    }

    case 'merge_columns': {
      const { columns = [], separator = ' ', targetColumn } = action.params;
      if (columns.length === 0 || !targetColumn) break;
      
      modifiedData = modifiedData.map((row: Record<string, any>) => {
        const newRow = { ...row };
        const mergedVal = columns.map((col: string) => String(row[col] || '')).join(separator);
        newRow[targetColumn] = mergedVal;
        return newRow;
      });
      
      affectedCount = modifiedData.length;
      columnsChanged.push(targetColumn);
      break;
    }

    case 'generate_formula': {
      const { formulaName, formulaExpression, targetColumn } = action.params;
      // Example: formulaExpression is dynamic math on columns like "({Revenue} - {Cost}) * 1.1"
      if (!formulaExpression || !targetColumn) break;
      
      modifiedData = modifiedData.map((row: Record<string, any>) => {
        const newRow = { ...row };
        // Simple evaluator: replace {ColumnName} with row values
        let evalExpr = formulaExpression;
        const matches = formulaExpression.match(/\{([^}]+)\}/g) || [];
        
        matches.forEach((match: string) => {
          const colName = match.slice(1, -1);
          const colVal = Number(row[colName]) || 0;
          evalExpr = evalExpr.replace(match, String(colVal));
        });
        
        try {
          // Dangerous to eval raw expressions, but this is a sandbox and math-only.
          // Clean it: only allow digits, math operators, decimals, spaces
          const cleanedExpr = evalExpr.replace(/[^0-9+\-*/().\s]/g, '');
          // eslint-disable-next-line no-eval
          const result = Function(`"use strict"; return (${cleanedExpr})`)();
          newRow[targetColumn] = isNaN(result) || !isFinite(result) ? 0 : result;
        } catch {
          newRow[targetColumn] = 0;
        }
        return newRow;
      });
      
      affectedCount = modifiedData.length;
      columnsChanged.push(targetColumn);
      break;
    }
    
    case 'add_row': {
      const { rowData } = action.params;
      modifiedData.push(rowData || {});
      affectedCount = 1;
      break;
    }
    
    case 'delete_row': {
      const { index } = action.params;
      if (index !== undefined && index >= 0 && index < modifiedData.length) {
        modifiedData.splice(index, 1);
        affectedCount = 1;
      }
      break;
    }
  }

  return { data: modifiedData, affectedCount, columnsChanged };
};
