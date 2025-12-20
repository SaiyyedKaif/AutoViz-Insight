import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ChartType, QueryIntent } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A high-level executive summary of what the dataset represents.",
    },
    insights: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-5 key statistical insights, outliers, or trends detected in the data.",
    },
    columns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['numeric', 'categorical', 'datetime', 'text'] },
          missingCount: { type: Type.NUMBER },
          uniqueCount: { type: Type.NUMBER },
          exampleValues: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    recommendedCharts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['BAR', 'LINE', 'SCATTER', 'PIE', 'AREA'] },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          xKey: { type: Type.STRING, description: "The key in the data to use for the X Axis" },
          yKey: { type: Type.STRING, description: "The key in the data to use for the Y Axis (numeric)" },
          categoryKey: { type: Type.STRING, description: "Optional key for grouping or coloring" }
        },
        required: ["id", "type", "title", "description", "xKey", "yKey"]
      }
    }
  },
  required: ["summary", "insights", "columns", "recommendedCharts"]
};

export const analyzeDatasetWithGemini = async (
  dataSample: string, 
  fileName: string
): Promise<AnalysisResult> => {
  
  const prompt = `
    You are a senior data scientist. Analyze this dataset sample (JSON format) from a file named "${fileName}".
    
    Your goal is to:
    1. Infer the data schema and column types.
    2. Identify interesting patterns, correlations, or outliers for the 'insights' section.
    3. Recommend 4-6 specific visualization configurations that would be most valuable to a business user.
       - For time-series data, prefer LINE or AREA charts.
       - For category comparison, prefer BAR or PIE charts.
       - For correlations, prefer SCATTER charts.
    
    Data Sample:
    ${dataSample}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2 // Low temperature for consistent analysis
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

const intentSchema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ['query', 'chat', 'clarification'] },
    textResponse: { type: Type.STRING, description: "Response text for chat or clarification, or a caption for the query result." },
    filters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          column: { type: Type.STRING },
          operator: { type: Type.STRING, enum: ['==', '>', '<', '>=', '<=', 'contains'] },
          value: { type: Type.STRING } // We'll parse this to number if column is numeric
        }
      }
    },
    groupBy: { type: Type.STRING, description: "Column to group by (dimension)" },
    aggregateColumn: { type: Type.STRING, description: "Numeric column to aggregate" },
    aggregateType: { type: Type.STRING, enum: ['SUM', 'AVG', 'COUNT', 'COUNT_DISTINCT'] },
    chartType: { type: Type.STRING, enum: ['BAR', 'LINE', 'PIE', 'SCATTER', 'AREA'] },
    title: { type: Type.STRING, description: "Title for the generated chart" }
  },
  required: ["type", "textResponse"]
};

export const interpretUserQuery = async (
  userQuestion: string,
  columns: { name: string, type: string }[]
): Promise<QueryIntent> => {
  const columnContext = columns.map(c => `${c.name} (${c.type})`).join(', ');

  const prompt = `
    You are a smart data assistant.
    User Question: "${userQuestion}"
    Dataset Columns: ${columnContext}

    Decide the intent:
    1. 'query': If the user asks for specific data, aggregations, or charts (e.g., "Show sales by region", "Top 5 products", "Plot revenue vs time").
       - Map the user's terms to the closest available Column Names.
       - Construct filters, groupBy, and aggregation.
       - Suggest a chartType if visualization is suitable.
    2. 'chat': If it's a general question not requiring specific data calculation (e.g., "What is this dataset?", "How do I use this?").
    3. 'clarification': If the column names are ambiguous or the question is unclear.

    Return JSON matching the schema.
    For 'value' in filters, ensure it is a string representation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: intentSchema,
        temperature: 0.1
      }
    });

    const text = response.text;
    if (!text) return { type: 'chat', textResponse: "I couldn't process that request.", filters: [] };
    
    const result = JSON.parse(text) as QueryIntent;
    
    // Post-process values to numbers if needed (simple check)
    if (result.filters) {
       result.filters.forEach(f => {
         if (!isNaN(Number(f.value)) && f.operator !== 'contains') {
            f.value = Number(f.value);
         }
       });
    }

    return result;

  } catch (error) {
    console.error("Gemini Intent Parsing Failed:", error);
    return { type: 'chat', textResponse: "Sorry, I had trouble understanding that.", filters: [] };
  }
};

export const generateDataSummary = async (
  question: string,
  data: any[]
): Promise<string> => {
  // Limit context to avoid token limits, using the first 20 items of the result
  const dataContext = JSON.stringify(data.slice(0, 20));
  
  const prompt = `
    User Question: "${question}"
    Data Result (subset): ${dataContext}
    
    Task: Provide a helpful, natural language answer to the user's question based on this data.
    - If the data shows a clear trend, describe it (e.g. "Sales increased over time").
    - If it's a ranking, mention the top items.
    - If it's a single aggregated number, state it.
    - Keep it concise (2-3 sentences max).
    - Do not mention technical terms like "JSON" or "dataset".
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });
    return response.text || "Here is the data you requested.";
  } catch (error) {
    console.error("Summary generation failed", error);
    return "Here are the results based on your query.";
  }
};
