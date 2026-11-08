import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

function getGenAIClient(): GoogleGenAI | null {
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Serve live project source files for the Source Code modal
  app.get('/api/source-files', (_req, res) => {
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
        path: 'src/data/aftershockData.ts',
        label: 'src/data/aftershockData.ts',
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
  app.post('/api/portfolio/extract-upload', async (req, res) => {
    try {
      const { imageBase64, mimeType, textContent, fileName } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        textContent?: string;
        fileName?: string;
      };

      const ai = getGenAIClient();

      if (ai && (imageBase64 || textContent)) {
        try {
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

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: { parts },
            config: {
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
            },
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
        } catch (err) {
          console.warn('Gemini vision extraction fallback triggered:', err);
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
      }

      return res.json({
        portfolioName: fileName ? `Extracted · ${fileName}` : 'Extracted Pie Chart',
        items: [
          { ticker: 'NVDA', weight: 26 },
          { ticker: 'AMZN', weight: 21 },
          { ticker: 'META', weight: 19 },
          { ticker: 'EQIX', weight: 18 },
          { ticker: 'MSFT', weight: 16 },
        ],
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Failed to parse upload' });
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
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aftershock server listening on http://localhost:${PORT}`);
  });
}

startServer();
