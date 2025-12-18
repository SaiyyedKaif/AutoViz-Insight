import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisView } from './components/AnalysisView';
import { Dashboard } from './components/Dashboard';
import { Dataset, AppState, AnalysisResult } from './types';
import { analyzeDatasetWithGemini } from './services/geminiService';
import { sampleDataForAI } from './services/dataService';

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper to fix mismatched keys (case-insensitive search)
  const sanitizeAnalysisResult = (result: AnalysisResult, dataset: Dataset): AnalysisResult => {
    if (!dataset.data.length) return result;
    const validKeys = Object.keys(dataset.data[0]);
    
    const sanitizedCharts = result.recommendedCharts.map(chart => {
      // Find matching key case-insensitive
      const findKey = (key: string) => {
        if (!key) return key;
        if (validKeys.includes(key)) return key;
        const match = validKeys.find(k => k.toLowerCase() === key.toLowerCase());
        return match || key;
      };

      return {
        ...chart,
        xKey: findKey(chart.xKey),
        yKey: findKey(chart.yKey),
        categoryKey: chart.categoryKey ? findKey(chart.categoryKey) : undefined
      };
    }).filter(chart => validKeys.includes(chart.xKey) && validKeys.includes(chart.yKey)); // Filter out completely invalid ones

    return { ...result, recommendedCharts: sanitizedCharts };
  };

  const handleDataLoaded = useCallback(async (newDataset: Dataset) => {
    setDataset(newDataset);
    setAppState(AppState.ANALYZING);
    setError(null);

    try {
      const sample = sampleDataForAI(newDataset);
      // Simulate network delay to make the "Analyzing" UX feel realistic
      const minDelay = new Promise(resolve => setTimeout(resolve, 2500));
      
      const [rawResult] = await Promise.all([
        analyzeDatasetWithGemini(sample, newDataset.name),
        minDelay
      ]);

      const sanitizedResult = sanitizeAnalysisResult(rawResult, newDataset);
      
      setAnalysisResult(sanitizedResult);
      setAppState(AppState.DASHBOARD);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please try again with a different file or check your connection.");
      setAppState(AppState.UPLOAD);
    }
  }, []);

  const handleReset = useCallback(() => {
    setAppState(AppState.UPLOAD);
    setDataset(null);
    setAnalysisResult(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen">
      {appState === AppState.UPLOAD && (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <header className="px-8 py-6">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
               </div>
               <span className="font-bold text-xl text-slate-900">AutoViz-Insight</span>
            </div>
          </header>
          <main className="flex-1 flex flex-col p-4">
             <FileUpload onDataLoaded={handleDataLoaded} />
             {error && (
               <div className="max-w-md mx-auto mt-8 p-4 bg-red-50 text-red-700 rounded-lg text-center border border-red-200">
                 {error}
               </div>
             )}
          </main>
        </div>
      )}

      {appState === AppState.ANALYZING && (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <AnalysisView />
        </div>
      )}

      {appState === AppState.DASHBOARD && dataset && analysisResult && (
        <Dashboard 
          dataset={dataset} 
          analysis={analysisResult} 
          onReset={handleReset} 
        />
      )}
    </div>
  );
}