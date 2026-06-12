import React, { useState } from 'react';
import { Sparkles, FileSpreadsheet, Play, Database, Check, ChevronDown, ArrowRight, Star, Code } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const useCases = [
    { title: "Sales Teams", desc: "Clean lead sheets, split full names, remove empty emails, sort by revenue deal size." },
    { title: "Recruiters & HR", desc: "Format resumes trackers, clean applicant data, extract department titles." },
    { title: "Small Businesses", desc: "Track stock inventory levels, calculate sales growths, generate summaries." },
    { title: "Marketing Agencies", desc: "Merge addresses, track monthly campaign reports, build KPI dashboards." }
  ];

  const faqs = [
    { q: "How does natural language sheet automation work?", a: "You type instruction in plain English. Our AI parses it using Gemini, shows a preview of rows affected, and runs the spreadsheet operation in memory instantly." },
    { q: "Is my spreadsheet data stored securely?", a: "Yes. CSV/Excel files are processed temporarily on the backend and are not stored in our databases. We only store file metadata, command logs, and workflows." },
    { q: "Can I connect my Google Sheets directly?", a: "Yes, you can link spreadsheets using our secure Google Sheets Drive OAuth integration, syncing changes back dynamically." },
    { q: "What is included in the Free tier?", a: "Free tier gives you up to 5 spreadsheets uploads per month and 50 AI commands." }
  ];

  return (
    <div className="bg-canvas-soft text-ink font-sans selection:bg-primary selection:text-on-primary min-h-screen overflow-x-hidden relative">
      <div className="mesh-gradient-bg" />

      {/* Global Top Sticky Header */}
      <header className="sticky top-0 bg-canvas/85 backdrop-blur-md border-b border-hairline h-16 flex items-center justify-between px-6 md:px-12 z-40">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-primary text-on-primary rounded">
            <Sparkles className="w-5 h-5 fill-on-primary" />
          </div>
          <span className="font-semibold text-base tracking-tight">SheetPilot AI</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs text-body font-medium">
          <a href="#features" className="hover:text-ink transition-colors">Features</a>
          <a href="#demo" className="hover:text-ink transition-colors">Product Demo</a>
          <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
          <a href="/blog" className="hover:text-ink transition-colors">Blog</a>
        </nav>

        <div className="flex items-center gap-3">
          <a href="/auth/login" className="btn-secondary h-8 px-4 text-xs">
            Log In
          </a>
          <a href="/auth/login" className="btn-primary h-8 px-4 text-xs">
            Get Started
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center space-y-8 relative">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-hairline bg-canvas text-xs text-body hover:border-hairline-strong transition-all cursor-pointer">
          <Sparkles className="w-3.5 h-3.5 text-violet" />
          <span>Introducing v1.0 AI Engine</span>
        </div>

        <h1 className="display-xl tracking-tighter max-w-3xl mx-auto text-ink">
          ChatGPT for Spreadsheets.
        </h1>

        <p className="text-body text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          Automate Google Sheets, Excel, and CSV files using plain English commands. Clean, format, and generate reports automatically.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
          <a href="/auth/login" className="btn-primary h-12 px-6 text-sm flex items-center gap-2">
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#demo" className="btn-secondary h-12 px-6 text-sm flex items-center gap-1.5">
            <Play className="w-4 h-4 fill-ink" />
            Watch Demo
          </a>
        </div>
      </section>

      {/* Product Demo Mockup */}
      <section id="demo" className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-xl border border-hairline shadow-2xl bg-canvas overflow-hidden">
          {/* Mockup Header bar */}
          <div className="px-4 py-3 bg-canvas-soft-2 border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-error block" />
              <span className="w-3 h-3 rounded-full bg-warning block" />
              <span className="w-3 h-3 rounded-full bg-success block" />
            </div>
            <div className="text-xs text-mute font-mono">Workspace.csv</div>
            <div className="w-12" />
          </div>

          <div className="flex flex-col md:flex-row h-[350px]">
            {/* Spreadsheet Preview (Left) */}
            <div className="flex-1 bg-canvas overflow-hidden border-r border-hairline">
              <table className="w-full text-left text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="bg-canvas-soft-2 border-b border-hairline text-mute">
                    <th className="p-2 border-r border-hairline">Name</th>
                    <th className="p-2 border-r border-hairline">Email</th>
                    <th className="p-2">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-hairline text-red-500 line-through">
                    <td className="p-2 border-r border-hairline">John Doe</td>
                    <td className="p-2 border-r border-hairline">john@example.com</td>
                    <td className="p-2">123-456-7890</td>
                  </tr>
                  <tr className="border-b border-hairline bg-green-50/50">
                    <td className="p-2 border-r border-hairline">Sarah Connor</td>
                    <td className="p-2 border-r border-hairline">sarah@gmail.com</td>
                    <td className="p-2">987-654-3210</td>
                  </tr>
                  <tr className="border-b border-hairline text-red-500 line-through">
                    <td className="p-2 border-r border-hairline">John Doe</td>
                    <td className="p-2 border-r border-hairline">john@example.com</td>
                    <td className="p-2">123-456-7890</td>
                  </tr>
                  <tr className="border-b border-hairline bg-green-50/50">
                    <td className="p-2 border-r border-hairline">Alex Mercer</td>
                    <td className="p-2 border-r border-hairline">alex@live.com</td>
                    <td className="p-2">456-112-2334</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* AI Prompter Side (Right) */}
            <div className="w-80 bg-canvas-soft-2 p-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="p-1 bg-primary text-on-primary rounded text-xs self-start shrink-0">AI</div>
                  <div className="bg-canvas p-2.5 rounded border border-hairline text-[11px] leading-relaxed">
                    Analyzing spreadsheet... Found 4 rows. Ready to execute commands.
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <div className="bg-primary text-on-primary p-2.5 rounded text-[11px] leading-relaxed">
                    Remove duplicates and rename Phone to Mobile.
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="p-1 bg-primary text-on-primary rounded text-xs self-start shrink-0">AI</div>
                  <div className="bg-canvas p-2.5 rounded border border-hairline text-[11px] leading-relaxed font-mono">
                    <span className="text-success font-semibold">Preview Changes:</span>
                    <br />✓ Removed 1 duplicate row (John Doe)
                    <br />✓ Renamed column Phone → Mobile
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button disabled className="btn-primary w-full text-xs h-8">
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features List Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 border-t border-hairline space-y-12">
        <div className="text-center space-y-3">
          <h2 className="display-lg text-ink">Built for Data Transformation.</h2>
          <p className="text-xs text-body uppercase font-mono tracking-widest">Powerful AI automation tools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-mktg space-y-3">
            <div className="p-2 bg-canvas-soft-2 rounded border border-hairline w-max">
              <Database className="w-5 h-5 text-link" />
            </div>
            <h3 className="text-sm font-semibold text-ink">Import Any Source</h3>
            <p className="text-xs text-body leading-relaxed">Connect spreadsheets dynamically with Google Sheets, or drag and drop Excel (.xlsx) and CSV files directly into your browser workspace.</p>
          </div>

          <div className="card-mktg space-y-3">
            <div className="p-2 bg-canvas-soft-2 rounded border border-hairline w-max">
              <Sparkles className="w-5 h-5 text-violet" />
            </div>
            <h3 className="text-sm font-semibold text-ink">1-Click AI Transforms</h3>
            <p className="text-xs text-body leading-relaxed">Write prompts like 'remove blank rows' or 'split columns'. Gemini builds a preview of the changes before applying them.</p>
          </div>

          <div className="card-mktg space-y-3">
            <div className="p-2 bg-canvas-soft-2 rounded border border-hairline w-max">
              <Code className="w-5 h-5 text-success" />
            </div>
            <h3 className="text-sm font-semibold text-ink">AI Formula Builder</h3>
            <p className="text-xs text-body leading-relaxed">Describe mathematical or logic operations (like commissions, metrics, growths) and get Excel-compatible formula results with complete step explanations.</p>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-canvas border-y border-hairline py-20">
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="display-lg text-ink">Who uses SheetPilot AI?</h2>
            <p className="text-xs text-body max-w-md mx-auto">From operational teams to startups, automate spreadsheet pipelines effortlessly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((uc, idx) => (
              <div key={idx} className="p-5 bg-canvas-soft rounded-lg border border-hairline space-y-2.5">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-ink">{uc.title}</h4>
                <p className="text-xs text-body leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Page Section */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="display-lg text-ink">Simple, transparent pricing.</h2>
          <p className="text-xs text-body">Choose the plan that matches your monthly workflow.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Free Plan */}
          <div className="p-8 border border-hairline bg-canvas rounded-xl flex flex-col justify-between space-y-6 shadow-sm">
            <div className="space-y-4">
              <span className="font-mono text-xs uppercase text-mute tracking-wider block">Free Plan</span>
              <h3 className="display-md text-ink">$0</h3>
              <p className="text-xs text-body leading-relaxed">Perfect for freelancers and operations teams testing AI capabilities.</p>
              <ul className="text-xs text-body space-y-2.5 pt-4 border-t border-hairline">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-success shrink-0" />
                  <span>5 spreadsheets processed per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-success shrink-0" />
                  <span>50 AI commands per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-success shrink-0" />
                  <span>Excel and CSV uploads</span>
                </li>
              </ul>
            </div>
            <a href="/auth/login" className="btn-secondary w-full text-xs h-9">
              Start Free
            </a>
          </div>

          {/* Pro Plan */}
          <div className="p-8 border border-primary bg-primary text-on-primary rounded-xl flex flex-col justify-between space-y-6 shadow-xl relative">
            <div className="absolute top-4 right-4 bg-violet text-on-primary text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full">
              Popular
            </div>
            <div className="space-y-4">
              <span className="font-mono text-xs uppercase text-mute tracking-wider block">Pro Plan</span>
              <h3 className="display-md text-on-primary">$19<span className="text-xs text-mute">/month</span></h3>
              <p className="text-xs text-mute leading-relaxed">Best for sales, marketing, operations, and agencies running automated data operations daily.</p>
              <ul className="text-xs text-mute space-y-2.5 pt-4 border-t border-hairline/20">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-success shrink-0" />
                  <span>Unlimited spreadsheet uploads</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-success shrink-0" />
                  <span>Unlimited AI commands</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-success shrink-0" />
                  <span>Google Sheets API integrations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-success shrink-0" />
                  <span>Advanced report & dashboard builder</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-success shrink-0" />
                  <span>Saved automation workflows</span>
                </li>
              </ul>
            </div>
            <a href="/auth/login" className="btn-primary w-full text-xs h-9 bg-canvas text-primary hover:bg-canvas-soft">
              Get Started Pro
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-6 py-20 border-t border-hairline space-y-8">
        <h2 className="display-sm text-center text-ink">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-hairline rounded-lg bg-canvas overflow-hidden">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full px-5 py-4 text-left font-medium text-xs text-ink flex justify-between items-center hover:bg-canvas-soft transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-mute transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-4 text-xs text-body leading-relaxed font-sans border-t border-hairline pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Band */}
      <section className="bg-primary text-on-primary py-20 text-center relative overflow-hidden">
        <div className="max-w-xl mx-auto px-6 space-y-6 relative z-10">
          <h2 className="display-lg text-on-primary">Supercharge your spreadsheets.</h2>
          <p className="text-xs text-mute leading-relaxed max-w-sm mx-auto">
            Stop sorting manually, cleaning blank rows, and formatting phone columns. Let Gemini automate your sheet cleaning pipeline.
          </p>
          <a href="/auth/login" className="btn-primary h-10 px-5 text-xs bg-canvas text-primary hover:bg-canvas-soft inline-flex items-center gap-1.5 mt-2">
            Get Started Free
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline bg-canvas py-12 px-6 md:px-12 text-xs text-mute text-center font-sans space-y-3">
        <p className="font-semibold text-ink">SheetPilot AI Inc.</p>
        <p>A stark black-and-ink duet platform built for spreadsheet operations.</p>
        <p>© {new Date().getFullYear()} All rights reserved. • <a href="/privacy" className="hover:text-ink underline transition-all">Privacy Policy</a></p>
      </footer>
    </div>
  );
};
