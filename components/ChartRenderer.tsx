import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, AreaChart, Area, PieChart, Pie, Cell, TooltipProps, ZAxis
} from 'recharts';
import { ChartConfig, ChartType } from '../types';

interface ChartRendererProps {
  config: ChartConfig;
  data: any[];
  showGrid?: boolean;
  showLegend?: boolean;
  onDrillDown?: (key: string, value: string | number) => void;
}

const COLORS = ['#6366f1', '#0ea5e9', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

// Custom Tooltip Component
const CustomTooltip = ({ active, payload }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-xl rounded-xl text-xs ring-1 ring-black/5 z-50">
        <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Data Details</p>
        <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
          {Object.entries(dataPoint).map(([key, value]) => {
             if (typeof value === 'object') return null;
             return (
              <div key={key} className="flex justify-between items-center gap-6">
                <span className="text-slate-500 font-medium capitalize">{key}:</span>
                <span className="text-slate-900 font-semibold max-w-[150px] truncate">{String(value)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[10px] text-indigo-500 font-medium pt-2 border-t border-slate-100">
           Click to Filter Dashboard
        </div>
      </div>
    );
  }
  return null;
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({ 
  config, 
  data, 
  showGrid = true, 
  showLegend = true,
  onDrillDown 
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartData = data.length > 2000 ? data.slice(0, 500) : data; 

  const isValidKey = useMemo(() => {
    if (!chartData.length) return false;
    // Check if the keys actually exist in the data to avoid empty graphs
    return config.xKey in chartData[0] && config.yKey in chartData[0];
  }, [chartData, config]);

  // Infer Axis Types (Scatter plots might try to use 'number' axis for text data)
  const xAxisType = useMemo(() => {
    if (!chartData.length) return 'category';
    const val = chartData[0][config.xKey];
    return typeof val === 'number' ? 'number' : 'category';
  }, [chartData, config.xKey]);

  if (!isValidKey || chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50 rounded-lg">
        <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm font-medium">Unable to render chart</span>
        <span className="text-xs mt-1">Missing or invalid data keys: {config.xKey}, {config.yKey}</span>
      </div>
    );
  }

  const handleClick = (data: any, index?: number) => {
    if (index !== undefined) setActiveIndex(index === activeIndex ? null : index);
    
    // Drill down logic
    if (onDrillDown && data) {
      // For Bar/Pie/Area, Recharts passes the data object directly or in payload
      const payload = data.payload || data;
      const value = payload[config.xKey];
      if (value !== undefined) {
        onDrillDown(config.xKey, value);
      }
    }
  };

  const renderChart = () => {
    switch (config.type) {
      case ChartType.BAR:
        return (
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />}
            <XAxis 
              dataKey={config.xKey} 
              tick={{fontSize: 11, fill: '#64748b'}} 
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              tick={{fontSize: 11, fill: '#64748b'}} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
            {showLegend && <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />}
            <Bar 
              dataKey={config.yKey} 
              name={config.yKey}
              radius={[6, 6, 0, 0]}
              onClick={handleClick}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={activeIndex === index ? '#4338ca' : activeIndex !== null ? '#cbd5e1' : '#6366f1'} 
                  className="transition-all duration-300"
                />
              ))}
            </Bar>
          </BarChart>
        );

      case ChartType.LINE:
        return (
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />}
            <XAxis 
              dataKey={config.xKey} 
              tick={{fontSize: 11, fill: '#64748b'}} 
              tickLine={false} 
              axisLine={{ stroke: '#e2e8f0' }} 
            />
            <YAxis 
              tick={{fontSize: 11, fill: '#64748b'}} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />}
            <Line 
              type="monotone" 
              dataKey={config.yKey} 
              stroke="#6366f1" 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#4338ca', onClick: (e, payload) => handleClick(payload.payload) }}
              name={config.yKey}
            />
          </LineChart>
        );

      case ChartType.AREA:
        return (
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`color${config.yKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />}
            <XAxis 
              dataKey={config.xKey} 
              tick={{fontSize: 11, fill: '#64748b'}} 
              tickLine={false} 
              axisLine={{ stroke: '#e2e8f0' }} 
            />
            <YAxis 
              tick={{fontSize: 11, fill: '#64748b'}} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey={config.yKey} 
              stroke="#6366f1" 
              fillOpacity={1} 
              fill={`url(#color${config.yKey})`} 
              activeDot={{ onClick: (e, payload) => handleClick(payload.payload) }}
            />
          </AreaChart>
        );

      case ChartType.SCATTER:
        return (
          <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
            <XAxis 
              type={xAxisType}
              dataKey={config.xKey} 
              name={config.xKey} 
              tick={{fontSize: 11, fill: '#64748b'}} 
              tickLine={false} 
              axisLine={{ stroke: '#e2e8f0' }} 
              allowDuplicatedCategory={false}
            />
            <YAxis 
              type="number" 
              dataKey={config.yKey} 
              name={config.yKey} 
              tick={{fontSize: 11, fill: '#64748b'}} 
              tickLine={false} 
              axisLine={false} 
            />
            <ZAxis range={[60, 400]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Data" data={chartData} fill="#6366f1" onClick={handleClick}>
              {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Scatter>
          </ScatterChart>
        );

      case ChartType.PIE:
        return (
          <PieChart>
            <Pie
              data={chartData.slice(0, 10)} 
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={config.yKey}
              nameKey={config.xKey}
              stroke="none"
              onClick={handleClick}
              cursor="pointer"
            >
              {chartData.slice(0, 10).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          </PieChart>
        );

      default:
        return <div className="flex items-center justify-center h-full text-slate-400">Chart type not supported</div>;
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChart()}
    </ResponsiveContainer>
  );
};