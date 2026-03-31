const express = require("express");
const mongoose = require("mongoose");
const connectDB = require('./Config/db');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/authRoutes');
const cors = require('cors');
const { userRouter } = require("./routes/userRoutes");
const { HoldingModel } = require('./Model/HoldingModel');
const { PositionsModel } = require('./Model/PositionsModel');

const PORT = process.env.PORT || 3003;
const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
require("dotenv").config();

// ========== FIXED CORS CONFIGURATION ==========
const allowedOrigins = [
  'https://zerodha-dashboard-q4oc.vercel.app',
  'http://localhost:5173',  // Vite default
  'http://localhost:3000',   // React default
  'http://localhost:3001',
  'http://localhost:5000'
];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Important for cookies/sessions
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware - this handles OPTIONS preflight automatically
app.use(cors(corsOptions));

// Connecting the DB
connectDB();

// ========== ROUTES ==========
app.get('/allHoldings', async (req, res) => {
  try {
    let allHoldings = await HoldingModel.find({});
    res.json(allHoldings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/allPositions', async (req, res) => {
  try {
    let allPositions = await PositionsModel.find({});
    res.json(allPositions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send("api working successfully");
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);

app.post('/api/user/watchlist', async (req, res) => {
  // Your watchlist logic here
});

// Test endpoint to verify CORS is working
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'CORS is working!', 
    timestamp: new Date().toISOString(),
    origin: req.headers.origin 
  });
});

// ========== STOCK DATA ENDPOINTS ==========
app.get('/api/stock-data', async (req, res) => {
  try {
    const symbol = req.query.symbol;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }
    
    // Generate random single day data for any symbol
    const stockData = {
      symbol: symbol.toUpperCase(),
      data: generateRandomDayData(symbol)
    };
    
    res.json(stockData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function generateRandomDayData(symbol) {
  const data = [];
  
  // Generate a random base price based on the symbol
  const basePrice = generateBasePrice(symbol);
  let price = basePrice;
  
  // Create today's date
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  
  // Generate 24 data points (one per hour) for today
  for (let hour = 0; hour < 24; hour++) {
    const timestamp = new Date(year, month, day, hour, 0, 0);
    
    // Random price movement
    const change = (Math.random() - 0.5) * (basePrice * 0.05); // ±5% of base price
    const close = price + change;
    const open = price;
    const high = Math.max(open, close) + (Math.random() * basePrice * 0.02);
    const low = Math.min(open, close) - (Math.random() * basePrice * 0.02);
    
    data.push({
      timestamp: timestamp.toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000
    });
    
    price = close; // Next hour's open is this hour's close
  }
  
  return data;
}

function generateBasePrice(symbol) {
  const symbolUpper = symbol.toUpperCase();
  
  // Generate a consistent but "unique" base price for each symbol
  let hash = 0;
  for (let i = 0; i < symbolUpper.length; i++) {
    hash = symbolUpper.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Normalize the hash to a price range (e.g., $10 to $500)
  const price = 10 + Math.abs(hash % 490);
  
  return price;
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`app is listening on ${PORT}`);
});