const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));

// Configuration
const WHALE_THRESHOLD = 5000; // $100,000 USD (lowered for testing - change to 500000 for production)
const ASSET = 'BTCUSDT';
const ROLLING_WINDOW = 60 * 60 * 1000; // 60 minutes in milliseconds

// State Management
let currentPrice = 0;
let assetInfo = null;
let trades = [];
let whaleAlerts = [];
let metrics = {
  high1h: 0,
  low1h: Infinity,
  volume1h: 0,
  whaleCount: 0,
  maxWhaleAmount: 0,
  whalePressure: 'Neutral'
};

// Historical data for chart (last 60 minutes)
let chartData = [];
let candleData = new Map(); // time -> {open, high, low, close, volume}

// Initialize CoinGecko Asset Info
async function fetchAssetInfo() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin');
    assetInfo = {
      symbol: 'BTC',
      logo: response.data.image.small,
      name: response.data.name
    };
    console.log(' Asset info loaded from CoinGecko');
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    // Fallback
    assetInfo = {
      symbol: 'BTC',
      logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
      name: 'Bitcoin'
    };
  }
}

// Calculate Whale Pressure based on recent whale activity
function calculateWhalePressure() {
  const recentWhales = whaleAlerts.filter(w =>
    Date.now() - w.timestamp < 300000 // Last 5 minutes
  );

  if (recentWhales.length === 0) return 'Neutral';
  if (recentWhales.length >= 5) return 'Extreme';
  if (recentWhales.length >= 3) return 'High';
  if (recentWhales.length >= 1) return 'Moderate';
  return 'Low';
}

// Update metrics based on recent trades
function updateMetrics() {
  const now = Date.now();
  const oneHourAgo = now - ROLLING_WINDOW;

  // Filter trades from last hour
  const recentTrades = trades.filter(t => t.timestamp > oneHourAgo);

  if (recentTrades.length > 0) {
    const prices = recentTrades.map(t => t.price);
    metrics.high1h = Math.max(...prices);
    metrics.low1h = Math.min(...prices);
    metrics.volume1h = recentTrades.reduce((sum, t) => sum + t.quantity, 0);
  }

  // Whale metrics
  const recentWhales = whaleAlerts.filter(w => w.timestamp > oneHourAgo);
  metrics.whaleCount = recentWhales.length;
  metrics.maxWhaleAmount = recentWhales.length > 0
    ? Math.max(...recentWhales.map(w => w.tradeValue))
    : 0;

  metrics.whalePressure = calculateWhalePressure();

  return metrics;
}

// Generate candlestick data (1-minute candles)
function updateCandleData(trade) {
  const candleTime = Math.floor(trade.timestamp / 60000) * 60; // Round to minute

  if (!candleData.has(candleTime)) {
    candleData.set(candleTime, {
      time: candleTime,
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
      volume: trade.quantity
    });
  } else {
    const candle = candleData.get(candleTime);
    candle.high = Math.max(candle.high, trade.price);
    candle.low = Math.min(candle.low, trade.price);
    candle.close = trade.price;
    candle.volume += trade.quantity;
  }

  // Clean old candles (keep 60 minutes)
  const oldestTime = (Math.floor(Date.now() / 60000) - 60) * 60;
  for (const [time] of candleData) {
    if (time < oldestTime) {
      candleData.delete(time);
    }
  }

  return Array.from(candleData.values()).sort((a, b) => a.time - b.time);
}

// WebSocket connection to Binance
function connectBinance() {
  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${ASSET.toLowerCase()}@trade`);

  ws.on('open', () => {
    console.log(' Connected to Binance WebSocket');
  });

  ws.on('message', (data) => {
    try {
      const json = JSON.parse(data);

      const trade = {
        timestamp: json.T,
        price: parseFloat(json.p),
        quantity: parseFloat(json.q),
        tradeValue: parseFloat(json.p) * parseFloat(json.q),
        isBuyerMaker: json.m
      };

      currentPrice = trade.price;

      // Check if whale trade
      const isWhale = trade.tradeValue >= WHALE_THRESHOLD;
      trade.isWhale = isWhale;

      // Store trade
      trades.push(trade);

      // Keep only last hour of trades
      const oneHourAgo = Date.now() - ROLLING_WINDOW;
      trades = trades.filter(t => t.timestamp > oneHourAgo);

      // Whale alert - store and broadcast immediately
      if (isWhale) {
        const whaleAlert = {
          timestamp: trade.timestamp,
          quantity: trade.quantity,
          tradeValue: trade.tradeValue,
          price: trade.price,
          isWhale: true
        };
        whaleAlerts.push(whaleAlert);
        console.log(`ðŸ‹ WHALE ALERT: ${trade.quantity.toFixed(4)} BTC = ${trade.tradeValue.toLocaleString()}`);

        // Broadcast whale alert separately for immediate update
        io.emit('whale_alert', whaleAlert);
      }

      // Update candle data
      const candles = updateCandleData(trade);

      // Broadcast to all clients
      io.emit('trade_update', trade);
      io.emit('metrics_update', updateMetrics());

      // Send chart data every 5 seconds
      if (Date.now() % 5000 < 100) {
        io.emit('chart_data', candles);
      }

    } catch (error) {
      console.error('Error processing trade:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('WebSocket closed. Reconnecting in 5s...');
    setTimeout(connectBinance, 5000);
  });
}

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial data
  if (assetInfo) {
    socket.emit('asset_info', assetInfo);
  }

  socket.emit('metrics_update', metrics);

  // Send current chart data
  const candles = Array.from(candleData.values()).sort((a, b) => a.time - b.time);
  if (candles.length > 0) {
    socket.emit('chart_data', candles);
  }

  // Send recent whale alerts
  whaleAlerts.slice(-20).forEach(whale => {
    socket.emit('whale_alert', whale);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Periodic updates
setInterval(() => {
  io.emit('metrics_update', updateMetrics());
}, 5000); // Update metrics every 5 seconds

setInterval(() => {
  const candles = Array.from(candleData.values()).sort((a, b) => a.time - b.time);
  if (candles.length > 0) {
    io.emit('chart_data', candles);
  }
}, 10000); // Update chart every 10 seconds

// Initialize and start server
async function start() {
  console.log('ðŸš€ Starting Whale Watcher...');

  await fetchAssetInfo();
  connectBinance();

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
    console.log(` Monitoring ${ASSET} for trades > $${WHALE_THRESHOLD.toLocaleString()}`);
  });
}

start();