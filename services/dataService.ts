import { Dataset, CorrelationMatrix, QueryIntent } from '../types';

export const parseCSV = (csvText: string, fileName: string): Dataset => {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    throw new Error("File is empty");
  }

  let headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Handle Byte Order Mark (BOM) if present at the start of the file
  if (headers.length > 0 && headers[0].charCodeAt(0) === 0xFEFF) {
    headers[0] = headers[0].slice(1);
  }

  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].split(',');
    if (currentLine.length === headers.length) {
      const row: any = {};
      headers.forEach((header, index) => {
        let value: string | number = currentLine[index]?.trim().replace(/^"|"$/g, '');
        
        // Simple type inference for the raw data object
        if (!isNaN(Number(value)) && value !== '') {
            value = Number(value);
        }
        row[header] = value;
      });
      data.push(row);
    }
  }

  // Limit dataset size for the demo
  const limitedData = data.slice(0, 3000); 

  return {
    id: crypto.randomUUID(),
    name: fileName,
    data: limitedData,
    rowCount: data.length
  };
};

export const sampleDataForAI = (dataset: Dataset, rows = 15): string => {
  const sample = dataset.data.slice(0, rows);
  return JSON.stringify(sample);
};

// Pearson Correlation Logic
export const calculateCorrelations = (data: any[], columns: string[]): CorrelationMatrix => {
  const numericColumns = columns.filter(col => {
    // Check first 50 rows to confirm numeric
    return data.slice(0, 50).every(row => typeof row[col] === 'number');
  });

  const matrix: number[][] = [];
  
  for (let i = 0; i < numericColumns.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < numericColumns.length; j++) {
      if (i === j) {
        row.push(1);
      } else {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        const values1 = data.map(d => d[col1] as number);
        const values2 = data.map(d => d[col2] as number);
        row.push(calculatePearson(values1, values2));
      }
    }
    matrix.push(row);
  }

  return {
    variables: numericColumns,
    matrix
  };
};

function calculatePearson(x: number[], y: number[]) {
  const n = x.length;
  if (n === 0) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);

  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(2));
}

// Smart Query Execution Engine
export const queryData = (data: any[], intent: QueryIntent): any[] => {
  let result = [...data];

  // 1. Filter
  if (intent.filters && intent.filters.length > 0) {
    result = result.filter(row => {
      return intent.filters.every(filter => {
        const rowVal = row[filter.column];
        const filterVal = filter.value;
        
        switch (filter.operator) {
          case '==': return String(rowVal).toLowerCase() === String(filterVal).toLowerCase();
          case '>': return rowVal > filterVal;
          case '<': return rowVal < filterVal;
          case '>=': return rowVal >= filterVal;
          case '<=': return rowVal <= filterVal;
          case 'contains': return String(rowVal).toLowerCase().includes(String(filterVal).toLowerCase());
          default: return true;
        }
      });
    });
  }

  // 2. Group By & Aggregate
  if (intent.groupBy && intent.aggregateColumn && intent.aggregateType) {
    const groups: Record<string, number[]> = {};

    result.forEach(row => {
      const key = String(row[intent.groupBy!]);
      const val = Number(row[intent.aggregateColumn!]) || 0;
      if (!groups[key]) groups[key] = [];
      groups[key].push(val);
    });

    result = Object.entries(groups).map(([key, values]) => {
      let aggregatedValue = 0;
      switch (intent.aggregateType) {
        case 'SUM':
          aggregatedValue = values.reduce((a, b) => a + b, 0);
          break;
        case 'AVG':
          aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'COUNT':
          aggregatedValue = values.length;
          break;
        case 'COUNT_DISTINCT':
          aggregatedValue = new Set(values).size;
          break;
      }
      return {
        [intent.groupBy!]: key,
        [intent.aggregateColumn!]: Math.round(aggregatedValue * 100) / 100 // Round to 2 decimals
      };
    });

    // Sort by aggregated value descending (usually what users want)
    result.sort((a, b) => b[intent.aggregateColumn!] - a[intent.aggregateColumn!]);
  }
  
  // Limit results if too large for chat (Increased to 50 for better charts)
  return result.slice(0, 50);
};