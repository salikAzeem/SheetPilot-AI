import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from '../../hooks/useAuth';
import { api } from '../../services/api';
import type { IDashboardAnalytics, IWorkflow } from '../../services/api';
import {
  Sparkles, FileSpreadsheet, Plus, Settings, Play, Database,
  TrendingUp, Activity, User, LogOut, ArrowRight, Star, Loader2, Trash, X
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { user, subscription, logout, isGoogleConnected } = useAuth();
  const [analytics, setAnalytics] = useState<IDashboardAnalytics | null>(null);
  const [workflows, setWorkflows] = useState<IWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflowForRun, setSelectedWorkflowForRun] = useState<IWorkflow | null>(null);

  // Upgrade Plan simulation
  const [upgrading, setUpgrading] = useState(false);

  const loadData = async () => {
    try {
      const [analData, workData] = await Promise.all([
        api.getDashboardAnalytics(),
        api.getWorkflows()
      ]);
      setAnalytics(analData);
      setWorkflows(workData);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpgrade = async () => {
    setUpgrading(true);
    // Simulate payment / tier upgrade
    setTimeout(() => {
      alert('Congratulations! You have successfully upgraded to SheetPilot AI Pro.');
      setUpgrading(false);
      window.location.reload();
    }, 1500);
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await api.deleteWorkflow(id);
      loadData();
    } catch (err) {
      alert('Failed to delete workflow.');
    }
  };

  if (loading || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas-soft">
        <div className="flex items-center gap-2 font-mono text-xs text-mute">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Loading SaaS workspace metrics...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-soft text-ink flex flex-col font-sans">
      
      {/* Dashboard Top Navigation */}
      <header className="sticky top-0 bg-canvas border-b border-hairline h-16 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-primary text-on-primary rounded">
            <Sparkles className="w-5 h-5 fill-on-primary" />
          </div>
          <span className="font-semibold text-base tracking-tight">SheetPilot AI</span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="/workspace"
            className="btn-primary h-8 px-3.5 text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Workspace
          </a>

          {/* User Account Dropdown/Details */}
          <div className="flex items-center gap-2 pl-3 border-l border-hairline">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full border border-hairline" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-semibold">
                {user?.name[0]}
              </div>
            )}
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-ink leading-none">{user?.name}</p>
              <span className="text-[10px] text-mute uppercase font-mono tracking-wider">{analytics.metrics.plan} tier</span>
            </div>
            <button
              onClick={logout}
              title="Logout session"
              className="p-1.5 hover:bg-canvas-soft-2 rounded-md text-mute hover:text-ink transition-colors ml-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        
        {/* Decorative background grid mesh */}
        <div className="mesh-gradient-bg" />

        {/* Hero Welcome banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl border border-hairline bg-canvas shadow-sm">
          <div className="space-y-1">
            <h2 className="display-sm text-ink font-semibold">Welcome back, {user?.name.split(' ')[0]}!</h2>
            <p className="text-xs text-body">Ask Gemini to structure, format, and automate spreadsheet chores.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right text-xs">
              <span className="text-mute">Commands Used This Month:</span>
              <p className="font-mono font-semibold text-sm">
                {analytics.metrics.commandsUsed} / {analytics.metrics.commandsLimit === Infinity ? '∞' : analytics.metrics.commandsLimit}
              </p>
            </div>
            {analytics.metrics.plan === 'free' && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="btn-primary h-8 px-3 text-xs bg-violet text-on-primary hover:bg-violet-deep flex items-center gap-1"
              >
                {upgrading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5 fill-on-primary" />}
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>

        {/* 4-Step Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            onClick={() => document.getElementById('recent-spreadsheets-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="card-mktg p-5 flex items-center gap-4 hover:border-primary cursor-pointer hover:shadow-md transition-all active:scale-[0.98] select-none"
            title="Click to jump to recent spreadsheets"
          >
            <div className="p-3 bg-canvas-soft-2 rounded-lg text-primary border border-hairline">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-mute text-[10px] uppercase font-mono tracking-wider block">Spreadsheets Processed</span>
              <span className="text-xl font-bold text-ink">{analytics.metrics.totalFiles}</span>
            </div>
          </div>

          <div className="card-mktg p-5 flex items-center gap-4 select-none">
            <div className="p-3 bg-canvas-soft-2 rounded-lg text-violet border border-hairline">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-mute text-[10px] uppercase font-mono tracking-wider block">AI Commands Run</span>
              <span className="text-xl font-bold text-ink">{analytics.metrics.totalCommands}</span>
            </div>
          </div>

          <div 
            onClick={() => document.getElementById('saved-workflows-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="card-mktg p-5 flex items-center gap-4 hover:border-violet cursor-pointer hover:shadow-md transition-all active:scale-[0.98] select-none"
            title="Click to jump to saved workflows"
          >
            <div className="p-3 bg-canvas-soft-2 rounded-lg text-success border border-hairline">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-mute text-[10px] uppercase font-mono tracking-wider block">Saved Automation Recipes</span>
              <span className="text-xl font-bold text-ink">{analytics.metrics.totalWorkflows}</span>
            </div>
          </div>

          <div className="card-mktg p-5 flex items-center gap-4 select-none">
            <div className="p-3 bg-canvas-soft-2 rounded-lg text-link border border-hairline">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-mute text-[10px] uppercase font-mono tracking-wider block">Google Sheets Sync</span>
              <span className="text-xs font-semibold text-ink mt-0.5 block">
                {isGoogleConnected ? 'Connected & Synced' : 'Sync Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Split Section: Saved Workflows & Recent Activity logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Columns - Spreadsheets & Workflows */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Recent Spreadsheets Processed Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 id="recent-spreadsheets-section" className="text-xs font-mono font-semibold uppercase tracking-wider text-mute">Recent Spreadsheets Processed</h3>
                <a href="/workspace" className="text-xs text-link font-medium hover:underline inline-flex items-center gap-1">
                  New spreadsheet
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {!analytics.recentFiles || analytics.recentFiles.length === 0 ? (
                <div className="border border-hairline border-dashed rounded-xl p-8 text-center text-xs text-mute bg-canvas">
                  No spreadsheets processed yet. Upload an Excel or CSV file in the workspace to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics.recentFiles.map((file: any) => (
                    <a
                      key={file.id}
                      href={`/workspace?fileId=${file.id}`}
                      className="p-4 border border-hairline rounded-xl bg-canvas flex justify-between items-center hover:border-hairline-strong transition-all shadow-sm hover:-translate-y-0.5 group relative overflow-hidden"
                    >
                      <div className="space-y-1.5 text-xs truncate flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-4.5 h-4.5 text-primary shrink-0" />
                          <p className="font-semibold text-ink text-sm truncate group-hover:text-link transition-colors">{file.name}</p>
                        </div>
                        <p className="text-body leading-none text-[11px]">
                          Rows: <strong className="text-ink">{file.rowCount ?? 0}</strong> | Columns: <strong className="text-ink">{file.columnCount ?? 0}</strong>
                        </p>
                        <span className="text-[10px] text-mute font-mono block">
                          {new Date(file.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden group-hover:inline-block font-sans text-[10px] text-link font-medium mr-1 animate-fade-in">
                          Open &rarr;
                        </span>
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-canvas-soft-2 rounded border border-hairline text-mute">
                          {file.type}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Workflows Panel */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 id="saved-workflows-section" className="text-xs font-mono font-semibold uppercase tracking-wider text-mute">Saved Automation Workflows</h3>
                <a href="/workspace" className="text-xs text-link font-medium hover:underline inline-flex items-center gap-1">
                  Configure workflow
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {workflows.length === 0 ? (
                <div className="border border-hairline border-dashed rounded-xl p-8 text-center text-xs text-mute bg-canvas">
                  No automation workflows saved yet. Workflows let you record cleaning steps and apply them instantly to other spreadsheets.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workflows.map((flow) => (
                    <div key={flow._id} className="p-4 border border-hairline rounded-xl bg-canvas flex justify-between items-start hover:border-hairline-strong transition-all shadow-sm">
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-ink text-sm">{flow.name}</p>
                        <p className="text-body leading-relaxed max-w-[200px] truncate">{flow.description || 'No description provided.'}</p>
                        <span className="font-mono text-[10px] text-mute uppercase px-1.5 py-0.5 bg-canvas-soft-2 rounded border border-hairline block w-max mt-2">
                          {flow.steps.length} actions
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setSelectedWorkflowForRun(flow)}
                          className="p-1.5 hover:bg-canvas-soft-2 rounded border border-hairline text-success cursor-pointer"
                          title="Run automation workflow in workspace"
                        >
                          <Play className="w-3.5 h-3.5 fill-success" />
                        </button>
                        <button
                          onClick={() => handleDeleteWorkflow(flow._id)}
                          className="p-1.5 hover:bg-error-soft rounded border border-hairline text-mute hover:text-error cursor-pointer"
                          title="Delete workflow"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column - Activity Logs Panel */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-mute">Recent Operations Trail</h3>
            
            <div className="border border-hairline rounded-xl bg-canvas overflow-hidden shadow-sm">
              {analytics.recentActivity.length === 0 ? (
                <p className="text-xs text-mute text-center p-6 font-mono">No activity logged.</p>
              ) : (
                <div className="divide-y divide-hairline">
                  {analytics.recentActivity.map((log) => (
                    <div key={log.id} className="p-3.5 text-xs flex gap-3 hover:bg-canvas-soft-2 transition-colors">
                      <div className="p-1.5 bg-canvas-soft border border-hairline rounded text-body shrink-0 self-start">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5 truncate flex-1">
                        <p className="font-semibold text-ink truncate capitalize">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-body text-[10px] truncate leading-none">{log.details}</p>
                        <span className="text-[9px] text-mute block pt-1 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* VERCEL-STYLE SPREADSHEET SELECTOR MODAL FOR WORKFLOWS */}
        {selectedWorkflowForRun && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-canvas rounded-xl border border-hairline-strong max-w-md w-full shadow-2xl overflow-hidden font-sans">
              <div className="px-6 py-4 bg-canvas-soft-2 border-b border-hairline flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-success fill-success" />
                  <h3 className="text-sm font-semibold text-ink">Run Automation Workflow</h3>
                </div>
                <button 
                  onClick={() => setSelectedWorkflowForRun(null)} 
                  className="p-1.5 hover:bg-canvas-soft-2 rounded text-mute hover:text-ink cursor-pointer border border-transparent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="text-xs leading-relaxed text-body">
                  Select a recently processed spreadsheet to run the workflow <strong className="text-ink">"{selectedWorkflowForRun.name}"</strong>:
                </div>

                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                  {analytics.recentFiles && analytics.recentFiles.length > 0 ? (
                    analytics.recentFiles.map((file: any) => (
                      <button
                        key={file.id}
                        onClick={() => {
                          window.location.href = `/workspace?fileId=${file.id}&runWorkflow=${selectedWorkflowForRun._id}`;
                        }}
                        className="w-full p-3 border border-hairline rounded-lg bg-canvas hover:border-hairline-strong transition-all flex items-center justify-between text-left group cursor-pointer"
                      >
                        <div className="truncate pr-2">
                          <p className="font-semibold text-xs text-ink group-hover:text-link transition-colors truncate">{file.name}</p>
                          <p className="text-[10px] text-mute">{file.rowCount ?? 0} rows · {file.type}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-mute group-hover:text-link group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))
                  ) : (
                    <div className="text-xs text-mute text-center py-4">No recently processed spreadsheets.</div>
                  )}
                </div>

                <div className="border-t border-hairline pt-4 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      window.location.href = `/workspace?runWorkflow=${selectedWorkflowForRun._id}`;
                    }}
                    className="w-full btn-secondary h-9 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Use a new spreadsheet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer copyright links */}
      <footer className="border-t border-hairline py-6 text-center text-xs text-mute mt-auto shrink-0 bg-canvas">
        © {new Date().getFullYear()} SheetPilot AI Inc. stark black-and-ink duet layout.
      </footer>
    </div>
  );
};

export const DashboardViewWithAuth: React.FC = () => {
  return (
    <AuthProvider>
      <DashboardView />
    </AuthProvider>
  );
};
