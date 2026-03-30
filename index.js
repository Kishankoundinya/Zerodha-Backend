const express = require("express");
const mongoose = require("mongoose");
const connectDB =require('./Config/db');
const bodyParser=require('body-parser');
const cookieParser = require('cookie-parser');
const authRouter= require('./routes/authRoutes')
const cors = require('cors');
const { userRouter } = require("./routes/userRoutes");
const {HoldingModel}=require('./Model/HoldingModel')
const {PositionsModel}=require('./Model/PositionsModel')
const PORT = process.env.PORT || 3003;
const app = express();
app.use(express.json())
app.use(bodyParser.json());
require("dotenv").config();
app.use(cookieParser());
app.use(cors({
  origin: /^http:\/\/localhost:\d+$/, 
  credentials: true
}));


//////////////// Connecting the DB/////////////////////
connectDB();


app.get('/allHoldings',async(req,res)=>{
     let allHoldings= await HoldingModel.find({});
     console.log(allHoldings)
     res.json(allHoldings);
});

app.get('/allPositions',async(req,res)=>{
     let allPositions= await PositionsModel.find({});
     res.json(allPositions);
});

/////////////////API Endpoint/////////////
app.get('/',(req,res)=>{
     res.send("api working succesfully")
})
app.use('/api/auth',authRouter)
app.use('/api/user',userRouter)

app.post('/api/user/watchlist',async(req,res)=>{
     
})

//////////////////////////////////////////////////////////////////////////////////////////////
// Simple endpoint for random stock data for any symbol (single day)
app.get('/api/stock-data', async (req, res) => {
  try {
    const symbol = req.query.symbol ;
    
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

// Helper function to generate different base prices for different symbols
function generateBasePrice(symbol) {
  const symbolUpper = symbol.toUpperCase();
  
  // Generate a consistent but "unique" base price for each symbol
  // by converting the symbol to a number
  let hash = 0;
  for (let i = 0; i < symbolUpper.length; i++) {
    hash = symbolUpper.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Normalize the hash to a price range (e.g., $10 to $500)
  const price = 10 + Math.abs(hash % 490);
  
  return price;
}

// Alternative: Simpler version with even more randomness
function generateSimpleRandomDayData(symbol) {
  const data = [];
  const today = new Date();
  
  // Start with a completely random price
  let currentPrice = 50 + Math.random() * 450; // Random price between $50 and $500
  
  for (let hour = 0; hour < 24; hour++) {
    const timestamp = new Date(today);
    timestamp.setHours(hour, 0, 0, 0);
    
    const open = currentPrice;
    const change = (Math.random() - 0.5) * 10; // Random change ±$5
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 3;
    const low = Math.min(open, close) - Math.random() * 3;
    
    data.push({
      timestamp: timestamp.toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 500000
    });
    
    currentPrice = close;
  }
  
  return data;
}
////////////////////////////////////////////////////////////////////////

app.listen(PORT, () => {
    console.log(`app is listining on ${PORT}`)
})


