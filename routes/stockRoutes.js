const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'your_finnhub_api_key_here';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Cache for market status
let marketStatusCache = {
  data: null,
  timestamp: null
};

// Helper function to get default market status based on Indian market hours
function getDefaultMarketStatus() {
  const now = new Date();
  const indiaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hours = indiaTime.getHours();
  const minutes = indiaTime.getMinutes();
  const day = indiaTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const isWeekday = day >= 1 && day <= 5;
  // Indian market hours: 9:15 AM to 3:30 PM
  const isMarketHours = (hours > 9 || (hours === 9 && minutes >= 15)) && (hours < 15 || (hours === 15 && minutes <= 30));
  
  if (isWeekday && isMarketHours) {
    return {
      isOpen: true,
      message: "Market is currently open",
      exchange: "NSE",
      timezone: "Asia/Kolkata",
      timestamp: now.toISOString()
    };
  } else {
    let nextOpenTime = "9:15 AM";
    if (!isWeekday && day === 5) {
      nextOpenTime = "Monday at 9:15 AM";
    } else if (!isWeekday && day === 6) {
      nextOpenTime = "Monday at 9:15 AM";
    } else if (!isWeekday) {
      nextOpenTime = "Tomorrow at 9:15 AM";
    }
    return {
      isOpen: false,
      message: `Market is currently closed. Next open: ${nextOpenTime}`,
      exchange: "NSE",
      timezone: "Asia/Kolkata",
      timestamp: now.toISOString()
    };
  }
}

// Test endpoint to verify backend is working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Stock API is working', 
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// Search for stocks
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    console.log(`Searching for: ${query}`);
    
    const response = await axios.get(`${FINNHUB_BASE_URL}/search`, {
      params: {
        q: query,
        token: FINNHUB_API_KEY
      },
      timeout: 10000
    });
    
    console.log(`Search results: ${response.data.result?.length || 0} found`);
    res.json(response.data);
  } catch (error) {
    console.error('Error searching stocks:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    res.status(500).json({ 
      error: 'Failed to search stocks',
      details: error.message,
      status: error.response?.status
    });
  }
});

// Get company profile
router.get('/company-profile', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }
    
    console.log(`Fetching profile for: ${symbol}`);
    
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/profile2`, {
      params: {
        symbol: symbol.toUpperCase(),
        token: FINNHUB_API_KEY
      },
      timeout: 10000
    });
    
    console.log(`Profile fetched for: ${symbol}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching company profile:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    res.status(500).json({ 
      error: 'Failed to fetch company profile',
      details: error.message,
      symbol: symbol
    });
  }
});

// Get real-time quote
router.get('/quote', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }
    
    console.log(`Fetching quote for: ${symbol}`);
    
    const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
      params: {
        symbol: symbol.toUpperCase(),
        token: FINNHUB_API_KEY
      },
      timeout: 10000
    });
    
    console.log(`Quote fetched for: ${symbol}`, response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching quote:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    res.status(500).json({ 
      error: 'Failed to fetch stock quote',
      details: error.message,
      symbol: symbol
    });
  }
});

// Get multiple quotes at once
router.post('/quotes', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ 
        error: 'Symbols array is required' 
      });
    }
    
    console.log(`Fetching quotes for ${symbols.length} symbols`);
    
    // Fetch quotes in parallel
    const quotePromises = symbols.map(symbol => 
      axios.get(`${FINNHUB_BASE_URL}/quote`, {
        params: {
          symbol: symbol.toUpperCase(),
          token: FINNHUB_API_KEY
        },
        timeout: 10000
      }).catch(error => {
        console.error(`Error fetching quote for ${symbol}:`, error.message);
        return { data: { c: null, error: true } };
      })
    );
    
    const responses = await Promise.all(quotePromises);
    
    const quotes = {};
    symbols.forEach((symbol, index) => {
      const quoteData = responses[index].data;
      if (quoteData && quoteData.c !== null && !quoteData.error) {
        quotes[symbol] = {
          currentPrice: quoteData.c,
          high: quoteData.h,
          low: quoteData.l,
          open: quoteData.o,
          previousClose: quoteData.pc,
          timestamp: quoteData.t
        };
      } else {
        quotes[symbol] = {
          currentPrice: null,
          error: true,
          message: 'Failed to fetch quote'
        };
      }
    });
    
    res.json({
      success: true,
      data: { quotes }
    });
  } catch (error) {
    console.error('Error fetching multiple quotes:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch quotes',
      details: error.message
    });
  }
});

// Get market status with caching and fallback
router.get('/market-status', async (req, res) => {
  try {
    // Check if we have valid cached data (cache for 5 minutes)
    if (marketStatusCache.data && marketStatusCache.timestamp && 
        (Date.now() - marketStatusCache.timestamp) < 300000) {
      console.log('Returning cached market status');
      return res.json(marketStatusCache.data);
    }
    
    console.log('Fetching market status from Finnhub');
    
    // Try to fetch from API with timeout
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/market-status`, {
      params: {
        token: FINNHUB_API_KEY
      },
      timeout: 8000
    });
    
    // Update cache
    marketStatusCache = {
      data: response.data,
      timestamp: Date.now()
    };
    
    console.log('Market status fetched successfully');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching market status:', error.message);
    
    // If we have cached data, return it even if expired
    if (marketStatusCache.data) {
      console.log('Returning expired cached data due to error');
      return res.json({
        ...marketStatusCache.data,
        isCached: true,
        message: marketStatusCache.data.message + " (using cached data)"
      });
    }
    
    // Return calculated default market status
    const defaultStatus = getDefaultMarketStatus();
    console.log('Returning calculated default market status');
    res.json(defaultStatus);
  }
});

// Get stock candles (historical data)
router.get('/candles', async (req, res) => {
  try {
    const { symbol, resolution, from, to } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }
    
    // Set default values if not provided
    const endDate = to ? new Date(to) : new Date();
    const startDate = from ? new Date(from) : new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);
    
    const fromTimestamp = Math.floor(startDate.getTime() / 1000);
    const toTimestamp = Math.floor(endDate.getTime() / 1000);
    
    console.log(`Fetching candles for: ${symbol} from ${fromTimestamp} to ${toTimestamp}`);
    
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/candle`, {
      params: {
        symbol: symbol.toUpperCase(),
        resolution: resolution || 'D',
        from: fromTimestamp,
        to: toTimestamp,
        token: FINNHUB_API_KEY
      },
      timeout: 10000
    });
    
    console.log(`Candles fetched for: ${symbol}`, response.data.s?.length || 0, 'points');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching candles:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    res.status(500).json({ 
      error: 'Failed to fetch stock historical data',
      details: error.message
    });
  }
});

// Get company news
router.get('/news', async (req, res) => {
  try {
    const { symbol, from, to } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }
    
    const endDate = to ? new Date(to) : new Date();
    const startDate = from ? new Date(from) : new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
    
    const fromDate = startDate.toISOString().split('T')[0];
    const toDate = endDate.toISOString().split('T')[0];
    
    console.log(`Fetching news for: ${symbol} from ${fromDate} to ${toDate}`);
    
    const response = await axios.get(`${FINNHUB_BASE_URL}/company-news`, {
      params: {
        symbol: symbol.toUpperCase(),
        from: fromDate,
        to: toDate,
        token: FINNHUB_API_KEY
      },
      timeout: 10000
    });
    
    console.log(`News fetched for: ${symbol}, ${response.data.length} articles`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching news:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    res.status(500).json({ 
      error: 'Failed to fetch company news',
      details: error.message
    });
  }
});

module.exports = router;