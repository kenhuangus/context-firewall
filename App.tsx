import React, { useState } from 'react';
import { LayoutDashboard, Braces, Shield, Settings, Database, FileText } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { ContextCompiler } from './components/ContextCompiler';
import { PolicyViewer } from './components/PolicyViewer';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'compiler' | 'policy'>('dashboard');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">Context Firewall</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Ref Impl v1.0</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-slate-800 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('compiler')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'compiler' 
                ? 'bg-slate-800 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Braces className="h-4 w-4" />
            Compiler & Firewall
          </button>
          <button 
            onClick={() => setActiveTab('policy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'policy' 
                ? 'bg-slate-800 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="h-4 w-4" />
            Policy Config
          </button>
        </nav>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-medium text-slate-400">System Secure</span>
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'dashboard' && (
          <div className="h-full overflow-y-auto">
             <Dashboard />
          </div>
        )}
        {activeTab === 'compiler' && <ContextCompiler />}
        {activeTab === 'policy' && <PolicyViewer />}
      </main>
    </div>
  );
}

export default App;
