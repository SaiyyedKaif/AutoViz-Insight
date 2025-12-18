import React, { useMemo } from 'react';
import { calculateCorrelations } from '../services/dataService';
import { ColumnProfile } from '../types';

interface CorrelationHeatmapProps {
  data: any[];
  columns: ColumnProfile[];
}

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ data, columns }) => {
  const correlationData = useMemo(() => {
    const numericCols = columns.filter(c => c.type === 'numeric').map(c => c.name);
    return calculateCorrelations(data, numericCols);
  }, [data, columns]);

  const { variables, matrix } = correlationData;

  const getColor = (value: number) => {
    // Red for negative, Blue for positive
    if (value > 0) {
      return `rgba(79, 70, 229, ${value})`; // Indigo
    } else {
      return `rgba(239, 68, 68, ${Math.abs(value)})`; // Red
    }
  };

  if (variables.length < 2) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Not enough numeric data for correlations</div>;
  }

  return (
    <div className="h-full flex flex-col p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
       <h3 className="font-bold text-slate-800 mb-4">Correlation Matrix</h3>
       <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="inline-block min-w-full">
            <div className="flex">
               <div className="w-24 shrink-0"></div> {/* Corner spacer */}
               {variables.map((v, i) => (
                  <div key={i} className="w-20 p-2 text-xs font-semibold text-slate-500 truncate text-center -rotate-45 origin-bottom-left translate-x-4 mb-4" title={v}>
                     {v}
                  </div>
               ))}
            </div>
            {variables.map((rowVar, i) => (
               <div key={i} className="flex items-center">
                  <div className="w-24 shrink-0 text-xs font-semibold text-slate-500 truncate text-right pr-3" title={rowVar}>
                     {rowVar}
                  </div>
                  <div className="flex">
                    {matrix[i].map((value, j) => (
                       <div 
                         key={j} 
                         className="w-20 h-10 flex items-center justify-center text-[10px] font-medium transition-transform hover:scale-110 relative group border border-white"
                         style={{ backgroundColor: i === j ? '#f1f5f9' : getColor(value), color: Math.abs(value) > 0.5 ? 'white' : '#1e293b' }}
                       >
                         {i === j ? '-' : value}
                         
                         {/* Tooltip */}
                         <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white p-2 rounded text-xs z-10 whitespace-nowrap">
                            {variables[i]} vs {variables[j]}: {value}
                         </div>
                       </div>
                    ))}
                  </div>
               </div>
            ))}
          </div>
       </div>
       <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1"><div className="w-4 h-4 bg-red-500 rounded"></div> Negative</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 bg-slate-100 rounded"></div> Neutral</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 bg-indigo-500 rounded"></div> Positive</div>
       </div>
    </div>
  );
};
