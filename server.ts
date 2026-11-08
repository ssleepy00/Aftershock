/**
 * Aftershock Full-Stack Node.js & Express Production Server
 *
 * This server orchestrates the multimodal portfolio extraction API, serves static
 * assets in production, and mounts the Vite development middleware in local development.
 *
 * Feature Overview & Use Cases:
 * 1. Multimodal Portfolio Vision & Text Extraction (/api/portfolio/extract-upload):
 *    - Ingests base64 image screenshots (brokerage dashboards, pie charts, holdings tables) or CSV text files.
 *    - Invokes Google Gemini Vision (configured via CONFIG.SERVER.GEMINI_VISION_MODEL) with structured JSON schemas
 *      to reliably extract stock tickers and portfolio weights.
 *    - Logs all GenAI calls with prompt contents, models, configs, and outputs while stripping heavy inline image binaries.
 *    - Automatically falls back to deterministic local parsing (parsePortfolioText) when Gemini is unavailable.
 * 2. Source Code Service (/api/source-files):
 *    - Serves live application source files for auditing and development transparency.
 * 3. Vite Middleware & Production SPA Static Serving:
 *    - Mounts Vite in development for rapid live reloads.
 *    - Serves built static production bundles from /dist with standard Express 4 catch-all routing (`app.get('*')`).
 * 4. Observability & Centralized Configuration:
 *    - Groups configurable defaults in src/config/appConfig.ts.
 *    - Logs function calls and runtime parameters via src/utils/logger.ts.
 */

import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { CONFIG } from './src/config/appConfig.ts';
import { logFunctionCall, logGenAiCall } from './src/utils/logger.ts';

dotenv.config();

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT) || CONFIG.SERVER.DEFAULT_PORT;

/**
 * Initializes and returns the Google Gemini GenAI client using environment credentials.
 *
 * @returns Configured GoogleGenAI client instance, or null if API key is not present.
 */
function getGenAIClient(): GoogleGenAI | null {
  logFunctionCall('getGenAIClient', { hasKey: Boolean(process.env.GEMINI_API_KEY) });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Boots the Express server, mounts API endpoints, attaches Vite or static middlewares,
 * and begins listening on the configured network interface.
 */
async function startServer(): Promise<void> {
  logFunctionCall('startServer', { port: PORT, nodeEnv: process.env.NODE_ENV || 'development' });

  const app = express();
  app.use(express.json({ limit: CONFIG.SERVER.BODY_LIMIT }));

  // Serve live project source files for auditing and transparency
  app.get('/api/source-files', (_req: Request, res: Response) => {
    logFunctionCall('GET /api/source-files', {});

    const filePaths = [
      { path: 'src/App.tsx', label: 'src/App.tsx', language: 'tsx' },
      {
        path: 'src/components/PortfolioUploadTab.tsx',
        label: 'src/components/PortfolioUploadTab.tsx',
        language: 'tsx',
      },
      {
        path: 'src/components/USInfrastructureMapTab.tsx',
        label: 'src/components/USInfrastructureMapTab.tsx',
        language: 'tsx',
      },
      {
        path: 'src/components/JudgeAuditAndGovernanceTab.tsx',
        label: 'src/components/JudgeAuditAndGovernanceTab.tsx',
        language: 'tsx',
      },
      {
        path: 'src/components/PortfolioExportModal.tsx',
        label: 'src/components/PortfolioExportModal.tsx',
        language: 'tsx',
      },
      {
        path: 'src/features/agent/stockResearchAgent.ts',
        label: 'src/features/agent/stockResearchAgent.ts',
        language: 'typescript',
      },
      {
        path: 'src/features/audit/traceableMathEngine.ts',
        label: 'src/features/audit/traceableMathEngine.ts',
        language: 'typescript',
      },
      {
        path: 'src/data/aftershockData.ts',
        label: 'src/data/aftershockData.ts',
        language: 'typescript',
      },
      {
        path: 'src/config/appConfig.ts',
        label: 'src/config/appConfig.ts',
        language: 'typescript',
      },
      { path: 'server.ts', label: 'server.ts', language: 'typescript' },
      { path: 'package.json', label: 'package.json', language: 'json' },
    ];

    const files = filePaths
      .map((item) => {
        try {
          const abs = path.join(process.cwd(), item.path);
          const content = fs.readFileSync(abs, 'utf-8');
          return { ...item, content };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    res.json({ files });
  });

  // Extract portfolio holdings from an uploaded screenshot, pie chart image, CSV, or text
  app.post('/api/portfolio/extract-upload', async (req: Request, res: Response) => {
    const { imageBase64, mimeType, textContent, fileName } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      textContent?: string;
      fileName?: string;
    };

    logFunctionCall('POST /api/portfolio/extract-upload', {
      hasImage: Boolean(imageBase64),
      mimeType,
      textContentLength: textContent ? textContent.length : 0,
      fileName,
    });

    try {
      const ai = getGenAIClient();

      if (ai && (imageBase64 || textContent)) {
        const targetModel = CONFIG.SERVER.GEMINI_VISION_MODEL;
        const parts: any[] = [];

        if (imageBase64 && mimeType) {
          parts.push({
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          });
        }
        if (textContent) {
          parts.push({
            text: `File content (${fileName || 'upload'}):\n${textContent.slice(0, 8000)}`,
          });
        }
        parts.push({
          text: `Extract the stock portfolio tickers and their percentage weights from this uploaded image (pie chart, brokerage screenshot, or table) or file.
If company names are shown instead of tickers (e.g. "NVIDIA", "Apple", "Microsoft", "Amazon", "Meta", "Google", "Tesla", "NextEra", "Exxon"), convert them to their standard US stock ticker symbols (e.g. NVDA, AAPL, MSFT, AMZN, META, GOOGL, TSLA, NEE, XOM).
If weights are not explicitly written, estimate the visual slice percentages from the pie chart or bar chart so they sum to 100.
Return between 2 and 10 holdings.`,
        });

        const genAiConfig = {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              portfolioName: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ticker: { type: Type.STRING },
                    weight: { type: Type.NUMBER },
                  },
                  required: ['ticker', 'weight'],
                },
              },
            },
            required: ['portfolioName', 'items'],
          },
        };

        try {
          const response = await ai.models.generateContent({
            model: targetModel,
            contents: { parts },
            config: genAiConfig,
          });

          logGenAiCall({
            model: targetModel,
            parts,
            config: genAiConfig,
            output: response.text,
          });

          if (response.text) {
            const parsed = JSON.parse(response.text);
            if (Array.isArray(parsed.items) && parsed.items.length > 0) {
              return res.json({
                portfolioName: parsed.portfolioName || fileName || 'Uploaded Portfolio',
                items: parsed.items,
              });
            }
          }
        } catch (err: any) {
          logGenAiCall({
            model: targetModel,
            parts,
            config: genAiConfig,
            error: err?.message || String(err),
          });
          console.warn('[WARN] Gemini vision extraction error:', err?.message || err);
          if (!textContent) {
            return res.status(502).json({
              error: `Live Gemini vision extraction failed: ${err?.message || 'Upstream model error'}`,
            });
          }
        }
      }

      if (textContent) {
        const { parsePortfolioText } = await import('./src/data/aftershockData.ts');
        const extracted = parsePortfolioText(textContent);
        if (extracted.length > 0) {
          return res.json({
            portfolioName: fileName || 'Uploaded CSV Portfolio',
            items: extracted.slice(0, 12),
          });
        }
        return res.status(422).json({
          error: 'No valid stock tickers and positive percentage weights were found in the uploaded text/CSV file.',
        });
      }

      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on the server for live image extraction. Please configure GEMINI_API_KEY in Settings > Secrets or upload a CSV/text file.',
        });
      }

      return res.status(422).json({
        error: 'Could not extract portfolio tickers and weights from the uploaded snapshot.',
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Failed to parse upload' });
    }
  });

  // Multi-step Agentic resolution of unseen stock tickers (SEC EDGAR + Gemini Tool Call + FEMA/USGS Grounding + Deterministic Math + Verification Gate)
  app.post('/api/portfolio/resolve-unseen-ticker', async (req: Request, res: Response) => {
    const { ticker } = req.body as { ticker?: string };
    const cleanTicker = (ticker || '').toUpperCase().trim().replace(/[^A-Z.]/g, '');

    logFunctionCall('POST /api/portfolio/resolve-unseen-ticker', { ticker: cleanTicker });

    if (!cleanTicker || cleanTicker.length > 6) {
      return res.status(400).json({ error: 'Please provide a valid US stock ticker symbol (1-6 letters).' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is required on the server to run the multi-step agentic stock research workflow.',
      });
    }

    try {
      const { runAgenticStockResearch } = await import(
        './src/features/agent/stockResearchAgent.ts'
      );
      const result = await runAgenticStockResearch(ai, cleanTicker);
      return res.json(result);
    } catch (err: any) {
      return res.status(502).json({
        error: `Agentic stock research failed for ${cleanTicker}: ${err?.message || 'Unknown error'}`,
      });
    }
  });

  // Live execution of the Practice & Unseen Hold-Out Benchmark Suite for judge verification
  app.get('/api/audit/run-benchmark', async (_req: Request, res: Response) => {
    logFunctionCall('GET /api/audit/run-benchmark', {});

    const runBenchSuite = async (suiteName: 'practice' | 'holdout') => {
      try {
        const { stdout } = await execFileAsync(
          'python3',
          ['agentverse/finance/bench.py', '--suite', suiteName],
          { cwd: process.cwd(), timeout: 15000 }
        );
        return JSON.parse(stdout);
      } catch (err: any) {
        if (err?.stdout) {
          return JSON.parse(err.stdout);
        }
        throw err;
      }
    };

    try {
      const [practiceJson, holdoutJson] = await Promise.all([
        runBenchSuite('practice'),
        runBenchSuite('holdout'),
      ]);

      return res.json({
        timestamp: new Date().toISOString(),
        practice: practiceJson,
        holdout: holdoutJson,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: `Benchmark execution failed: ${err?.message || 'Unknown error'}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aftershock server listening on http://localhost:${PORT}`);
  });
}

startServer();

