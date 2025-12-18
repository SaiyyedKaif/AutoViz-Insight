import React, { useState, useCallback } from 'react';
import { parseCSV } from '../services/dataService';
import { Dataset } from '../types';

interface FileUploadProps {
  onDataLoaded: (dataset: Dataset) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const dataset = parseCSV(text, file.name);
        onDataLoaded(dataset);
      } catch (err) {
        setError('Failed to parse CSV. Please check the file format.');
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError('Error reading file.');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  }, [onDataLoaded]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  return (
    <div className="max-w-xl mx-auto mt-20">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">AutoViz-Insight</h1>
        <p className="text-lg text-slate-600">
          Upload your dataset and let AI discover the hidden stories within your numbers.
        </p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ease-in-out ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-[1.02]'
            : 'border-slate-300 bg-white shadow-sm hover:border-indigo-300'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={onFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className={`p-4 rounded-full mb-4 ${isProcessing ? 'bg-indigo-100 animate-pulse' : 'bg-slate-100'}`}>
            {isProcessing ? (
               <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            ) : (
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </div>
          
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {isProcessing ? 'Processing Data...' : 'Drop your CSV file here'}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            {isProcessing ? 'Parsing rows and generating preview...' : 'or click to browse from your computer'}
          </p>

          {!isProcessing && (
            <div className="flex gap-4">
               <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">.CSV</span>
               <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Max 10MB</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700 text-sm font-medium">{error}</span>
        </div>
      )}
    </div>
  );
};