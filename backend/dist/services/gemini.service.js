"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReportData = exports.generateDashboardData = exports.generateFormula = exports.translateCommandToActions = void 0;
const generative_ai_1 = require("@google/generative-ai");
const getGenAI = () => {
    return new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
};
const executeWithFallback = async (generationConfig, promptParts) => {
    const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-flash-latest'];
    let lastErr;
    for (const modelName of models) {
        try {
            const model = getGenAI().getGenerativeModel({
                model: modelName,
                generationConfig
            });
            const response = await model.generateContent(promptParts);
            return response.response.text();
        }
        catch (err) {
            console.warn(`Model ${modelName} failed, trying fallback...`, err.message || err);
            lastErr = err;
        }
    }
    throw lastErr;
};
const cleanJsonResponse = (text) => {
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
// ==========================================
// LOCAL RULE-BASED FALLBACK PARSERS
// ==========================================
const parseCommandLocally = (prompt, columns) => {
    const cleanPrompt = prompt.trim().toLowerCase();
    // 1. Delete / Remove Row
    const deleteRowMatch = prompt.match(/(?:delete|remove|delete\s+row|remove\s+row)\s+row\s*(\d+)/i) ||
        prompt.match(/(?:delete|remove)\s+(\d+)/i) ||
        prompt.match(/(?:delete|remove)\s+row\s*(\d+)/i);
    if (deleteRowMatch) {
        const rowNumber = parseInt(deleteRowMatch[1], 10);
        const idx = rowNumber - 1;
        return {
            explanation: `Local Engine: Scheduled removal of row number ${rowNumber} from the active dataset.`,
            actions: [{
                    type: 'delete_row',
                    params: { index: idx },
                    description: `Delete row at row number ${rowNumber}`
                }]
        };
    }
    // 2. Remove duplicates
    if (cleanPrompt.includes('duplicate') || cleanPrompt.includes('dedup')) {
        return {
            explanation: 'Local Engine: Scanning spreadsheet columns and pruning identical duplicate records.',
            actions: [{
                    type: 'remove_duplicates',
                    params: { keys: [] },
                    description: 'Remove duplicate rows'
                }]
        };
    }
    // 3. Remove blank rows
    if (cleanPrompt.includes('blank') || cleanPrompt.includes('empty')) {
        return {
            explanation: 'Local Engine: Identifying and deleting rows where all fields are empty or white-spaces.',
            actions: [{
                    type: 'remove_blank_rows',
                    params: { keys: [] },
                    description: 'Remove blank rows'
                }]
        };
    }
    // 4. Rename column
    const renameColumnMatch = prompt.match(/rename\s+column\s+["']?([^"'\s]+)["']?\s+to\s+["']?([^"'\s]+)["']?/i) ||
        prompt.match(/rename\s+["']?([^"'\s]+)["']?\s+to\s+["']?([^"'\s]+)["']?/i);
    if (renameColumnMatch) {
        const oldName = renameColumnMatch[1];
        const newName = renameColumnMatch[2];
        const matchedCol = columns.find(c => c.toLowerCase() === oldName.toLowerCase()) || oldName;
        return {
            explanation: `Local Engine: Renaming active column header "${matchedCol}" to "${newName}".`,
            actions: [{
                    type: 'rename_column',
                    params: { oldName: matchedCol, newName },
                    description: `Rename column ${matchedCol} to ${newName}`
                }]
        };
    }
    // 5. Delete column
    const deleteColumnMatch = prompt.match(/(?:delete|remove)\s+column\s+["']?([^"'\s]+)["']?/i);
    if (deleteColumnMatch) {
        const colName = deleteColumnMatch[1];
        const matchedCol = columns.find(c => c.toLowerCase() === colName.toLowerCase()) || colName;
        return {
            explanation: `Local Engine: Deleting column "${matchedCol}" from the spreadsheet schema.`,
            actions: [{
                    type: 'delete_column',
                    params: { name: matchedCol },
                    description: `Delete column ${matchedCol}`
                }]
        };
    }
    // 6. Sort data
    const sortMatch = prompt.match(/sort\s+(?:by\s+)?["']?([^"'\s]+)["']?(?:\s+(asc|desc|ascending|descending))?/i);
    if (sortMatch) {
        const colName = sortMatch[1];
        const orderRaw = sortMatch[2] || 'asc';
        const order = orderRaw.toLowerCase().startsWith('desc') ? 'desc' : 'asc';
        const matchedCol = columns.find(c => c.toLowerCase() === colName.toLowerCase()) || colName;
        return {
            explanation: `Local Engine: Sorting dataset rows alphabetically/numerically by column "${matchedCol}" in ${order}ending order.`,
            actions: [{
                    type: 'sort_data',
                    params: { column: matchedCol, order },
                    description: `Sort data by column ${matchedCol} (${order})`
                }]
        };
    }
    // 7. Filter data
    const filterMatch = prompt.match(/filter\s+(?:where\s+)?["']?([^"'\s]+)["']?\s+(equals|contains|gt|lt|>|<|=)\s+["']?([^"'\s]+)["']?/i);
    if (filterMatch) {
        const colName = filterMatch[1];
        let op = filterMatch[2].toLowerCase();
        const value = filterMatch[3];
        if (op === '>' || op === 'gt')
            op = 'gt';
        else if (op === '<' || op === 'lt')
            op = 'lt';
        else if (op === '=' || op === 'equals')
            op = 'equals';
        else
            op = 'contains';
        const matchedCol = columns.find(c => c.toLowerCase() === colName.toLowerCase()) || colName;
        return {
            explanation: `Local Engine: Filtering rows to show only where column "${matchedCol}" ${op} "${value}".`,
            actions: [{
                    type: 'filter_data',
                    params: { column: matchedCol, operator: op, value },
                    description: `Filter rows where ${matchedCol} ${op} "${value}"`
                }]
        };
    }
    return {
        explanation: 'Local Engine Fallback: Gemini API is currently unavailable. Please try simpler spreadsheet instructions like "delete row 6", "rename column X to Y", or "sort by Z".',
        actions: []
    };
};
const generateFormulaLocally = (prompt, columns) => {
    const cleanPrompt = prompt.toLowerCase();
    // Try to find two matching columns in the prompt
    const matchedCols = columns.filter(col => cleanPrompt.includes(col.toLowerCase()));
    if (matchedCols.length >= 2) {
        const col1 = matchedCols[0];
        const col2 = matchedCols[1];
        let op = '-';
        let opWord = 'minus';
        if (cleanPrompt.includes('+') || cleanPrompt.includes('add') || cleanPrompt.includes('plus') || cleanPrompt.includes('sum')) {
            op = '+';
            opWord = 'plus';
        }
        else if (cleanPrompt.includes('*') || cleanPrompt.includes('multiply') || cleanPrompt.includes('times')) {
            op = '*';
            opWord = 'multiplied by';
        }
        else if (cleanPrompt.includes('/') || cleanPrompt.includes('divide')) {
            op = '/';
            opWord = 'divided by';
        }
        return {
            formula: `=${col1}1${op}${col2}1`,
            explanation: `Local Formula Fallback: Combines columns "${col1}" and "${col2}" using mathematical operator ${op}.`,
            expression: `{${col1}} ${op} {${col2}}`,
            targetColumn: `${col1}_${col2}_Calculated`
        };
    }
    return {
        formula: `=${columns[0] || 'A'}1 * 1.1`,
        explanation: 'Local Formula Fallback: Multiplies cell values by 1.1.',
        expression: `{${columns[0] || 'A'}} * 1.1`,
        targetColumn: 'Calculated_Column'
    };
};
const generateDashboardLocally = (prompt, columns, data) => {
    // Identify numeric columns
    const numericCols = columns.filter(col => {
        return data.slice(0, 10).some(row => {
            const val = Number(row[col]);
            return !isNaN(val) && row[col] !== '';
        });
    });
    const stringCols = columns.filter(col => !numericCols.includes(col));
    const kpis = [];
    const charts = [];
    kpis.push({ label: 'Total Rows Count', value: data.length });
    if (numericCols.length > 0) {
        const mainNumCol = numericCols[0];
        const total = data.reduce((acc, row) => acc + (Number(row[mainNumCol]) || 0), 0);
        const avg = data.length > 0 ? Math.round(total / data.length) : 0;
        kpis.push({ label: `Total ${mainNumCol}`, value: total.toLocaleString() });
        kpis.push({ label: `Average ${mainNumCol}`, value: avg.toLocaleString() });
        const labels = data.slice(0, 5).map((row, idx) => {
            const nameCol = stringCols.find(c => c.toLowerCase() === 'name' || c.toLowerCase() === 'email') || stringCols[0];
            return row[nameCol] ? String(row[nameCol]) : `Row ${idx + 1}`;
        });
        const values = data.slice(0, 5).map(row => Number(row[mainNumCol]) || 0);
        charts.push({
            type: 'bar',
            title: `${mainNumCol} Analytics Overview`,
            labels,
            values
        });
    }
    else {
        const mainStrCol = stringCols[0] || columns[0];
        const counts = {};
        data.slice(0, 50).forEach(row => {
            const val = String(row[mainStrCol] || 'Other');
            counts[val] = (counts[val] || 0) + 1;
        });
        const labels = Object.keys(counts).slice(0, 5);
        const values = Object.values(counts).slice(0, 5);
        kpis.push({ label: `Unique ${mainStrCol}`, value: Object.keys(counts).length });
        charts.push({
            type: 'pie',
            title: `Distribution of ${mainStrCol}`,
            labels,
            values
        });
    }
    return {
        kpis,
        charts,
        summary: `Local Engine Analytics: Loaded ${data.length} records. Displaying aggregated metrics and comparisons for column values.`
    };
};
const generateReportLocally = (prompt, columns, data) => {
    const numericCols = columns.filter(col => {
        return data.slice(0, 10).some(row => {
            const val = Number(row[col]);
            return !isNaN(val) && row[col] !== '';
        });
    });
    const stringCols = columns.filter(col => !numericCols.includes(col));
    const mainStrCol = stringCols.find(c => c.toLowerCase() === 'country' || c.toLowerCase() === 'category') || stringCols[0] || columns[0];
    const mainNumCol = numericCols[0] || columns[columns.length - 1];
    const groups = {};
    data.forEach(row => {
        const key = String(row[mainStrCol] || 'Other');
        const val = Number(row[mainNumCol]) || 0;
        if (!groups[key]) {
            groups[key] = { count: 0, sum: 0 };
        }
        groups[key].count += 1;
        groups[key].sum += val;
    });
    const reportData = Object.entries(groups).map(([key, stats]) => {
        const rowObj = {};
        rowObj[mainStrCol] = key;
        rowObj['Records Count'] = stats.count;
        if (numericCols.length > 0) {
            rowObj[`Sum of ${mainNumCol}`] = Math.round(stats.sum);
            rowObj[`Average ${mainNumCol}`] = Math.round(stats.sum / stats.count);
        }
        return rowObj;
    });
    return {
        title: `Local Analytics Report Grouped by ${mainStrCol}`,
        summaryText: `Local Engine Summary: Computed and compiled frequencies and aggregations of ${data.length} items grouped under the primary "${mainStrCol}" categories.`,
        reportData: reportData.slice(0, 10)
    };
};
// ==========================================
// CORE TRANSLATION EXPORTS
// ==========================================
// Convert user natural language commands to structured transform actions
const translateCommandToActions = async (prompt, columns, sampleRows) => {
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
        const responseText = await executeWithFallback({ responseMimeType: 'application/json' }, [
            { text: systemPrompt },
            { text: `User Instruction: "${prompt}"` }
        ]);
        const cleanedText = cleanJsonResponse(responseText);
        return JSON.parse(cleanedText);
    }
    catch (error) {
        console.warn('Gemini transform API failed, using local rule-based fallback:', error.message || error);
        return parseCommandLocally(prompt, columns);
    }
};
exports.translateCommandToActions = translateCommandToActions;
// Generate custom Excel formulas and internal mathematical representations
const generateFormula = async (prompt, columns) => {
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
        const responseText = await executeWithFallback({ responseMimeType: 'application/json' }, [
            { text: systemPrompt },
            { text: `User request: "${prompt}"` }
        ]);
        const cleanedText = cleanJsonResponse(responseText);
        return JSON.parse(cleanedText);
    }
    catch (err) {
        console.warn('Gemini formula API failed, using local fallback:', err.message || err);
        return generateFormulaLocally(prompt, columns);
    }
};
exports.generateFormula = generateFormula;
// Generate Dashboard Chart details and KPIs
const generateDashboardData = async (prompt, columns, data) => {
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
        const responseText = await executeWithFallback({ responseMimeType: 'application/json' }, [
            { text: systemPrompt },
            { text: `User request: "${prompt}"` }
        ]);
        const cleanedText = cleanJsonResponse(responseText);
        return JSON.parse(cleanedText);
    }
    catch (err) {
        console.warn('Gemini dashboard API failed, using local analytics fallback:', err.message || err);
        return generateDashboardLocally(prompt, columns, data);
    }
};
exports.generateDashboardData = generateDashboardData;
// Generate AI Custom reports
const generateReportData = async (prompt, columns, data) => {
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
        const responseText = await executeWithFallback({ responseMimeType: 'application/json' }, [
            { text: systemPrompt },
            { text: `User request: "${prompt}"` }
        ]);
        const cleanedText = cleanJsonResponse(responseText);
        return JSON.parse(cleanedText);
    }
    catch (err) {
        console.warn('Gemini report API failed, using local pivot fallback:', err.message || err);
        return generateReportLocally(prompt, columns, data);
    }
};
exports.generateReportData = generateReportData;
