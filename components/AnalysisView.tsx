import React, { useEffect, useState } from 'react';

const STEPS = [
  "Detecting data types...",
  "Running outlier analysis...",
  "Calculating correlations...",
  "Generating chart recommendations...",
  "Finalizing insights..."
];

export const AnalysisView: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep < STEPS.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 800); // Simulate progress steps
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-16 h-16 mb-8 relative">
         <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
         <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
      </div>
      
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing Dataset</h2>
      <p className="text-slate-500 mb-8 max-w-md text-center">
        AutoViz is processing your data to find the best visualizations and statistical insights.
      </p>

      <div className="w-full max-w-sm space-y-3">
        {STEPS.map((step, index) => (
          <div key={index} className={`flex items-center transition-all duration-500 ${index > currentStep ? 'opacity-30' : 'opacity-100'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs mr-3 ${
              index < currentStep 
                ? 'bg-green-500 text-white' 
                : index === currentStep 
                  ? 'bg-indigo-600 text-white animate-pulse' 
                  : 'bg-slate-200 text-slate-500'
            }`}>
              {index < currentStep ? '✓' : index + 1}
            </div>
            <span className={`text-sm font-medium ${index === currentStep ? 'text-indigo-900' : 'text-slate-600'}`}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};