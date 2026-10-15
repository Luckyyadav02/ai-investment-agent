# AI Investment Agent 📈

A production-ready AI Investment Analyst built for **Vercel deployment**. It combines **real-time financial market data** with **AI-powered investment synthesis** to deliver clear, actionable Invest or Pass recommendations.

---

## 🌟 Key Features

- **Live Market Data**: Fetches real-time stock quotes, market valuation (Cap), P/E ratios, 52-week ranges, and 30-day historical daily closing prices directly via Yahoo Finance.
- **Real-Time News & Sentiment**: Scans the web for current financial news and headlines using Tavily Search.
- **AI Investment Verdict**: Synthesizes real market data and news using Google Gemini (`gemini-2.5-flash`) to generate a definitive verdict: **INVEST**, **PASS**, or **HOLD** alongside a 2-3 sentence executive rationale.
- **Key Drivers & Risks**: Identifies core growth catalysts and risk factors to monitor.
- **Interactive 30-Day Historical Trend**: Recharts Area Chart displaying daily closing prices with custom tooltips.
- **Optimized for Vercel**: Serverless function architecture with zero long-running servers and instant cold-start execution.

---

## 🏗️ Architecture

```
ai-investment-agent-main/
├── api/
│   ├── analyze.js        # POST /api/analyze - Vercel Serverless Function
│   └── health.js         # GET /api/health   - Serverless Health Check
├── frontend/             # React + Vite Single Page Application
│   ├── src/
│   │   ├── App.jsx       # Main UI component with REST integration & progress UX
│   │   ├── main.jsx
│   │   ├── index.css
│   │   └── App.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── vercel.json           # Vercel monorepo routing, builds, & headers config
├── package.json          # Root dependencies for Vercel Serverless API
├── .gitignore
└── README.md
```

---

## 🔑 Environment Variables

The following environment variables are required by the backend serverless functions:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API Key for financial analysis synthesis |
| `TAVILY_API_KEY` | Tavily Search API Key for real-time news retrieval |

---

## 🚀 Local Development

### Option A: Using Vercel CLI (Recommended)
This replicates the exact production serverless environment locally.

1. Install dependencies in root and frontend:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

2. Create a `.env` file in the project root:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   TAVILY_API_KEY="your-tavily-api-key"
   ```

3. Run the development environment with Vercel CLI:
   ```bash
   npx vercel dev
   ```
   Both the frontend and the `/api/*` serverless functions will be served at `http://localhost:3000`.

---

### Option B: Running Frontend with an Existing Backend

If you have a backend server running locally on port 3001:
1. Navigate to `frontend`:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite dev server with `VITE_BACKEND_URL`:
   ```bash
   VITE_BACKEND_URL="http://localhost:3001" npm run dev
   ```

---

## 🌐 Deploying to Vercel

### Method 1: Deploy with Vercel CLI

1. From the project root, run:
   ```bash
   npx vercel
   ```
2. Follow the interactive prompts to link or create a project.
3. Add your environment variables to Vercel:
   ```bash
   npx vercel env add GEMINI_API_KEY
   npx vercel env add TAVILY_API_KEY
   ```
4. Deploy to production:
   ```bash
   npx vercel --prod
   ```

### Method 2: Deploy via Git Repository (GitHub / GitLab / Bitbucket)

1. Push this repository to GitHub/GitLab.
2. In the [Vercel Dashboard](https://vercel.com/new), click **Import Project** and select your repository.
3. Under **Project Settings**:
   - **Framework Preset**: Leave as default (`Other` / auto-detected from `vercel.json`)
   - **Root Directory**: `./` (leave default)
4. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`
   - `TAVILY_API_KEY`
5. Click **Deploy**. Vercel will automatically build the frontend into `frontend/dist` and expose the `/api` routes via Serverless Functions.

---

## 🔌 API Reference

### 1. `POST /api/analyze`
Executes market research, news lookup, and AI investment analysis.

**Request:**
```http
POST /api/analyze
Content-Type: application/json

{
  "company": "NVDA"
}
```

**Response (200 OK):**
```json
{
  "symbol": "NVDA",
  "name": "NVIDIA Corporation",
  "price": 138.25,
  "change": 2.15,
  "changePercent": 1.58,
  "currency": "USD",
  "marketCap": 3400000000000,
  "marketCapFormatted": "$3.40T",
  "peRatio": 65.4,
  "fiftyTwoWeekHigh": 140.76,
  "fiftyTwoWeekLow": 45.62,
  "sector": "Technology",
  "verdict": "INVEST",
  "confidence": 85,
  "rationale": "NVIDIA exhibits strong dominance in the AI accelerator sector with consistent margin expansion...",
  "keyDrivers": [
    "Accelerated computing demand",
    "Data center infrastructure expansion"
  ],
  "keyRisks": [
    "Export restrictions",
    "Supply chain concentration"
  ],
  "news": [ ... ],
  "historicalData": [
    { "date": "2026-09-15", "price": 132.10 },
    ...
  ]
}
```

### 2. `GET /api/health`
Health check endpoint for uptime monitoring.

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-10-15T13:49:21.000Z"
}
```

---

## 📄 License
MIT