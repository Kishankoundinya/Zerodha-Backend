const express = require("express");
const mongoose = require("mongoose");
const connectDB = require('./Config/db');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/authRoutes');
const cors = require('cors');
const { userRouter } = require("./routes/userRoutes");
const stockRoutes = require('./routes/stockRoutes');
const orderRoutes = require('./routes/orderRoutes');

const PORT = process.env.PORT || 3003;
const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
require("dotenv").config();

const allowedOrigins = [
  'https://trade-x-dashboard.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',  
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000'
];

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

connectDB();

app.get('/', (req, res) => {
  res.send("api working successfully");
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/stocks', stockRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'CORS is working!', 
    timestamp: new Date().toISOString(),
    origin: req.headers.origin 
  });
});

app.get('/api/stock-data', async (req, res) => {
  try {
    const symbol = req.query.symbol;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }
    
    const stockData = {
      symbol: symbol.toUpperCase(),
      data: generateRandomDayData(symbol)
    };
    
    res.json(stockData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`app is listening on ${PORT}`);
});