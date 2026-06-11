import { GoogleGenerativeAI } from '@google/generative-ai';

const getGenAI = () => {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
};

const executeWithFallback = async (
  generationConfig: any,
  promptParts: any[]
): Promise<string> => {
  const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-flash-latest'];
  let lastErr: any;
  for (const modelName of models) {
    try {
      const model = getGenAI().getGenerativeModel({
        model: modelName,
        generationConfig
      });
      const response = await model.generateContent(promptParts);
      return response.response.text();
    } catch (err: any) {
      console.warn(`Model ${modelName} failed, trying fallback...`, err.message || err);
      lastErr = err;
    }
  }
  throw lastErr;
};

const cleanJsonResponse = (text: string): string => {
  let cleaned = text.trim();
  // Strip markdown code block markers if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  return cleaned.trim();
};

export interface IGeminiTransformResponse {
  explanation: string;
  actions: {
    type: string;
    params: Record<string, any>;
    description: string;
  }[];
}

export interface IGeminiFormulaResponse {
  formula: string;
  explanation: string;
  expression: string; // mathematical representation for backend execution, e.g., "{Revenue} - {Cost}"
  targetColumn: string;
}

export interface IGeminiDashboardResponse {
  kpis: { label: string; value: string | number }[];
  charts: {
    type: 'bar' | 'line' | 'pie' | 'doughnut';
    title: string;
    labels: string[];
    values: number[];
  }[];
  summary: string;
}

export interface IGeminiReportResponse {
  title: string;
  summaryText: string;
  reportData: Record<string, any>[];
}

// Convert user natural language commands to structured transform actions
export const translateCommandToActions = async (
  prompt: string,
  columns: string[],
  sampleRows: Record<string, any>[]
): Promise<IGeminiTransformResponse> => {
  const systemPrompt = `
You are SheetPilot AI, an expert spreadsheet assistant. Your task is to translate a user's natural language instruction into a sequence of structured transformations to apply to their spreadsheet data.

Available Column Headers: ${JSON.stringify(columns)}
Sample Rows (First 3): ${JSON.stringify(sampleRows.slice(0, 3))}

You must return a JSON object with this schema:
{
  "explanation": "Clear explanation of the changes that will be made",
  "actions": [
    {
      "type": "remove_duplicates" | "remove_blank_rows" | "rename_column" | "delete_column" | "sort_data" | "filter_data" | "split_column" | "merge_columns" | "generate_formula" | "add_row" | "delete_row",
      "params": { ... },
      "description": "Short description of this single action (e.g. 'Rename column Mobile to Phone')"
    }
  ]
}

Action Type Parameters:
1. "remove_duplicates": { "keys": ["col1", "col2"] } (optional, if empty removes rows matching entirely)
2. "remove_blank_rows": { "keys": ["col1"] } (optional, if empty checks all columns)
3. "rename_column": { "oldName": "old", "newName": "new" }
4. "delete_column": { "name": "col_name" }
5. "sort_data": { "column": "col_name", "order": "asc" | "desc" }
6. "filter_data": { "column": "col_name", "operator": "equals" | "contains" | "gt" | "lt", "value": "val" }
7. "split_column": { "column": "col_name", "separator": " ", "newColumns": ["new_col1", "new_col2"] }
8. "merge_columns": { "columns": ["col1", "col2"], "separator": " ", "targetColumn": "new_merged_col" }
9. "generate_formula": { "formulaName": "Profit", "formulaExpression": "({Revenue} - {Cost})", "targetColumn": "Profit" }
   Note: formulaExpression should ONLY use standard mathematical operations (+, -, *, /) and wrap referenced column names in curly braces {ColumnName}.
10. "add_row": { "rowData": { "col1": "val", "col2": "val" } }
11. "delete_row": { "index": number }

Only generate actions that can be fully satisfied. Match columns precisely to the provided headers (case-sensitive). If column names are slightly different (e.g., Mobile vs mobile), select the correct casing from headers.
`;

  try {
    const responseText = await executeWithFallback(
      { responseMimeType: 'application/json' },
      [
        { text: systemPrompt },
        { text: `User Instruction: "${prompt}"` }
      ]
    );
    const cleanedText = cleanJsonResponse(responseText);
    return JSON.parse(cleanedText) as IGeminiTransformResponse;
  } catch (error) {
    console.error('Gemini transform parse error:', error);
    return {
      explanation: 'Failed to interpret command. Please make sure the command is clear.',
      actions: []
    };
  }
};

// Generate custom Excel formulas and internal mathematical representations
export const generateFormula = async (
  prompt: string,
  columns: string[]
): Promise<IGeminiFormulaResponse> => {
  const systemPrompt = `
You are a spreadsheet formula expert. Based on the user's request, you need to return:
1. The standard Excel/Google Sheets formula (e.g., =A2-B2 or =AVERAGE(C:C)).
2. An explanation of how to use it.
3. A backend expression that wraps column names in curly braces like "{Revenue} - {Cost}" (if it's a simple math formula) or can be executed row-by-row.
4. A suggested target column name.

Columns: ${JSON.stringify(columns)}

Return JSON with this schema:
{
  "formula": "Excel formula string",
  "explanation": "Clear explanation",
  "expression": "Mathematical expression using curly brackets for columns, e.g., {Revenue} - {Cost}",
  "targetColumn": "Suggested column name"
}
`;

  try {
    const responseText = await executeWithFallback(
      { responseMimeType: 'application/json' },
      [
        { text: systemPrompt },
        { text: `User request: "${prompt}"` }
      ]
    );
    const cleanedText = cleanJsonResponse(responseText);
    return JSON.parse(cleanedText) as IGeminiFormulaResponse;
  } catch (err) {
    return {
      formula: '=N/A',
      explanation: 'Unable to generate formula.',
      expression: '',
      targetColumn: 'Formula_Result'
    };
  }
};

// Generate Dashboard Chart details and KPIs
export const generateDashboardData = async (
  prompt: string,
  columns: string[],
  data: Record<string, any>[]
): Promise<IGeminiDashboardResponse> => {
  const systemPrompt = `
You are a spreadsheet dashboard generator. Analyze the data sample and provide 2-3 key metrics (KPIs) and 1-2 charts that fit the user's query.
Columns: ${JSON.stringify(columns)}
Data Sample (first 50 rows): ${JSON.stringify(data.slice(0, 50))}

Return a JSON object:
{
  "kpis": [
    { "label": "Total Sales", "value": 15000 },
    { "label": "Average Deal Size", "value": 2500 }
  ],
  "charts": [
    {
      "type": "bar" | "line" | "pie" | "doughnut",
      "title": "Sales by Category",
      "labels": ["Electronics", "Clothing"],
      "values": [10000, 5000]
    }
  ],
  "summary": "Short analytical summary of the generated indicators"
}
`;

  try {
    const responseText = await executeWithFallback(
      { responseMimeType: 'application/json' },
      [
        { text: systemPrompt },
        { text: `User request: "${prompt}"` }
      ]
    );
    const cleanedText = cleanJsonResponse(responseText);
    return JSON.parse(cleanedText) as IGeminiDashboardResponse;
  } catch (err) {
    console.error('Dashboard logic error:', err);
    return {
      kpis: [],
      charts: [],
      summary: 'Could not generate analytics details.'
    };
  }
};

// Generate AI Custom reports
export const generateReportData = async (
  prompt: string,
  columns: string[],
  data: Record<string, any>[]
): Promise<IGeminiReportResponse> => {
  const systemPrompt = `
You are an AI report generator. Summarize and group the dataset sample to create a downloadable report based on the user's request.
Columns: ${JSON.stringify(columns)}
Data sample (first 50 rows): ${JSON.stringify(data.slice(0, 50))}

Return a JSON object:
{
  "title": "Title of the report",
  "summaryText": "Professional analytical summary of the report",
  "reportData": [
     // Array of objects representing the summarized report columns
     { "Category": "Hardware", "Total Sales": 45000, "Percentage": "60%" }
  ]
}
`;

  try {
    const responseText = await executeWithFallback(
      { responseMimeType: 'application/json' },
      [
        { text: systemPrompt },
        { text: `User request: "${prompt}"` }
      ]
    );
    const cleanedText = cleanJsonResponse(responseText);
    return JSON.parse(cleanedText) as IGeminiReportResponse;
  } catch (err) {
    console.error('Report logic error:', err);
    return {
      title: 'AI Summary Report',
      summaryText: 'Report compiled.',
      reportData: []
    };
  }
};
