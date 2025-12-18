import React, { useState } from 'react';
import { Dataset } from '../types';

interface DataStudioProps {
  dataset: Dataset;
  onUpdateDataset: (updatedData: any[]) => void;
}

export const DataStudio: React.FC<DataStudioProps> = ({ dataset, onUpdateDataset }) => {
  const [data, setData] = useState(dataset.data);
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;
  
  const headers = Object.keys(data[0] || {});
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const paginatedData = data.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleCellEdit = (rowIndex: number, key: string, value: string) => {
    const realIndex = (page - 1) * rowsPerPage + rowIndex;
    const newData = [...data];
    // Simple logic: if number, parse it
    const numVal = Number(value);
    newData[realIndex] = {
      ...newData[realIndex],
      [key]: !isNaN(numVal) && value.trim() !== '' ? numVal : value
    };
    setData(newData);
  };

  const handleSave = () => {
    onUpdateDataset(data);
    alert('Dataset updated successfully. Analysis and charts will reflect these changes.');
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
         <div>
            <h2 className="text-lg font-bold text-slate-900">Data Cleaning Studio</h2>
            <p className="text-xs text-slate-500">Edit values directly. Changes apply to the entire dashboard.</p>
         </div>
         <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Save Changes
         </button>
      </div>
      
      <div className="flex-1 overflow-auto relative bg-white">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
           <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700 border-b border-slate-200">#</th>
                {headers.map(h => (
                   <th key={h} className="px-4 py-3 font-semibold text-slate-700 border-b border-slate-200">{h}</th>
                ))}
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {paginatedData.map((row, rIdx) => (
                 <tr key={rIdx} className="hover:bg-slate-50 group">
                    <td className="px-4 py-2 text-slate-500 select-none bg-white group-hover:bg-slate-50 sticky left-0 font-mono text-xs border-r border-slate-100">{(page - 1) * rowsPerPage + rIdx + 1}</td>
                    {headers.map((h, cIdx) => (
                       <td 
                         key={`${rIdx}-${cIdx}`} 
                         className="px-4 py-2 text-slate-700 focus-within:bg-indigo-50 focus-within:text-indigo-900 outline-none transition-colors cursor-text"
                         contentEditable
                         suppressContentEditableWarning
                         onBlur={(e) => handleCellEdit(rIdx, h, e.currentTarget.textContent || '')}
                       >
                         {row[h]}
                       </td>
                    ))}
                 </tr>
              ))}
           </tbody>
        </table>
      </div>
      
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
         <span className="text-xs text-slate-500">Showing {((page-1)*rowsPerPage)+1}-{Math.min(page*rowsPerPage, data.length)} of {data.length} rows</span>
         <div className="flex gap-2">
            <button 
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-white border border-slate-300 rounded text-sm disabled:opacity-50 hover:bg-slate-50 text-slate-700"
            >
              Previous
            </button>
            <span className="flex items-center text-sm font-medium text-slate-700">Page {page} of {totalPages}</span>
            <button 
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-white border border-slate-300 rounded text-sm disabled:opacity-50 hover:bg-slate-50 text-slate-700"
            >
              Next
            </button>
         </div>
      </div>
    </div>
  );
};