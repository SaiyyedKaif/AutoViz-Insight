import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ChatMessage, Dataset, ChartConfig } from '../types';
import { interpretUserQuery, generateDataSummary } from '../services/geminiService';
import { queryData } from '../services/dataService';
import { ChartRenderer } from './ChartRenderer';

interface AIChatProps {
  isOpen: boolean;
  onToggle: () => void;
  analysis: AnalysisResult;
  dataset: Dataset;
}

const MarkdownText = ({ text }: { text: string }) => {
  // Simple bold and list parsing
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

export const AIChat: React.FC<AIChatProps> = ({ isOpen, onToggle, analysis, dataset }) => {
  // Initialize with a dynamic function to create specific prompts based on the uploaded data
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const numericCols = analysis.columns.filter(c => c.type === 'numeric').map(c => c.name);
    const catCols = analysis.columns.filter(c => c.type === 'categorical' || c.type === 'text').map(c => c.name);
    const dateCols = analysis.columns.filter(c => c.type === 'datetime').map(c => c.name);

    let suggestions: string[] = [];

    // Suggestion 1: Simple metric or Aggregation
    if (numericCols.length > 0) {
      suggestions.push(`What is the average **${numericCols[0]}**?`);
    } else if (catCols.length > 0) {
      suggestions.push(`Count records by **${catCols[0]}**`);
    }

    // Suggestion 2: Grouping or Trend
    if (dateCols.length > 0 && numericCols.length > 0) {
       suggestions.push(`Show **${numericCols[0]}** trend over **${dateCols[0]}**`);
    } else if (catCols.length > 0 && numericCols.length > 0) {
       suggestions.push(`Top 5 **${catCols[0]}** by **${numericCols[0]}**`);
    } else if (numericCols.length > 1) {
       suggestions.push(`Plot **${numericCols[0]}** vs **${numericCols[1]}**`);
    }

    // Fallback if we don't have enough columns for 2 specific suggestions
    if (suggestions.length < 2) {
         suggestions.push("Summarize the key insights");
    }

    const suggestionsText = suggestions.slice(0, 3).map(s => `• ${s}`).join('\n');
    
    return [{
      id: 'welcome',
      role: 'ai',
      content: `Hey! I am your **Data Wizard** 🧙‍♂️.\n\nI've analyzed **${dataset.name}** and identified ${analysis.columns.length} columns. Ask me anything about your data, for example:\n\n${suggestionsText}`,
      timestamp: new Date()
    }];
  });

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isProcessing]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      // 1. Interpret Intent
      const intent = await interpretUserQuery(
        userMsg.content,
        analysis.columns
      );

      let aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: intent.textResponse || "Here is what I found.",
        timestamp: new Date()
      };

      // 2. Execute Query & Generate Chart if Intent is 'query'
      if (intent.type === 'query' && intent.groupBy && intent.aggregateColumn) {
         const resultData = queryData(dataset.data, intent);
         
         if (resultData.length > 0) {
            // Generate textual summary from the actual data result
            const summary = await generateDataSummary(userMsg.content, resultData);
            aiMsg.content = summary;

            if (intent.chartType) {
                const chartConfig: ChartConfig = {
                  id: `chat-chart-${Date.now()}`,
                  type: intent.chartType,
                  title: intent.title || 'Analysis Result',
                  description: `Generated from query: ${userMsg.content}`,
                  xKey: intent.groupBy,
                  yKey: intent.aggregateColumn
                };
                
                aiMsg.chart = {
                  config: chartConfig,
                  data: resultData
                };
            }
         } else if (resultData.length === 0) {
            aiMsg.content = "I ran the query on your data, but no records matched your criteria.";
         } else {
             // Fallback if we have results but no chart type
             const summary = await generateDataSummary(userMsg.content, resultData);
             aiMsg.content = summary;
         }
      }

      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: "Sorry, I encountered an error processing your request.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[100] transition-all duration-300 ease-in-out ${isOpen ? 'w-[450px] h-[600px] opacity-100 translate-y-0' : 'w-0 h-0 opacity-0 translate-y-10 pointer-events-none'}`}>
      
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-full overflow-hidden font-sans">
        {/* Header */}
        <div className="bg-slate-900 p-4 flex justify-between items-center shadow-md">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                <span className="text-xl">🧙‍♂️</span>
              </div>
              <div>
                 <h3 className="font-bold text-white text-sm">Data Wizard</h3>
                 <div className="flex items-center gap-1.5">
                   <span className="w-2 h-2 rounded-full bg-green-400"></span>
                   <span className="text-xs text-slate-300">Ready to help</span>
                 </div>
              </div>
           </div>
           <button onClick={onToggle} className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 custom-scrollbar space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              
              {/* Message Bubble */}
              <div className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm text-sm relative ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
              }`}>
                <MarkdownText text={msg.content} />
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {msg.role === 'user' ? 'You' : 'Wizard'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>

              {/* Embedded Chart */}
              {msg.chart && (
                <div className="mt-3 w-full bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-64 overflow-hidden flex flex-col">
                   <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">{msg.chart.config.title}</p>
                   <div className="flex-1 min-h-0 w-full">
                      <ChartRenderer 
                        config={msg.chart.config} 
                        data={msg.chart.data} 
                        showGrid={false} 
                        showLegend={false}
                      />
                   </div>
                </div>
              )}
            </div>
          ))}

          {/* Thinking Indicator */}
          {isProcessing && (
            <div className="flex justify-start">
               <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                  <span className="text-xs text-slate-400 ml-2">Consulting the orbs...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="flex gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your data..."
              disabled={isProcessing}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 disabled:opacity-60 text-slate-900"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl px-4 transition-colors flex items-center justify-center shadow-md shadow-indigo-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};