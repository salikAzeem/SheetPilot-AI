import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from '../../hooks/useAuth';
import { api } from '../../services/api';
import type { ISpreadsheetResponse, IWorkflow } from '../../services/api';
import {
  Upload, Database, Sparkles, Plus, Trash, ArrowRight, Search,
  FileSpreadsheet, Play, Save, RotateCcw, Download, BarChart2,
  Settings, CheckCircle, ArrowLeft, ArrowUpRight, HelpCircle, Loader2
} from 'lucide-react';

export const WorkspaceView: React.FC = () => {
  const { user } = useAuth();
  
  // Spreadsheet States
  const [activeSheet, setActiveSheet] = useState<ISpreadsheetResponse | null>(null);
  const [history, setHistory] = useState<Record<string, any>[][]>([]); // Undo history
  const [auditTrail, setAuditTrail] = useState<string[]>([]);
  const [appliedActions, setAppliedActions] = useState<any[]>([]);
  const [actionHistory, setActionHistory] = useState<any[][]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Google Sheets import details
  const [googleSpreadsheetId, setGoogleSpreadsheetId] = useState('');
  const [importingSheet, setImportingSheet] = useState(false);
  
  // UI Panels
  const [activeTab, setActiveTab] = useState<'sheet' | 'dashboard' | 'reports' | 'workflows'>('sheet');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // AI Command Chat
  const [prompt, setPrompt] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Chat History
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'ai'; text: string; success?: boolean }[]>([]);

  // AI Formula Generator
  const [formulaPrompt, setFormulaPrompt] = useState('');
  const [generatingFormula, setGeneratingFormula] = useState(false);
  const [generatedFormulaResult, setGeneratedFormulaResult] = useState<{ formula: string; explanation: string; targetColumn: string } | null>(null);

  // AI Dashboard Analytics
  const [dashboardPrompt, setDashboardPrompt] = useState('');
  const [generatingDashboard, setGeneratingDashboard] = useState(false);
  const [dashboardData, setDashboardData] = useState<any | null>(null);

  // AI Report Generator
  const [reportPrompt, setReportPrompt] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<any | null>(null);

  // Workflows
  const [savedWorkflows, setSavedWorkflows] = useState<IWorkflow[]>([]);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [savingWorkflow, setSavingWorkflow] = useState(false);

  // Recent files and history states
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [pastOperations, setPastOperations] = useState<any[]>([]);
  const [stagedWorkflow, setStagedWorkflow] = useState<IWorkflow | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load recent spreadsheets and operations log
  const loadRecentFilesAndHistory = async () => {
    setLoadingHistory(true);
    try {
      const [analData, auditLogs] = await Promise.all([
        api.getDashboardAnalytics(),
        api.getAuditLogs()
      ]);
      if (analData && analData.recentFiles) {
        setRecentFiles(analData.recentFiles);
      }
      setPastOperations(auditLogs || []);
    } catch (err) {
      console.error('Failed to load recent files/history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Switch spreadsheet to a past processed one
  const handleLoadRecentFile = async (fileId: string, runStagedWorkflow: IWorkflow | null = stagedWorkflow) => {
    setLoadingPreview(true);
    try {
      const response = await api.getFileData(fileId);
      const loaded = {
        fileId: response.fileId || fileId,
        name: response.name,
        type: response.type,
        columns: response.columns,
        rowCount: response.rowCount,
        data: response.data,
        googleSheetId: response.googleSheetId
      };
      setActiveSheet(loaded);
      setHistory([]);
      setAuditTrail([]);
      setAppliedActions([]);
      setActionHistory([]);
      setChatHistory([{ sender: 'ai', text: `Loaded spreadsheet "${response.name}" with ${response.rowCount} rows.` }]);
      
      // Auto-trigger staged workflow if present
      if (runStagedWorkflow) {
        // Clear staged workflow state after running
        setStagedWorkflow(null);
        setTimeout(() => {
          setPrompt(`Run workflow: ${runStagedWorkflow.name}`);
          setAiExplanation(`Apply automation recipe: ${runStagedWorkflow.name}.\nSteps:\n${runStagedWorkflow.steps.map((s: any, idx: number) => `${idx + 1}. ${s.description || s.type}`).join('\n')}`);
          setPendingActions(runStagedWorkflow.steps);
          setShowPreviewModal(true);
        }, 300);
      }
    } catch (err) {
      alert('Failed to load spreadsheet.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Load Workflows
  const loadWorkflows = async () => {
    try {
      const data = await api.getWorkflows();
      setSavedWorkflows(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Workflows, handle query parameters on mount
  useEffect(() => {
    loadWorkflows();
    loadRecentFilesAndHistory();

    const params = new URLSearchParams(window.location.search);
    const fileId = params.get('fileId');
    const runWorkflowId = params.get('runWorkflow');

    const initWorkspace = async () => {
      let loadedSheet: ISpreadsheetResponse | null = null;
      let targetFlow: IWorkflow | null = null;

      if (runWorkflowId) {
        try {
          const flows = await api.getWorkflows();
          const found = flows.find(w => w._id === runWorkflowId);
          if (found) {
            targetFlow = found;
          }
        } catch (err) {
          console.error('Failed to load staged workflow details:', err);
        }
      }

      if (fileId) {
        setLoadingPreview(true);
        try {
          const response = await api.getFileData(fileId);
          loadedSheet = {
            fileId: response.fileId || fileId,
            name: response.name,
            type: response.type,
            columns: response.columns,
            rowCount: response.rowCount,
            data: response.data,
            googleSheetId: response.googleSheetId
          };
          setActiveSheet(loadedSheet);
          setHistory([]);
          setAuditTrail([]);
          setAppliedActions([]);
          setActionHistory([]);
          setChatHistory([{ sender: 'ai', text: `Loaded spreadsheet "${response.name}" with ${response.rowCount} rows.` }]);
        } catch (err) {
          alert('Failed to load past spreadsheet data.');
        } finally {
          setLoadingPreview(false);
        }
      }

      // Clean url query params so we don't trigger it again on page refresh
      window.history.replaceState({}, document.title, window.location.pathname);

      if (targetFlow) {
        setTimeout(() => {
          if (loadedSheet || fileId) {
            // Sheet is active, auto-trigger preview modal immediately
            setPrompt(`Run workflow: ${targetFlow.name}`);
            setAiExplanation(`Apply automation recipe: ${targetFlow.name}.\nSteps:\n${targetFlow.steps.map((s: any, idx: number) => `${idx + 1}. ${s.description || s.type}`).join('\n')}`);
            setPendingActions(targetFlow.steps);
            setShowPreviewModal(true);
          } else {
            // No sheet loaded, stage the workflow beautifully
            setStagedWorkflow(targetFlow);
          }
        }, 500);
      }
    };

    initWorkspace();
  }, []);

  // Handle local CSV/XLSX Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setLoadingPreview(true);
    try {
      const response = await api.uploadFile(file);
      setActiveSheet(response);
      setHistory([]);
      setAuditTrail([]);
      setChatHistory([{ sender: 'ai', text: `Successfully imported spreadsheet "${response.name}" with ${response.rowCount} rows.` }]);
      
      // Auto-trigger staged workflow if present
      if (stagedWorkflow) {
        const flow = stagedWorkflow;
        setStagedWorkflow(null);
        setTimeout(() => {
          setPrompt(`Run workflow: ${flow.name}`);
          setAiExplanation(`Apply automation recipe: ${flow.name}.\nSteps:\n${flow.steps.map((s: any, idx: number) => `${idx + 1}. ${s.description || s.type}`).join('\n')}`);
          setPendingActions(flow.steps);
          setShowPreviewModal(true);
        }, 300);
      }
      
      // Refresh local files listing
      loadRecentFilesAndHistory();
    } catch (err) {
      alert('Error uploading file. Make sure it is a valid CSV or Excel file.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Google sheets Import
  const handleGoogleSheetImport = async () => {
    if (!googleSpreadsheetId) return;
    setImportingSheet(true);
    try {
      // Extract raw spreadsheet ID if a full Google Sheets URL is pasted
      let parsedId = googleSpreadsheetId;
      const match = googleSpreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        parsedId = match[1];
      }

      const response = await api.importGoogleSheet(parsedId);
      setActiveSheet(response);
      setHistory([]);
      setAuditTrail([]);
      setChatHistory([{ sender: 'ai', text: `Successfully synced Google Sheet: "${response.name}". Ready for processing.` }]);

      // Auto-trigger staged workflow if present
      if (stagedWorkflow) {
        const flow = stagedWorkflow;
        setStagedWorkflow(null);
        setTimeout(() => {
          setPrompt(`Run workflow: ${flow.name}`);
          setAiExplanation(`Apply automation recipe: ${flow.name}.\nSteps:\n${flow.steps.map((s: any, idx: number) => `${idx + 1}. ${s.description || s.type}`).join('\n')}`);
          setPendingActions(flow.steps);
          setShowPreviewModal(true);
        }, 300);
      }

      // Refresh local files listing
      loadRecentFilesAndHistory();
    } catch (err) {
      alert('Failed to connect to Google Sheet. Check Spreadsheet ID and google settings.');
    } finally {
      setImportingSheet(false);
    }
  };

  // Export back to Google Sheet
  const handleGoogleSheetExport = async () => {
    if (!activeSheet || !activeSheet.googleSheetId) return;
    try {
      await api.exportGoogleSheet(
        activeSheet.googleSheetId,
        activeSheet.sheetName || 'Sheet1',
        activeSheet.columns,
        activeSheet.data
      );
      alert('Spreadsheet successfully exported back to Google Sheets!');
    } catch (err) {
      alert('Failed to export data to Google Sheets.');
    }
  };

  // Download Excel
  const handleDownload = async () => {
    if (!activeSheet) return;
    try {
      const blob = await api.downloadExcel(activeSheet.columns, activeSheet.data, activeSheet.name);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeSheet.name.endsWith('.xlsx') ? activeSheet.name : `${activeSheet.name}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download spreadsheet.');
    }
  };

  // AI Command submission (gets preview actions)
  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt || !activeSheet) return;

    setLoadingPreview(true);
    setChatHistory(prev => [...prev, { sender: 'user', text: prompt }]);
    
    try {
      // Send first 50 rows for token limits
      const sample = activeSheet.data.slice(0, 50);
      const preview = await api.previewCommand(prompt, activeSheet.columns, sample);
      
      setAiExplanation(preview.explanation);
      setPendingActions(preview.actions);
      
      if (preview.actions.length > 0) {
        setShowPreviewModal(true);
      } else {
        setChatHistory(prev => [...prev, { sender: 'ai', text: `No matching spreadsheet operation could be mapped for "${prompt}". Please rewrite.` }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'ai', text: 'Error interacting with Gemini AI engine. Please verify connection.' }]);
    } finally {
      setLoadingPreview(false);
      setPrompt('');
    }
  };

  // Apply Pending Changes
  const applyPendingChanges = async () => {
    if (!activeSheet || pendingActions.length === 0) return;
    
    setLoadingPreview(true);
    setShowPreviewModal(false);
    
    try {
      // Save current state in history
      setHistory(prev => [...prev, activeSheet.data]);
      setActionHistory(prev => [...prev, appliedActions]);
      
      const response = await api.applyChanges(
        activeSheet.fileId,
        prompt,
        pendingActions,
        activeSheet.data
      );

      // Re-map column keys in case they were renamed/deleted
      const newCols = response.data.length > 0 ? Object.keys(response.data[0]) : activeSheet.columns;

      setActiveSheet(prev => prev ? {
        ...prev,
        columns: newCols,
        rowCount: response.data.length,
        data: response.data
      } : null);

      setAppliedActions(prev => [...prev, ...pendingActions]);

      const auditMsg = `✓ ${response.explanation} (${response.summary.affectedRows} rows affected)`;
      setAuditTrail(prev => [...prev, auditMsg]);
      setChatHistory(prev => [...prev, { sender: 'ai', text: auditMsg, success: true }]);
      setPendingActions([]);
      loadRecentFilesAndHistory();
    } catch (err: any) {
      alert(err.message || 'Failed to apply spreadsheet updates.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Undo last action
  const handleUndo = () => {
    if (history.length === 0 || !activeSheet) return;
    
    const previousData = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    const prevCols = previousData.length > 0 ? Object.keys(previousData[0]) : activeSheet.columns;
    
    setActiveSheet({
      ...activeSheet,
      columns: prevCols,
      rowCount: previousData.length,
      data: previousData
    });
    
    setHistory(newHistory);
    
    // Restore actions history
    const prevActions = actionHistory[actionHistory.length - 1] || [];
    setAppliedActions(prevActions);
    setActionHistory(prev => prev.slice(0, -1));
    
    // Remove last audit item
    if (auditTrail.length > 0) {
      setAuditTrail(prev => prev.slice(0, -1));
    }
    setChatHistory(prev => [...prev, { sender: 'ai', text: 'Undid last spreadsheet transformation successfully.' }]);
  };

  // AI Formula Generator
  const handleFormulaGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formulaPrompt || !activeSheet) return;

    setGeneratingFormula(true);
    try {
      const res = await api.generateFormula(formulaPrompt, activeSheet.columns);
      setGeneratedFormulaResult(res);
    } catch (err) {
      alert('Failed to generate formula.');
    } finally {
      setGeneratingFormula(false);
    }
  };

  // Add formula column (stage for diff confirmation)
  const applyFormulaColumn = async () => {
    if (!generatedFormulaResult || !activeSheet) return;
    
    const action = {
      type: 'generate_formula' as const,
      params: {
        formulaName: generatedFormulaResult.targetColumn,
        formulaExpression: generatedFormulaResult.expression,
        targetColumn: generatedFormulaResult.targetColumn
      },
      description: `Calculated formula ${generatedFormulaResult.targetColumn} (= ${generatedFormulaResult.formula})`
    };

    setPrompt(`Calculate Profit as ${generatedFormulaResult.formula}`);
    setAiExplanation(`Generate formula column: ${generatedFormulaResult.targetColumn}.\nFormula: ${generatedFormulaResult.formula}\nExplanation: ${generatedFormulaResult.explanation}`);
    setPendingActions([action]);
    setShowPreviewModal(true);

    // Clean generated results
    setGeneratedFormulaResult(null);
    setFormulaPrompt('');
  };

  // AI Dashboard Analytics
  const handleDashboardGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardPrompt || !activeSheet) return;

    setGeneratingDashboard(true);
    try {
      const res = await api.generateDashboard(dashboardPrompt, activeSheet.columns, activeSheet.data);
      setDashboardData(res);
    } catch (err) {
      alert('Failed to analyze dashboard KPIs.');
    } finally {
      setGeneratingDashboard(false);
    }
  };

  // AI Report Generator
  const handleReportGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportPrompt || !activeSheet) return;

    setGeneratingReport(true);
    try {
      const res = await api.generateReport(reportPrompt, activeSheet.columns, activeSheet.data);
      setReportResult(res);
    } catch (err) {
      alert('Failed to compile summary report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Save active workflow
  const handleSaveWorkflow = async () => {
    if (!workflowName || appliedActions.length === 0) return;
    setSavingWorkflow(true);
    try {
      await api.saveWorkflow(workflowName, workflowDescription, appliedActions);
      alert('Workflow saved successfully!');
      setWorkflowName('');
      setWorkflowDescription('');
      loadWorkflows();
    } catch (err) {
      alert('Failed to save workflow template.');
    } finally {
      setSavingWorkflow(false);
    }
  };

  // Run Saved Workflow (stage for confirmation modal)
  const handleRunWorkflow = async (workflow: IWorkflow) => {
    if (!activeSheet) {
      alert('Please connect a spreadsheet first.');
      return;
    }
    setPrompt(`Run workflow: ${workflow.name}`);
    setAiExplanation(`Apply automation recipe: ${workflow.name}.\nSteps:\n${workflow.steps.map((s, idx) => `${idx + 1}. ${s.description || s.type}`).join('\n')}`);
    setPendingActions(workflow.steps);
    setShowPreviewModal(true);
  };

  // Filtering row search
  const filteredData = activeSheet
    ? activeSheet.data.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : [];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-canvas-soft text-ink">
      
      {/* Workspace Header Nav */}
      <header className="flex items-center justify-between px-6 h-16 bg-canvas border-b border-hairline z-10 shrink-0">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="p-1.5 hover:bg-canvas-soft-2 rounded-md transition-colors text-body">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <span className="font-mono text-xs uppercase tracking-wider px-2 py-0.5 border border-hairline rounded bg-canvas-soft-2">
            Workspace
          </span>
          <h1 className="text-sm font-semibold truncate max-w-[200px] md:max-w-xs">
            {activeSheet ? activeSheet.name : 'Untitled Spreadsheet'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {activeSheet && (
            <>
              {history.length > 0 && (
                <button
                  onClick={handleUndo}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md hover:bg-canvas-soft-2 text-body border border-hairline transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Undo Last
                </button>
              )}
              {activeSheet.type === 'google' && (
                <button
                  onClick={handleGoogleSheetExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md hover:bg-canvas-soft-2 text-link border border-hairline transition-colors"
                >
                  <Database className="w-3.5 h-3.5" />
                  Sync to Google Sheets
                </button>
              )}
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-on-primary hover:bg-black/90 transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Export XLSX
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Workspace Sidebar / Chat Interface */}
        <aside className={`${sidebarOpen ? 'w-80 md:w-96' : 'w-0'} flex flex-col border-r border-hairline bg-canvas transition-all duration-300 overflow-hidden relative shrink-0`}>
          <div className="flex flex-col h-full">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-hairline text-xs font-medium overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                onClick={() => setActiveTab('sheet')}
                className={`flex-1 px-3 py-3 border-b-2 text-center transition-all ${activeTab === 'sheet' ? 'border-primary text-ink' : 'border-transparent text-body hover:text-ink'}`}
              >
                AI Commands
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 px-3 py-3 border-b-2 text-center transition-all ${activeTab === 'dashboard' ? 'border-primary text-ink' : 'border-transparent text-body hover:text-ink'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex-1 px-3 py-3 border-b-2 text-center transition-all ${activeTab === 'reports' ? 'border-primary text-ink' : 'border-transparent text-body hover:text-ink'}`}
              >
                Reports
              </button>
              <button
                onClick={() => setActiveTab('workflows')}
                className={`flex-1 px-3 py-3 border-b-2 text-center transition-all ${activeTab === 'workflows' ? 'border-primary text-ink' : 'border-transparent text-body hover:text-ink'}`}
              >
                Workflows
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-3 py-3 border-b-2 text-center transition-all ${activeTab === 'history' ? 'border-primary text-ink' : 'border-transparent text-body hover:text-ink'}`}
              >
                History
              </button>
            </div>

            {/* TAB: AI Commands */}
            {activeTab === 'sheet' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Chat Message Window */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-xs text-mute p-4 space-y-3">
                      <Sparkles className="w-8 h-8 text-primary" />
                      <p className="font-medium text-body">Ask Gemini to clean, shape, or analyze your sheet.</p>
                      <div className="grid grid-cols-1 gap-1.5 w-full text-left font-mono">
                        <button onClick={() => setPrompt('Remove duplicate rows')} className="p-2 border border-hairline rounded hover:bg-canvas-soft-2 text-left">
                          &gt; Remove duplicate rows
                        </button>
                        <button onClick={() => setPrompt('Sort columns alphabetically')} className="p-2 border border-hairline rounded hover:bg-canvas-soft-2 text-left">
                          &gt; Sort data
                        </button>
                        <button onClick={() => setPrompt('Split Full Name into First Name and Last Name')} className="p-2 border border-hairline rounded hover:bg-canvas-soft-2 text-left">
                          &gt; Split Name columns
                        </button>
                      </div>
                    </div>
                  ) : (
                    chatHistory.map((chat, idx) => (
                      <div key={idx} className={`flex flex-col ${chat.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-lg p-3 text-sm ${chat.sender === 'user' ? 'bg-primary text-on-primary' : 'bg-canvas-soft-2 border border-hairline text-ink'}`}>
                          <p className="whitespace-pre-wrap">{chat.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {loadingPreview && (
                    <div className="flex items-center gap-2 text-xs text-mute font-mono">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI interpreting instructions...
                    </div>
                  )}
                </div>

                {/* Audit log (Detailed changes listing) */}
                {auditTrail.length > 0 && (
                  <div className="border-t border-hairline bg-canvas-soft-2 p-3 space-y-1.5">
                    <p className="text-xs font-mono font-semibold uppercase tracking-wider text-mute">Audit Logs</p>
                    <div className="max-h-[100px] overflow-y-auto text-[11px] font-mono space-y-1">
                      {auditTrail.map((log, idx) => (
                        <div key={idx} className="text-success truncate">{log}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat input form */}
                <form onSubmit={handleCommandSubmit} className="p-3 border-t border-hairline bg-canvas">
                  <div className="relative">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={activeSheet ? "Rename columns, filter values..." : "Upload sheet first..."}
                      disabled={!activeSheet || loadingPreview}
                      className="input-field pr-10 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={!activeSheet || loadingPreview || !prompt}
                      className="absolute right-1 top-1 p-2 rounded hover:bg-canvas-soft text-primary disabled:text-mute"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* AI Formula Generator Drawer Section */}
                <div className="border-t border-hairline bg-canvas p-3">
                  <p className="text-xs font-semibold text-body mb-2 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-violet" />
                    AI Formula Generator
                  </p>
                  <form onSubmit={handleFormulaGenerate} className="flex gap-2">
                    <input
                      type="text"
                      value={formulaPrompt}
                      onChange={(e) => setFormulaPrompt(e.target.value)}
                      placeholder="e.g. Sales growth formula"
                      disabled={!activeSheet || generatingFormula}
                      className="input-field h-8 text-xs flex-1"
                    />
                    <button
                      type="submit"
                      disabled={!activeSheet || generatingFormula || !formulaPrompt}
                      className="btn-primary h-8 py-0 px-3 text-xs"
                    >
                      {generatingFormula ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Generate'}
                    </button>
                  </form>

                  {generatedFormulaResult && (
                    <div className="mt-2.5 p-3 rounded-lg border border-hairline bg-canvas-soft-2 text-xs space-y-2 font-mono">
                      <div className="font-semibold text-ink break-all select-all">{generatedFormulaResult.formula}</div>
                      <p className="text-body font-sans text-[11px] leading-relaxed">{generatedFormulaResult.explanation}</p>
                      <button
                        onClick={applyFormulaColumn}
                        className="btn-primary w-full h-7 text-[11px] rounded"
                      >
                        Apply Column: {generatedFormulaResult.targetColumn}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Dashboard Generator */}
            {activeTab === 'dashboard' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-mute">AI Dashboard Generator</h3>
                  <p className="text-xs text-body">Generate Charts, trend analysis and aggregations.</p>
                </div>

                <form onSubmit={handleDashboardGenerate} className="space-y-2">
                  <textarea
                    value={dashboardPrompt}
                    onChange={(e) => setDashboardPrompt(e.target.value)}
                    placeholder="e.g. Pivot revenue by month, draw bar charts"
                    rows={3}
                    disabled={!activeSheet || generatingDashboard}
                    className="input-field text-xs h-auto p-2 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!activeSheet || generatingDashboard || !dashboardPrompt}
                    className="btn-primary w-full text-xs h-9"
                  >
                    {generatingDashboard ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Build Dashboard'}
                  </button>
                </form>

                {dashboardData && (
                  <div className="space-y-4 font-mono text-xs">
                    {/* KPIs */}
                    {dashboardData.kpis && dashboardData.kpis.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {dashboardData.kpis.map((kpi: any, idx: number) => (
                          <div key={idx} className="p-3 border border-hairline bg-canvas-soft-2 rounded-lg">
                            <span className="text-mute text-[10px] truncate block">{kpi.label}</span>
                            <span className="font-semibold text-sm text-ink">{kpi.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Chart Mockup */}
                    {dashboardData.charts && dashboardData.charts.map((chart: any, idx: number) => (
                      <div key={idx} className="p-3 border border-hairline rounded-lg bg-canvas-soft-2 space-y-2">
                        <span className="font-semibold text-ink text-xs">{chart.title}</span>
                        {/* Render simple HTML visual bars for high-aesthetics without large dependencies */}
                        <div className="space-y-1.5 pt-2">
                          {chart.labels.map((lbl: string, lIdx: number) => {
                            const val = chart.values[lIdx];
                            const max = Math.max(...chart.values, 1);
                            const widthPercent = Math.round((val / max) * 100);
                            return (
                              <div key={lIdx} className="space-y-0.5">
                                <div className="flex justify-between text-[10px] text-body">
                                  <span>{lbl}</span>
                                  <span>{val}</span>
                                </div>
                                <div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-primary h-full rounded-full" style={{ width: `${widthPercent}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <p className="text-body font-sans text-[11px] leading-relaxed border-t border-hairline pt-3">{dashboardData.summary}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Report Generator */}
            {activeTab === 'reports' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-mute">AI Report Generator</h3>
                  <p className="text-xs text-body">Summarize Excel files and compile customizable recruitment, sales or inventory sheets.</p>
                </div>

                <form onSubmit={handleReportGenerate} className="space-y-2">
                  <textarea
                    value={reportPrompt}
                    onChange={(e) => setReportPrompt(e.target.value)}
                    placeholder="e.g. Sales summary grouping by Department and average revenue"
                    rows={3}
                    disabled={!activeSheet || generatingReport}
                    className="input-field text-xs h-auto p-2 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!activeSheet || generatingReport || !reportPrompt}
                    className="btn-primary w-full text-xs h-9"
                  >
                    {generatingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Compile Report'}
                  </button>
                </form>

                {reportResult && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="p-3 border border-hairline rounded-lg bg-canvas-soft-2 space-y-2">
                      <span className="font-semibold text-ink text-xs block">{reportResult.title}</span>
                      <p className="text-body font-sans text-[11px] leading-relaxed">{reportResult.summaryText}</p>
                    </div>

                    {/* Mini table preview of Report data */}
                    {reportResult.reportData && reportResult.reportData.length > 0 && (
                      <div className="border border-hairline rounded-lg overflow-hidden">
                        <table className="w-full text-[10px] text-left border-collapse">
                          <thead>
                            <tr className="bg-canvas-soft-2 border-b border-hairline text-mute uppercase font-mono">
                              {Object.keys(reportResult.reportData[0]).map((h, idx) => (
                                <th key={idx} className="p-2">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {reportResult.reportData.map((row: any, rIdx: number) => (
                              <tr key={rIdx} className="border-b border-hairline last:border-0 hover:bg-canvas-soft-2">
                                {Object.values(row).map((val: any, cIdx: number) => (
                                  <td key={cIdx} className="p-2">{String(val)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button
                          onClick={async () => {
                            const blob = await api.downloadExcel(Object.keys(reportResult.reportData[0]), reportResult.reportData, reportResult.title);
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${reportResult.title}.xlsx`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="w-full py-2 bg-primary text-on-primary hover:bg-black/90 font-sans text-xs flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3 h-3" />
                          Download Report Sheet
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Saved Workflows */}
            {activeTab === 'workflows' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-mute">Saved Workflows</h3>
                  <p className="text-xs text-body">Re-apply automation recipes to new spreadsheets.</p>
                </div>

                {auditTrail.length > 0 && (
                  <div className="border border-hairline rounded-lg p-3 bg-canvas-soft-2 space-y-3">
                    <span className="font-semibold text-xs text-ink">Save Current Recipe</span>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Workflow Name (e.g. Weekly Cleaning)"
                        value={workflowName}
                        onChange={(e) => setWorkflowName(e.target.value)}
                        className="input-field h-8 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Description (optional)"
                        value={workflowDescription}
                        onChange={(e) => setWorkflowDescription(e.target.value)}
                        className="input-field h-8 text-xs"
                      />
                      <button
                        onClick={handleSaveWorkflow}
                        disabled={!workflowName || savingWorkflow}
                        className="btn-primary w-full h-8 text-xs rounded"
                      >
                        {savingWorkflow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Steps'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  {savedWorkflows.length === 0 ? (
                    <p className="text-xs text-mute text-center p-4">No saved workflows yet.</p>
                  ) : (
                    savedWorkflows.map((flow) => (
                      <div key={flow._id} className="p-3 border border-hairline rounded-lg bg-canvas flex justify-between items-center hover:border-hairline-strong transition-all">
                        <div className="text-xs">
                          <p className="font-semibold text-ink">{flow.name}</p>
                          <p className="text-[10px] text-body truncate max-w-[180px]">{flow.description || 'No description'}</p>
                        </div>
                        <button
                          onClick={() => handleRunWorkflow(flow)}
                          className="p-1.5 hover:bg-canvas-soft-2 rounded text-success border border-hairline"
                        >
                          <Play className="w-3 h-3 fill-success" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: History */}
            {activeTab === 'history' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-mute">Workspace History</h3>
                  <p className="text-xs text-body font-sans">View recently processed spreadsheet files and the AI transformations trail.</p>
                </div>

                {/* Switch Spreadsheet Files */}
                <div className="space-y-2">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-mute">Switch Spreadsheet File</span>
                  {recentFiles.length === 0 ? (
                    <p className="text-xs text-mute font-mono">No past spreadsheets found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {recentFiles.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => handleLoadRecentFile(file.id)}
                          className={`w-full p-2.5 border rounded-lg flex items-center justify-between text-left group cursor-pointer transition-all ${activeSheet?.fileId === file.id ? 'border-primary bg-canvas-soft-2 font-semibold' : 'border-hairline bg-canvas hover:border-hairline-strong'}`}
                        >
                          <div className="truncate pr-1 text-xs font-sans">
                            <p className="truncate text-ink font-semibold">{file.name}</p>
                            <p className="text-[10px] text-mute font-normal">{file.rowCount} rows · {file.type}</p>
                          </div>
                          {activeSheet?.fileId === file.id ? (
                            <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                          ) : (
                            <ArrowRight className="w-3 h-3 text-mute group-hover:translate-x-0.5 transition-transform shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Commands Audit Trail */}
                <div className="space-y-2 border-t border-hairline pt-4">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-mute">Past Operations Trail</span>
                  {pastOperations.length === 0 ? (
                    <p className="text-xs text-mute font-mono">No past operations logged.</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {pastOperations.map((op, idx) => (
                        <div key={op._id || idx} className="p-3 border border-hairline rounded-lg bg-canvas text-xs space-y-1">
                          <div className="flex justify-between items-start font-mono text-[10px]">
                            <span className="text-violet font-semibold uppercase">{op.success ? 'Success' : 'Failed'}</span>
                            <span className="text-mute">{new Date(op.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <p className="font-semibold text-ink break-all italic">"{op.prompt}"</p>
                          <p className="text-body leading-relaxed text-[11px] font-sans">{op.explanation}</p>
                          {op.columnsChanged && op.columnsChanged.length > 0 && (
                            <div className="pt-1 text-[10px] text-mute font-mono">
                              Columns: <strong className="text-ink">{op.columnsChanged.join(', ')}</strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Workspace Sheet Spreadsheet View Screen */}
        <main className="flex-1 flex flex-col min-w-0 bg-canvas-soft relative">
          
          {/* Main workspace action layout */}
          {!activeSheet ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-6">
              <div className="mesh-gradient-bg" />
              
              <div className="p-4 bg-canvas rounded-full border border-hairline shadow-sm">
                <FileSpreadsheet className="w-12 h-12 text-primary" />
              </div>

              {stagedWorkflow && (
                <div className="w-full p-4 border border-violet-soft bg-violet-soft/10 rounded-xl text-left space-y-2 relative overflow-hidden animate-pulse">
                  <div className="flex items-center gap-2 text-violet">
                    <Sparkles className="w-4 h-4 fill-violet" />
                    <span className="font-semibold text-xs uppercase tracking-wider font-mono">Staged Automation</span>
                  </div>
                  <p className="text-xs text-body font-medium">
                    Workflow <strong className="text-ink">"{stagedWorkflow.name}"</strong> is ready to run. Connect a spreadsheet or select a recent one below to execute its {stagedWorkflow.steps.length} scheduled transformations.
                  </p>
                  <button 
                    onClick={() => setStagedWorkflow(null)} 
                    className="absolute top-2.5 right-2.5 text-mute hover:text-ink text-xs font-mono border border-hairline px-1.5 py-0.5 rounded bg-canvas cursor-pointer hover:bg-canvas-soft-2 transition-colors"
                  >
                    Clear Staged
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <h2 className="display-md text-ink">Connect Your Data Source</h2>
                <p className="text-sm text-body">Upload an Excel file (.xlsx), CSV, or connect a Google Sheets spreadsheet directly using your drive credentials.</p>
              </div>

              {/* Source selections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pt-2">
                {/* Upload Local */}
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-hairline hover:border-hairline-strong rounded-xl bg-canvas cursor-pointer transition-all shadow-sm">
                  <Upload className="w-6 h-6 text-mute mb-2" />
                  <span className="text-xs font-semibold text-ink">Upload Excel / CSV</span>
                  <span className="text-[10px] text-mute mt-1">Drag file or click (max 10MB)</span>
                  <input
                    type="file"
                    accept=".csv, .xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Google sheets connection */}
                <div className="flex flex-col items-start justify-center p-6 border border-hairline rounded-xl bg-canvas shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-link" />
                    <span className="text-xs font-semibold text-ink">Google Sheets Sync</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Spreadsheet ID (from URL)"
                    value={googleSpreadsheetId}
                    onChange={(e) => setGoogleSpreadsheetId(e.target.value)}
                    className="input-field h-8 text-xs"
                  />
                  <button
                    onClick={handleGoogleSheetImport}
                    disabled={!googleSpreadsheetId || importingSheet}
                    className="btn-primary w-full h-8 text-xs"
                  >
                    {importingSheet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect Sheet'}
                  </button>
                </div>
              </div>

              {/* Recently Processed Spreadsheets selector */}
              {recentFiles.length > 0 && (
                <div className="w-full text-left space-y-3 pt-6 border-t border-hairline">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-mute">Or Choose Recently Processed Spreadsheet</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recentFiles.slice(0, 4).map((file) => (
                      <button
                        key={file.id}
                        onClick={() => handleLoadRecentFile(file.id)}
                        className="p-3.5 border border-hairline rounded-xl bg-canvas hover:border-hairline-strong transition-all flex items-center justify-between text-left group cursor-pointer shadow-sm active:scale-[0.98] w-full"
                      >
                        <div className="truncate pr-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                            <p className="font-semibold text-xs text-ink group-hover:text-link transition-colors truncate">{file.name}</p>
                          </div>
                          <p className="text-[10px] text-body mt-0.5">{file.rowCount ?? 0} rows · {file.type}</p>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-mute group-hover:text-link group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Spreadsheet Filter / Search Panel */}
              <div className="px-6 py-3 bg-canvas border-b border-hairline flex items-center justify-between shrink-0">
                <div className="relative max-w-xs w-full">
                  <Search className="w-4 h-4 text-mute absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter values inside rows..."
                    className="input-field h-9 pl-9 text-xs"
                  />
                </div>
                <div className="text-xs text-body font-mono">
                  Rows: <span className="font-semibold text-ink">{searchTerm ? filteredData.length : activeSheet.rowCount}</span> | Columns: <span className="font-semibold text-ink">{activeSheet.columns.length}</span>
                </div>
              </div>

              {/* Data Grid table */}
              <div className="flex-1 overflow-auto bg-canvas">
                {filteredData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-mute font-mono">
                    No rows match filter.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-canvas-soft-2 border-b border-hairline sticky top-0 font-mono text-[11px] text-body select-none">
                        <th className="p-3 w-12 text-center">#</th>
                        {activeSheet.columns.map((col, idx) => (
                          <th key={idx} className="p-3 border-r border-hairline last:border-0 font-semibold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-hairline last:border-0 hover:bg-canvas-soft text-xs text-ink font-sans transition-colors">
                          <td className="p-3 border-r border-hairline text-center text-mute font-mono">{rIdx + 1}</td>
                          {activeSheet.columns.map((col, cIdx) => (
                            <td key={cIdx} className="p-3 border-r border-hairline last:border-0 truncate max-w-[200px]">
                              {row[col] !== undefined ? String(row[col]) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MANDATORY PREVIEW CHANGES DIFF MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas rounded-xl border border-hairline-strong max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
            <div className="px-6 py-4 bg-canvas-soft-2 border-b border-hairline flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet" />
                <h3 className="text-sm font-semibold text-ink">Preview Planned Transformations</h3>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-1 hover:bg-canvas-soft-2 rounded text-mute hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="p-3.5 rounded-lg border border-hairline bg-canvas-soft-2 text-xs leading-relaxed text-body">
                <p className="font-semibold text-ink mb-1">AI Explanation:</p>
                {aiExplanation}
              </div>

              {/* Counters summary info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 border border-hairline rounded-lg">
                  <div className="text-[10px] text-mute uppercase font-mono">Current Rows</div>
                  <div className="text-lg font-bold text-ink">{activeSheet?.rowCount}</div>
                </div>
                <div className="p-3 border border-hairline rounded-lg">
                  <div className="text-[10px] text-mute uppercase font-mono">Affected Rows</div>
                  {/* Simulate preview affected values */}
                  <div className="text-lg font-bold text-warning">
                    {pendingActions.find(a => a.type === 'remove_duplicates') ? 'Duplicates check' : 'Calculating...'}
                  </div>
                </div>
                <div className="p-3 border border-hairline rounded-lg">
                  <div className="text-[10px] text-mute uppercase font-mono">Operations Scheduled</div>
                  <div className="text-lg font-bold text-violet">{pendingActions.length}</div>
                </div>
                <div className="p-3 border border-hairline rounded-lg">
                  <div className="text-[10px] text-mute uppercase font-mono">Columns Impacted</div>
                  <div className="text-xs font-semibold text-ink truncate mt-1.5">
                    {pendingActions.map(a => a.params?.oldName || a.params?.column || a.params?.name || 'All').join(', ') || 'None'}
                  </div>
                </div>
              </div>

              {/* Transformation action steps */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-mute">Steps to execute:</span>
                <div className="space-y-1.5">
                  {pendingActions.map((act, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded border border-hairline bg-canvas text-xs font-mono">
                      <CheckCircle className="w-4 h-4 text-success shrink-0" />
                      <span className="font-semibold text-ink uppercase text-[10px] bg-canvas-soft-2 px-1.5 py-0.5 border border-hairline rounded">{act.type}</span>
                      <span className="text-body truncate">{act.description || 'Automation task step'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-canvas-soft-2 border-t border-hairline flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="btn-secondary h-9 px-4 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={applyPendingChanges}
                className="btn-primary h-9 px-4 text-xs"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Auxiliary UI components
const X: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

export const WorkspaceViewWithAuth: React.FC = () => {
  return (
    <AuthProvider>
      <WorkspaceView />
    </AuthProvider>
  );
};
