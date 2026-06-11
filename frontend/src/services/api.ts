const API_BASE_URL = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Helper to get auth headers
const getHeaders = (isMultipart = false) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
};

export interface IUserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
  createdAt: string;
}

export interface ISubscriptionInfo {
  plan: 'free' | 'pro';
  commandsUsedThisMonth: number;
  limitResetDate?: string;
}

export interface ISpreadsheetResponse {
  fileId?: string;
  name: string;
  type: 'csv' | 'xlsx' | 'google';
  columns: string[];
  rowCount: number;
  data: Record<string, any>[];
  sheetName?: string;
  availableSheets?: string[];
}

export interface ICommandPreviewResponse {
  explanation: string;
  actions: {
    type: string;
    params: Record<string, any>;
    description: string;
  }[];
}

export interface IApplyChangesResponse {
  data: Record<string, any>[];
  explanation: string;
  summary: {
    affectedRows: number;
    newRows: number;
    columnsChanged: string[];
  };
}

export interface IWorkflow {
  _id: string;
  name: string;
  description?: string;
  steps: {
    type: string;
    params: Record<string, any>;
    description: string;
  }[];
  createdAt: string;
}

export interface IDashboardAnalytics {
  metrics: {
    totalFiles: number;
    totalCommands: number;
    totalWorkflows: number;
    commandsLimit: number;
    commandsUsed: number;
    plan: 'free' | 'pro';
  };
  recentFiles?: {
    id: string;
    name: string;
    type: 'csv' | 'xlsx' | 'google';
    rowCount?: number;
    columnCount?: number;
    columns: string[];
    createdAt: string;
  }[];
  recentActivity: {
    id: string;
    action: string;
    details?: string;
    timestamp: string;
  }[];
}
export const api = {
  // Authentication
  async googleLogin(code: string, redirectUri: string) {
    const res = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri })
    });
    if (!res.ok) throw new Error('Authentication failed');
    return res.json() as Promise<{ token: string; user: IUserProfile }>;
  },

  async mockLogin() {
    const res = await fetch(`${API_BASE_URL}/api/auth/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Mock authentication failed');
    return res.json() as Promise<{ token: string; user: IUserProfile }>;
  },

  async getProfile() {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to load profile');
    return res.json() as Promise<{
      user: IUserProfile;
      subscription: ISubscriptionInfo;
      isGoogleConnected: boolean;
    }>;
  },

  // Spreadsheet Upload & Imports
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/api/spreadsheet/upload`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload file');
    return res.json() as Promise<ISpreadsheetResponse>;
  },

  async getFileData(fileId: string) {
    const res = await fetch(`${API_BASE_URL}/api/spreadsheet/files/${fileId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to load spreadsheet data');
    return res.json() as Promise<ISpreadsheetResponse>;
  },

  async getSheetsConnection() {
    const res = await fetch(`${API_BASE_URL}/api/spreadsheet/sheets/connection`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ connectedEmail: string }>;
  },

  async importGoogleSheet(spreadsheetId: string, sheetName?: string) {
    const res = await fetch(`${API_BASE_URL}/api/spreadsheet/sheets/import`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ spreadsheetId, sheetName })
    });
    if (!res.ok) throw new Error('Failed to import sheet values');
    return res.json() as Promise<ISpreadsheetResponse>;
  },

  async exportGoogleSheet(spreadsheetId: string, sheetName: string, columns: string[], data: Record<string, any>[]) {
    const res = await fetch(`${API_BASE_URL}/api/spreadsheet/sheets/export`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ spreadsheetId, sheetName, columns, data })
    });
    if (!res.ok) throw new Error('Failed to save changes back to Google sheets');
    return res.json() as Promise<{ message: string }>;
  },

  // Transformations
  async previewCommand(prompt: string, columns: string[], sampleData: Record<string, any>[]) {
    const res = await fetch(`${API_BASE_URL}/api/spreadsheet/preview`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt, columns, sampleData })
    });
    if (!res.ok) throw new Error('AI preview failed');
    return res.json() as Promise<ICommandPreviewResponse>;
  },

  async applyChanges(fileId: string | undefined, prompt: string, actions: any[], data: Record<string, any>[]) {
    const res = await fetch(`${API_BASE_URL}/api/spreadsheet/apply`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ fileId, prompt, actions, data })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to apply changes');
    }
    return res.json() as Promise<IApplyChangesResponse>;
  },

  // Generators
  async generateFormula(prompt: string, columns: string[]) {
    const res = await fetch(`${API_BASE_URL}/api/spreadsheet/formula`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt, columns })
    });
    if (!res.ok) throw new Error('Failed to generate formula');
    return res.json() as Promise<{ formula: string; explanation: string; expression: string; targetColumn: string }>;
  },

  async generateDashboard(prompt: string, columns: string[], data: Record<string, any>[]) {
    const res = await fetch(`${API_BASE_URL}/api/spreadsheet/dashboard`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt, columns, data })
    });
    if (!res.ok) throw new Error('Failed to compile dashboard metrics');
    return res.json() as Promise<{
      kpis: { label: string; value: string | number }[];
      charts: { type: string; title: string; labels: string[]; values: number[] }[];
      summary: string;
    }>;
  },

  async generateReport(prompt: string, columns: string[], data: Record<string, any>[]) {
    const res = await fetch(`${API_BASE_URL}/api/spreadsheet/report`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt, columns, data })
    });
    if (!res.ok) throw new Error('Failed to build summary report');
    return res.json() as Promise<{ title: string; summaryText: string; reportData: Record<string, any>[] }>;
  },

  async downloadExcel(columns: string[], data: Record<string, any>[], filename?: string) {
    const res = await fetch(`${API_BASE_URL}/api/spreadsheet/download`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ columns, data, filename })
    });
    if (!res.ok) throw new Error('Failed to compile export file download');
    return res.blob();
  },

  // Saved Workflows
  async saveWorkflow(name: string, description: string, steps: any[]) {
    const res = await fetch(`${API_BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description, steps })
    });
    if (!res.ok) throw new Error('Failed to save workflow template');
    return res.json() as Promise<IWorkflow>;
  },

  async getWorkflows() {
    const res = await fetch(`${API_BASE_URL}/api/workflows`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to load workflows');
    return res.json() as Promise<IWorkflow[]>;
  },

  async deleteWorkflow(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/workflows/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete workflow');
    return res.json();
  },

  // Dashboard Analytics
  async getDashboardAnalytics() {
    const res = await fetch(`${API_BASE_URL}/api/analytics/dashboard`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to retrieve dashboard analytics');
    return res.json() as Promise<IDashboardAnalytics>;
  },

  async getAuditLogs() {
    const res = await fetch(`${API_BASE_URL}/api/analytics/audit`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to load activity logs');
    return res.json() as Promise<any[]>;
  }
};
