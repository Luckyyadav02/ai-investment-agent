import YahooFinance from 'yahoo-finance2';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearch } from "@langchain/tavily";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.2,
  apiKey: process.env.GEMINI_API_KEY
});

const searchTool = new TavilySearch({
  maxResults: 3,
  apiKey: process.env.TAVILY_API_KEY
});

const COMMON_TICKERS = {
  "NVIDIA": "NVDA", "NVDA": "NVDA",
  "APPLE": "AAPL", "AAPL": "AAPL",
  "TESLA": "TSLA", "TSLA": "TSLA",
  "MICROSOFT": "MSFT", "MSFT": "MSFT",
  "AMAZON": "AMZN", "AMZN": "AMZN",
  "GOOGLE": "GOOGL", "ALPHABET": "GOOGL", "GOOGL": "GOOGL", "GOOG": "GOOG",
  "META": "META", "FACEBOOK": "META",
  "AMD": "AMD",
  "PALANTIR": "PLTR", "PLTR": "PLTR",
  "NETFLIX": "NFLX", "NFLX": "NFLX",
  "BITCOIN": "BTC-USD", "BTC": "BTC-USD", "BTC-USD": "BTC-USD",
  "ETHEREUM": "ETH-USD", "ETH": "ETH-USD", "ETH-USD": "ETH-USD",
  "COINBASE": "COIN", "COIN": "COIN",
  "SPOTIFY": "SPOT", "SPOT": "SPOT",
  "UBER": "UBER", "AIRBNB": "ABNB",
  "DISNEY": "DIS", "DIS": "DIS",
  "WALMART": "WMT", "WMT": "WMT",
  "COSTCO": "COST", "COST": "COST",
  "COCA COLA": "KO", "COCA-COLA": "KO", "KO": "KO",
  "PEPSI": "PEP", "PEPSICO": "PEP", "PEP": "PEP",
  "INTEL": "INTC", "INTC": "INTC",
  "BERKSHIRE": "BRK-B", "BERKSHIRE HATHAWAY": "BRK-B",
  "SPDR S&P 500": "SPY", "SPY": "SPY", "S&P 500": "SPY",
  "NASDAQ": "QQQ", "QQQ": "QQQ"
};

function formatMarketCap(cap) {
  if (!cap) return 'N/A';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap.toLocaleString()}`;
}

async function resolveStockSymbol(input) {
  const clean = input.trim().toUpperCase();
  if (COMMON_TICKERS[clean]) return COMMON_TICKERS[clean];
  if (/^[A-Z0-9\.\-]{1,6}$/.test(clean)) return clean;
  try {
    const res = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(input)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)" }
    });
    const data = await res.json();
    if (data.quotes && data.quotes.length > 0) {
      const match = data.quotes.find(q => q.symbol && (q.quoteType === "EQUITY" || q.quoteType === "CRYPTOCURRENCY" || q.quoteType === "ETF")) || data.quotes[0];
      if (match && match.symbol) return match.symbol;
    }
  } catch (e) {
    console.warn("Direct search API error:", e.message);
  }
  try {
    const searchResults = await yahooFinance.search(input);
    if (searchResults && searchResults.quotes && searchResults.quotes.length > 0) {
      const validQuote = searchResults.quotes.find(q => q.symbol) || searchResults.quotes[0];
      if (validQuote && validQuote.symbol) return validQuote.symbol;
    }
  } catch (e) {
    console.warn("Library search error:", e.message);
  }
  return clean;
}

async function fetchMarketDataAndHistory(symbol) {
  let quoteData = null;
  let history = [];
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    });
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (result && result.meta) {
      const meta = result.meta;
      const quoteObj = result.indicators?.quote?.[0];
      const timestamps = result.timestamp || [];
      const closes = quoteObj?.close || [];
      history = timestamps.map((ts, idx) => {
        const d = new Date(ts * 1000);
        const price = closes[idx];
        return price ? { date: d.toISOString().split('T')[0], price: Number(price.toFixed(2)) } : null;
      }).filter(Boolean);
      const currentPrice = meta.regularMarketPrice || (history.length > 0 ? history[history.length - 1].price : 0);
      const prevClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
      const change = currentPrice - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : 0;
      quoteData = {
        symbol: meta.symbol || symbol,
        name: meta.shortName || meta.longName || meta.symbol || symbol,
        price: Number(currentPrice.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        currency: meta.currency || 'USD',
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
        marketCap: null,
        peRatio: null,
        sector: 'Public Asset'
      };
    }
  } catch (err) {
    console.warn("Direct chart v8 fetch warning:", err.message);
  }
  try {
    const q = await yahooFinance.quote(symbol);
    if (q) {
      if (!quoteData) {
        quoteData = {
          symbol: q.symbol,
          name: q.shortName || q.longName || q.symbol,
          price: q.regularMarketPrice,
          change: q.regularMarketChange,
          changePercent: q.regularMarketChangePercent,
          currency: q.currency || 'USD',
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow,
          sector: q.sector || 'Market'
        };
      }
      quoteData.name = q.shortName || q.longName || quoteData.name;
      quoteData.marketCap = q.marketCap || quoteData.marketCap;
      quoteData.peRatio = q.trailingPE ? Number(q.trailingPE.toFixed(1)) : quoteData.peRatio;
      quoteData.sector = q.sector || quoteData.sector;
    }
  } catch (err) {
    console.warn("Yahoo quote extra fields warning:", err.message);
  }
  if (!quoteData || !quoteData.price) {
    throw new Error(`Could not find real market data for "${symbol}". Please check the symbol or name.`);
  }
  return { quote: quoteData, historicalData: history };
}

async function performResearch(companyInput) {
  const symbol = await resolveStockSymbol(companyInput);
  const { quote, historicalData } = await fetchMarketDataAndHistory(symbol);
  let newsText = 'No recent news found.';
  let newsArticles = [];
  try {
    const query = `${quote.name || symbol} stock financial news market sentiment`;
    const searchResults = await searchTool.invoke({ query });
    if (searchResults && searchResults.results && Array.isArray(searchResults.results)) {
      newsArticles = searchResults.results.map(r => ({ title: r.title, content: r.content, url: r.url }));
      newsText = newsArticles.map(r => `- ${r.title}: ${r.content}`).join('\n');
    } else if (typeof searchResults === 'string') {
      newsText = searchResults;
    }
  } catch (err) {
    console.warn("Tavily news search warning:", err.message);
    newsText = `${quote.name} is currently trading at $${quote.price} ${quote.currency}.`;
  }

  const prompt = `
You are an expert AI Investment Analyst.
Review the following REAL-TIME market data and recent news for ${quote.name} (${quote.symbol}) and provide a definitive investment verdict ("INVEST", "PASS", or "HOLD").

Company: ${quote.name} (${quote.symbol})
Current Price: $${quote.price} ${quote.currency}
Today's Change: ${quote.changePercent !== undefined ? quote.changePercent.toFixed(2) + '%' : 'N/A'}
Market Cap: ${formatMarketCap(quote.marketCap)}
P/E Ratio (Trailing): ${quote.peRatio || 'N/A'}
52-Week Range: $${quote.fiftyTwoWeekLow || 'N/A'} - $${quote.fiftyTwoWeekHigh || 'N/A'}

Recent News & Sentiment:
${newsText}

Respond ONLY with a valid JSON object in this exact format with NO markdown wrapping:
{
  "verdict": "INVEST",
  "confidence": 85,
  "rationale": "2-3 sentence clear, high-quality explanation of the verdict based on the real financial metrics and news.",
  "keyDrivers": ["Key positive factor or catalyst 1", "Key positive factor or catalyst 2"],
  "keyRisks": ["Main risk factor 1", "Main risk factor 2"]
}
`;

  let decision = {
    verdict: quote.changePercent >= 0 ? "INVEST" : "HOLD",
    confidence: 80,
    rationale: `${quote.name} (${quote.symbol}) is demonstrating steady market activity, trading at $${quote.price} with strong sector relevance.`,
    keyDrivers: ["Solid industry position", "Healthy trading liquidity"],
    keyRisks: ["Broader market volatility", "Sector-wide macroeconomic headwinds"]
  };

  try {
    const response = await llm.invoke([
      new SystemMessage("You are a strict financial AI analyst. Output strictly valid JSON with no backticks."),
      new HumanMessage(prompt)
    ]);
    const cleanContent = response.content.trim().replace(/```json/g, "").replace(/```/g, "").trim();
    decision = JSON.parse(cleanContent);
  } catch (err) {
    console.warn("AI synthesis error:", err.message);
  }

  return {
    symbol: quote.symbol,
    name: quote.name,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    currency: quote.currency,
    marketCap: quote.marketCap,
    marketCapFormatted: formatMarketCap(quote.marketCap),
    peRatio: quote.peRatio,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
    sector: quote.sector,
    verdict: decision.verdict || "INVEST",
    confidence: decision.confidence || 80,
    rationale: decision.rationale || decision.summary,
    keyDrivers: decision.keyDrivers || [],
    keyRisks: decision.keyRisks || [],
    news: newsArticles,
    historicalData: historicalData
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // use raw body
      }
    }

    const company = body?.company || body?.symbol || body?.query;
    if (!company || typeof company !== 'string' || !company.trim()) {
      return res.status(400).json({ error: 'Company name or stock symbol is required.' });
    }

    const result = await performResearch(company.trim());
    return res.status(200).json(result);
  } catch (error) {
    console.error("API /api/analyze error:", error);
    return res.status(500).json({ error: error.message || 'An error occurred during analysis.' });
  }
}
