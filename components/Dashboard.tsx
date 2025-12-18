import React, { useState, useMemo, useEffect } from 'react';
import { Dataset, AnalysisResult, FilterState } from '../types';
import { ChartRenderer } from './ChartRenderer';
import { DataStudio } from './DataStudio';
import { ReportBuilder } from './ReportBuilder';
import { AIChat } from './AIChat';
import { CorrelationHeatmap } from './CorrelationHeatmap';
import { sampleDataForAI } from '../services/dataService';

interface DashboardProps {
  dataset: Dataset;
  analysis: AnalysisResult;
  onReset: () => void;
}

const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-4 z-[60] animate-in slide-in-from-bottom-5">
    <span>{message}</span>
    <button onClick={onClose} className="text-slate-400 hover:text-white">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  </div>
);

type ViewMode = 'DASHBOARD' | 'STUDIO' | 'REPORT';

export const Dashboard: React.FC<DashboardProps> = ({ dataset: initialDataset, analysis, onReset }) => {
  const [dataset, setDataset] = useState(initialDataset);
  const [viewMode, setViewMode] = useState<ViewMode>('DASHBOARD');
  
  const [expandedChartId, setExpandedChartId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  // Customization Options
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  // Filter State (Global Search + Drill Down)
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterState>({});

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    let data = dataset.data;

    // Apply drill-down filters
    Object.entries(activeFilters).forEach(([key, value]) => {
       data = data.filter(row => row[key] == value);
    });

    // Apply global search
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(lowerTerm)
        )
      );
    }
    return data;
  }, [dataset.data, searchTerm, activeFilters]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateDataset = (updatedData: any[]) => {
    setDataset({ ...dataset, data: updatedData });
  };

  const handleDrillDown = (key: string, value: string | number) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }));
    showToast(`Filtered by ${key}: ${value}`);
  };

  const removeFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
  };

  const expandedChart = useMemo(() => 
    analysis.recommendedCharts.find(c => c.id === expandedChartId), 
  [expandedChartId, analysis.recommendedCharts]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedChartId(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans relative">
      {/* Toast Notification */}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      {/* AI Chat Widget */}
      <AIChat 
        isOpen={showChat} 
        onToggle={() => setShowChat(!showChat)} 
        analysis={analysis} 
        dataset={dataset} 
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm h-16">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
               <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
               </svg>
             </div>
             <div>
               <h1 className="text-base font-bold text-slate-900 leading-none">AutoViz</h1>
               <span className="text-xs text-slate-500">{dataset.name}</span>
             </div>
           </div>

           {/* View Tabs */}
           <div className="flex bg-slate-100 p-1 rounded-lg">
              {(['DASHBOARD', 'STUDIO', 'REPORT'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    viewMode === mode 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {mode === 'DASHBOARD' ? 'Dashboard' : mode === 'STUDIO' ? 'Data Studio' : 'Report Builder'}
                </button>
              ))}
           </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="text-right mr-2 hidden md:block">
             <p className="text-xs font-bold text-slate-700">{filteredData.length.toLocaleString()} rows</p>
             <p className="text-[10px] text-slate-400">Total: {dataset.rowCount.toLocaleString()}</p>
           </div>
           <button onClick={onReset} className="text-xs font-medium text-slate-500 hover:text-slate-900 px-3 py-2 transition-colors">
             New Upload
           </button>
           <button onClick={() => setShowChat(!showChat)} className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors border border-indigo-100">
             Ask AI
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-slate-50/50 p-4 lg:p-6 scroll-smooth">
        <div className="max-w-[1600px] mx-auto h-full flex flex-col">
          
          {/* DASHBOARD VIEW */}
          {viewMode === 'DASHBOARD' && (
            <div className="space-y-6">
              
              {/* Active Filters Bar */}
              {(Object.keys(activeFilters).length > 0 || searchTerm) && (
                <div className="flex items-center gap-2 flex-wrap pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Filters:</span>
                  {searchTerm && (
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                      Search: "{searchTerm}"
                      <button onClick={() => setSearchTerm('')} className="hover:text-indigo-900">×</button>
                    </span>
                  )}
                  {Object.entries(activeFilters).map(([key, value]) => (
                    <span key={key} className="bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 shadow-sm">
                      {key}: {value}
                      <button onClick={() => removeFilter(key)} className="text-slate-400 hover:text-slate-700">×</button>
                    </span>
                  ))}
                  <button onClick={() => { setActiveFilters({}); setSearchTerm(''); }} className="text-xs text-red-500 hover:underline ml-2">Clear All</button>
                </div>
              )}

              {/* Controls */}
              {showFilters && (
                <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm animate-in slide-in-from-top-2">
                    <input 
                      type="text" 
                      className="block w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="Type to search across all data..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
              )}

              {/* Top Row: Summary + Heatmap */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                 {/* Summary */}
                 <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-lg font-bold text-slate-900 mb-2">Executive Summary</h2>
                        <p className="text-slate-600 text-sm leading-relaxed mb-6">{analysis.summary}</p>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Key Insights</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {analysis.insights.map((insight, idx) => (
                              <div key={idx} className="flex gap-3 items-start">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                                <p className="text-xs text-slate-700 font-medium">{insight}</p>
                              </div>
                            ))}
                        </div>
                    </div>
                 </div>

                 {/* Correlation Heatmap */}
                 <div className="h-[300px] xl:h-auto">
                    <CorrelationHeatmap data={dataset.data} columns={analysis.columns} />
                 </div>
              </div>

              {/* Visualization Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                     <h2 className="text-xl font-bold text-slate-900">Visualizations</h2>
                     <div className="flex gap-2">
                         <button 
                          onClick={() => { setShowFilters(!showFilters); setShowCustomization(false); }}
                          className={`text-xs font-medium border px-3 py-1.5 rounded-lg transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200'}`}
                         >
                           {showFilters ? 'Hide Filters' : 'Filter Data'}
                         </button>
                         <button 
                          onClick={() => { setShowCustomization(!showCustomization); setShowFilters(false); }}
                          className={`text-xs font-medium border px-3 py-1.5 rounded-lg transition-colors ${showCustomization ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200'}`}
                         >
                           Customize
                         </button>
                     </div>
                </div>

                {showCustomization && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex gap-6 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={showGrid} onChange={() => setShowGrid(!showGrid)} className="rounded text-indigo-600" /> Show Grid
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={showLegend} onChange={() => setShowLegend(!showLegend)} className="rounded text-indigo-600" /> Show Legend
                      </label>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                  {analysis.recommendedCharts.map((chart) => (
                    <div key={chart.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[400px] hover:shadow-lg transition-all">
                      <div className="p-5 border-b border-slate-50 flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-800">{chart.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">{chart.description}</p>
                        </div>
                        <button 
                          onClick={() => setExpandedChartId(chart.id)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                        </button>
                      </div>
                      <div className="flex-1 p-4 relative group">
                        <ChartRenderer 
                          config={chart} 
                          data={filteredData} 
                          showGrid={showGrid}
                          showLegend={showLegend}
                          onDrillDown={handleDrillDown}
                        />
                        {/* Hover Overlay Hint */}
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100">
                           <span className="text-xs font-bold bg-white/90 px-3 py-1 rounded-full shadow-sm text-slate-700">Click elements to filter</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DATA STUDIO VIEW */}
          {viewMode === 'STUDIO' && (
             <DataStudio dataset={dataset} onUpdateDataset={handleUpdateDataset} />
          )}

          {/* REPORT BUILDER VIEW */}
          {viewMode === 'REPORT' && (
             <ReportBuilder charts={analysis.recommendedCharts} dataset={dataset} />
          )}
        </div>
      </main>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full h-full max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">{expandedChart.title}</h2>
                <button onClick={() => setExpandedChartId(null)} className="p-2 hover:bg-slate-100 rounded-full">
                  <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <div className="flex-1 p-8 bg-slate-50/50">
                <ChartRenderer 
                  config={expandedChart} 
                  data={filteredData} 
                  showGrid={showGrid}
                  showLegend={showLegend}
                  onDrillDown={(k, v) => { handleDrillDown(k, v); setExpandedChartId(null); }}
                />
             </div>
             <div className="px-6 py-3 bg-white border-t border-slate-100 text-xs text-slate-400">
                Click graph elements to filter main dashboard. Press ESC to close.
             </div>
          </div>
        </div>
      )}

    </div>
  );
};