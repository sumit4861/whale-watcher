const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const WebSocket = require('ws');
const axios = require('axios');
const path = require('path');

// AI/ML Whale Prediction System
class WhaleAIPredictor {
  constructor() {
    this.whaleHistory = [];
    this.predictions = {};
  }

  analyzeWhalePattern(whale) {
    this.whaleHistory.push({
      timestamp: whale.timestamp,
      value: whale.tradeValue,
      price: whale.price,
      quantity: whale.quantity,
      category: whale.category
    });

    if (this.whaleHistory.length > 100) this.whaleHistory.shift();

    const pattern = this.detectPattern();
    const whaleType = this.classifyWhaleType(whale);
    const priceImpact = this.predictPriceImpact(whale);
    const nextWhaleTiming = this.predictNextWhale();
    const sentiment = this.calculateSentiment();

    return {
      pattern,
      whaleType,
      priceImpact,
      nextWhaleTiming,
      sentiment,
      recommendation: this.generateRecommendation(pattern, whaleType)
    };
  }

  classifyWhaleType(whale) {
    const recentWhales = this.whaleHistory.slice(-10);
    if (recentWhales.length < 3) {
      return {
        type: 'Unknown',
        description: 'Insufficient data',
        confidence: 0,
        behavior: 'NEUTRAL',
        color: '#9598a1'
      };
    }

    const timeSpan = whale.timestamp - recentWhales[0].timestamp;
    const frequency = recentWhales.length / (timeSpan / 60000);
    const volumes = recentWhales.map(w => w.value);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volumeTrend = (whale.tradeValue - avgVolume) / avgVolume;

    if (frequency > 0.5 && volumeTrend > 0.2) {
      return {
        type: 'Accumulator',
        description: 'Large buyer accumulating position',
        confidence: 85,
        behavior: 'BULLISH',
        color: '#0ecb81'
      };
    } else if (frequency > 0.5 && volumeTrend < -0.2) {
      return {
        type: 'Distributor',
        description: 'Large seller distributing position',
        confidence: 80,
        behavior: 'BEARISH',
        color: '#f6465d'
      };
    } else if (frequency > 0.8) {
      return {
        type: 'Market Maker',
        description: 'Providing liquidity',
        confidence: 75,
        behavior: 'NEUTRAL',
        color: '#f7931a'
      };
    } else if (whale.tradeValue > avgVolume * 3) {
      return {
        type: 'Institutional',
        description: 'Large institutional trade',
        confidence: 70,
        behavior: 'SIGNIFICANT',
        color: '#c77dff'
      };
    } else {
      return {
        type: 'Retail Whale',
        description: 'Large retail trader',
        confidence: 60,
        behavior: 'NEUTRAL',
        color: '#9598a1'
      };
    }
  }

  detectPattern() {
    if (this.whaleHistory.length < 5) {
      return {
        name: 'Insufficient Data',
        confidence: 20,
        implication: 'Need more whale activity to analyze'
      };
    }

    const recent = this.whaleHistory.slice(-20);
    const timeSpans = [];
    const volumes = recent.map(w => w.value);

    // Calculate time intervals
    for (let i = 1; i < recent.length; i++) {
      timeSpans.push(recent[i].timestamp - recent[i - 1].timestamp);
    }

    const avgTimeSpan = timeSpans.reduce((a, b) => a + b, 0) / timeSpans.length;
    const timeVariance = this.calculateVariance(timeSpans);
    const volumeVariance = this.calculateVariance(volumes);

    // Coordinated activity - low time variance
    if (timeVariance < avgTimeSpan * 0.3 && recent.length > 10) {
      return {
        name: 'Coordinated Whale Activity',
        description: 'Multiple whales acting in coordination',
        confidence: 88,
        implication: 'Major market move expected soon'
      };
    }
    // High variance - erratic behavior
    else if (volumeVariance > volumes[0] * 2) {
      return {
        name: 'Erratic Whale Behavior',
        description: 'Unpredictable large trades',
        confidence: 72,
        implication: 'High volatility expected'
      };
    }
    // Accumulation pattern
    else if (this.isAccumulationPattern(recent)) {
      const strength = this.calculatePatternStrength(recent, 'accumulation');
      return {
        name: 'Accumulation Phase',
        description: 'Steady buying pressure from whales',
        confidence: Math.round(75 + strength * 15),
        implication: 'Price likely to increase'
      };
    }
    // Distribution pattern
    else if (this.isDistributionPattern(recent)) {
      const strength = this.calculatePatternStrength(recent, 'distribution');
      return {
        name: 'Distribution Phase',
        description: 'Whales selling into strength',
        confidence: Math.round(75 + strength * 15),
        implication: 'Price likely to decrease'
      };
    }
    // Normal activity
    else {
      return {
        name: 'Normal Activity',
        description: 'Standard whale trading patterns',
        confidence: 55,
        implication: 'No major moves expected'
      };
    }
  }

  calculatePatternStrength(whales, type) {
    if (whales.length < 5) return 0;
    const volumes = whales.map(w => w.value);
    let matches = 0;

    for (let i = 1; i < volumes.length; i++) {
      if (type === 'accumulation' && volumes[i] > volumes[i - 1]) matches++;
      if (type === 'distribution' && volumes[i] < volumes[i - 1]) matches++;
    }

    return matches / volumes.length; // Returns 0 to 1
  }

  calculateVariance(arr) {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  predictPriceImpact(whale) {
    const tradePercentage = (whale.tradeValue / 1000000000) * 100;
    let impactPercentage = tradePercentage * 50;
    let impactType = impactPercentage > 0.5 ? 'MAJOR' : impactPercentage > 0.1 ? 'MODERATE' : 'MINOR';
    let confidence = impactPercentage > 0.5 ? 85 : 65;

    return {
      percentage: impactPercentage.toFixed(4),
      type: impactType,
      confidence,
      estimatedMove: (whale.price * impactPercentage / 100).toFixed(2)
    };
  }

  predictNextWhale() {
    if (this.whaleHistory.length < 5) {
      return { probability: 0, timeframe: 'Unknown', confidence: 0 };
    }

    const recent = this.whaleHistory.slice(-10);
    const timeGaps = [];
    for (let i = 1; i < recent.length; i++) {
      timeGaps.push(recent[i].timestamp - recent[i - 1].timestamp);
    }

    const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
    const timeSinceLastWhale = Date.now() - recent[recent.length - 1].timestamp;
    const probability = Math.min(100, (timeSinceLastWhale / avgGap) * 100);
    const expectedTime = avgGap - timeSinceLastWhale;

    let timeframe = expectedTime < 0 ? 'Overdue' :
      expectedTime < 60000 ? `${Math.round(expectedTime / 1000)}s` :
        `${Math.round(expectedTime / 60000)}m`;

    return {
      probability: Math.round(probability),
      timeframe,
      confidence: 70
    };
  }

  generateRecommendation(pattern, whaleType) {
    let action = 'HOLD', reasoning = '', confidence = 50;

    // Calculate base confidence from whale type and pattern
    const whaleConfidence = whaleType.confidence || 0;
    const patternConfidence = pattern.confidence || 0;

    // Strong signals - high confidence
    if (whaleType.behavior === 'BULLISH' && pattern.name === 'Accumulation Phase') {
      action = 'BUY';
      reasoning = 'Whales accumulating + bullish pattern detected';
      confidence = Math.min(95, (whaleConfidence + patternConfidence) / 2 + 10);
    }
    else if (whaleType.behavior === 'BEARISH' && pattern.name === 'Distribution Phase') {
      action = 'SELL';
      reasoning = 'Whales distributing + bearish pattern detected';
      confidence = Math.min(95, (whaleConfidence + patternConfidence) / 2 + 10);
    }
    // Moderate signals
    else if (whaleType.behavior === 'BULLISH') {
      action = 'BUY';
      reasoning = 'Bullish whale behavior detected';
      confidence = Math.max(65, whaleConfidence - 5);
    }
    else if (whaleType.behavior === 'BEARISH') {
      action = 'SELL';
      reasoning = 'Bearish whale behavior detected';
      confidence = Math.max(65, whaleConfidence - 5);
    }
    else if (pattern.name === 'Accumulation Phase') {
      action = 'BUY';
      reasoning = 'Accumulation pattern forming';
      confidence = Math.max(60, patternConfidence);
    }
    else if (pattern.name === 'Distribution Phase') {
      action = 'SELL';
      reasoning = 'Distribution pattern forming';
      confidence = Math.max(60, patternConfidence);
    }
    // Coordinated activity
    else if (pattern.name === 'Coordinated Whale Activity') {
      action = 'WAIT';
      reasoning = 'Coordinated activity - wait for clear direction';
      confidence = Math.max(70, patternConfidence);
    }
    // Market maker or neutral
    else if (whaleType.type === 'Market Maker') {
      action = 'HOLD';
      reasoning = 'Market maker activity - avoid chasing';
      confidence = Math.max(55, whaleConfidence - 10);
    }
    // Insufficient data or weak signals
    else if (this.whaleHistory.length < 3) {
      action = 'HOLD';
      reasoning = 'Insufficient data for prediction';
      confidence = 30;
    }
    // Default - weak signals
    else {
      action = 'HOLD';
      reasoning = 'Mixed signals - no clear trend';
      confidence = Math.max(40, (whaleConfidence + patternConfidence) / 2 - 10);
    }

    // Calculate risk level based on confidence and whale count
    let riskLevel = 'MEDIUM';
    if (confidence >= 80) riskLevel = 'LOW';
    else if (confidence >= 60) riskLevel = 'MEDIUM';
    else riskLevel = 'HIGH';

    return {
      action,
      reasoning,
      confidence: Math.round(confidence),
      riskLevel
    };
  }

  calculateSentiment() {
    if (this.whaleHistory.length < 10) {
      return { sentiment: 'NEUTRAL', score: 50 };
    }

    const recent = this.whaleHistory.slice(-20);
    let bullishScore = 0;
    recent.forEach((whale, idx) => {
      if (idx > 0) {
        const priceChange = whale.price - recent[idx - 1].price;
        if (priceChange > 0) bullishScore++;
        else if (priceChange < 0) bullishScore--;
      }
    });

    const sentimentScore = ((bullishScore / recent.length) + 1) * 50;
    let sentiment = sentimentScore > 70 ? 'VERY BULLISH' :
      sentimentScore > 55 ? 'BULLISH' :
        sentimentScore > 45 ? 'NEUTRAL' :
          sentimentScore > 30 ? 'BEARISH' : 'VERY BEARISH';

    return { sentiment, score: Math.round(sentimentScore) };
  }

  isAccumulationPattern(whales) {
    if (whales.length < 5) return false;
    const volumes = whales.map(w => w.value);
    let increasing = volumes.filter((v, i) => i > 0 && v > volumes[i - 1]).length;
    return increasing / volumes.length > 0.6;
  }

  isDistributionPattern(whales) {
    if (whales.length < 5) return false;
    const volumes = whales.map(w => w.value);
    let decreasing = volumes.filter((v, i) => i > 0 && v < volumes[i - 1]).length;
    return decreasing / volumes.length > 0.6;
  }
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'public')));

console.log('📁 Serving static files from:', path.join(__dirname, 'public'));

app.get('/api/test', (req, res) => {
  res.json({ status: 'Server is running!', timestamp: Date.now() });
});

const whaleDatabase = [];

function saveWhaleAlert(whale) {
  whaleDatabase.push({
    timestamp: whale.timestamp,
    symbol: whale.symbol,
    quantity: whale.quantity,
    price: whale.price,
    trade_value: whale.tradeValue,
    whale_category: whale.category,
    created_at: new Date().toISOString()
  });

  if (whaleDatabase.length > 1000) {
    whaleDatabase.shift();
  }

  console.log(`💾 Saved to memory: ${whale.category} - $${whale.tradeValue.toLocaleString()}`);
}

// PRODUCTION THRESHOLDS
const WHALE_CATEGORIES = {
  SMALL: { min: 100, max: 250, label: 'Small Whale', color: '#ffa500' },
  MEDIUM: { min: 250, max: 500, label: 'Medium Whale', color: '#ff6b35' },
  LARGE: { min: 500, max: 1000, label: 'Large Whale', color: '#f6465d' },
  MEGA: { min: 1000, max: Infinity, label: 'Mega Whale', color: '#d90429' }
};

function categorizeWhale(tradeValue) {
  if (tradeValue >= WHALE_CATEGORIES.MEGA.min) return 'MEGA';
  if (tradeValue >= WHALE_CATEGORIES.LARGE.min) return 'LARGE';
  if (tradeValue >= WHALE_CATEGORIES.MEDIUM.min) return 'MEDIUM';
  if (tradeValue >= WHALE_CATEGORIES.SMALL.min) return 'SMALL';
  return null;
}

const SUPPORTED_ASSETS = {
  BTCUSDT: { symbol: 'BTC', name: 'Bitcoin', threshold: 100000, coinGeckoId: 'bitcoin' },
  ETHUSDT: { symbol: 'ETH', name: 'Ethereum', threshold: 50000, coinGeckoId: 'ethereum' },
  BNBUSDT: { symbol: 'BNB', name: 'Binance Coin', threshold: 25000, coinGeckoId: 'binancecoin' },
  SOLUSDT: { symbol: 'SOL', name: 'Solana', threshold: 20000, coinGeckoId: 'solana' },
  XRPUSDT: { symbol: 'XRP', name: 'Ripple', threshold: 15000, coinGeckoId: 'ripple' }
};

const ROLLING_WINDOW = 60 * 60 * 1000;
const assetStates = new Map();

class AssetTracker {
  constructor(symbol, config) {
    this.symbol = symbol;
    this.config = config;
    this.currentPrice = 0;
    this.trades = [];
    this.whaleAlerts = [];
    this.candleData = new Map();
    this.ws = null;
    this.assetInfo = null;
    this.aiPredictor = new WhaleAIPredictor();
    this.metrics = {
      high1h: 0,
      low1h: Infinity,
      volume1h: 0,
      whaleCount: 0,
      maxWhaleAmount: 0,
      whalePressure: 'Neutral'
    };
  }

  async fetchAssetInfo() {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${this.config.coinGeckoId}`,
        { timeout: 5000 }
      );
      this.assetInfo = {
        symbol: this.config.symbol,
        logo: response.data.image.small,
        name: response.data.name
      };
      console.log(`✓ ${this.config.symbol} info loaded`);
    } catch (error) {
      console.error(`⚠️ CoinGecko error for ${this.config.symbol}, using fallback`);
      this.assetInfo = {
        symbol: this.config.symbol,
        logo: `https://cryptologos.cc/logos/bitcoin-btc-logo.png`,
        name: this.config.name
      };
    }
  }

  calculateWhalePressure() {
    const recentWhales = this.whaleAlerts.filter(w =>
      Date.now() - w.timestamp < 300000
    );
    if (recentWhales.length === 0) return 'Neutral';
    if (recentWhales.length >= 5) return 'Extreme';
    if (recentWhales.length >= 3) return 'High';
    if (recentWhales.length >= 1) return 'Moderate';
    return 'Low';
  }

  updateMetrics() {
    const now = Date.now();
    const oneHourAgo = now - ROLLING_WINDOW;
    const recentTrades = this.trades.filter(t => t.timestamp > oneHourAgo);

    if (recentTrades.length > 0) {
      const prices = recentTrades.map(t => t.price);
      this.metrics.high1h = Math.max(...prices);
      this.metrics.low1h = Math.min(...prices);
      this.metrics.volume1h = recentTrades.reduce((sum, t) => sum + t.quantity, 0);
    }

    const recentWhales = this.whaleAlerts.filter(w => w.timestamp > oneHourAgo);
    this.metrics.whaleCount = recentWhales.length;
    this.metrics.maxWhaleAmount = recentWhales.length > 0
      ? Math.max(...recentWhales.map(w => w.tradeValue))
      : 0;
    this.metrics.whalePressure = this.calculateWhalePressure();

    return this.metrics;
  }

  updateCandleData(trade) {
    const candleTime = Math.floor(trade.timestamp / 60000) * 60;

    if (!this.candleData.has(candleTime)) {
      this.candleData.set(candleTime, {
        time: candleTime,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.quantity
      });
    } else {
      const candle = this.candleData.get(candleTime);
      candle.high = Math.max(candle.high, trade.price);
      candle.low = Math.min(candle.low, trade.price);
      candle.close = trade.price;
      candle.volume += trade.quantity;
    }

    const oldestTime = (Math.floor(Date.now() / 60000) - 60) * 60;
    for (const [time] of this.candleData) {
      if (time < oldestTime) this.candleData.delete(time);
    }

    return Array.from(this.candleData.values()).sort((a, b) => a.time - b.time);
  }

  connect() {
    this.ws = new WebSocket(`wss://stream.binance.com:9443/ws/${this.symbol.toLowerCase()}@trade`);

    this.ws.on('open', () => {
      console.log(`✓ ${this.symbol} WebSocket connected`);
    });

    this.ws.on('message', (data) => {
      try {
        const json = JSON.parse(data);
        const trade = {
          timestamp: json.T,
          price: parseFloat(json.p),
          quantity: parseFloat(json.q),
          tradeValue: parseFloat(json.p) * parseFloat(json.q),
          isBuyerMaker: json.m,
          symbol: this.config.symbol
        };

        this.currentPrice = trade.price;
        const whaleCategory = categorizeWhale(trade.tradeValue);

        if (whaleCategory) {
          trade.isWhale = true;
          trade.category = whaleCategory;
          trade.categoryLabel = WHALE_CATEGORIES[whaleCategory].label;
          trade.categoryColor = WHALE_CATEGORIES[whaleCategory].color;

          const whaleAlert = { ...trade };
          this.whaleAlerts.push(whaleAlert);

          saveWhaleAlert(whaleAlert);

          // AI ANALYSIS
          const aiAnalysis = this.aiPredictor.analyzeWhalePattern(whaleAlert);
          whaleAlert.aiAnalysis = aiAnalysis;

          console.log(`🐋 ${whaleCategory} - ${this.config.symbol}: $${trade.tradeValue.toLocaleString()}`);
          console.log(`🤖 AI: ${aiAnalysis.whaleType.type} | ${aiAnalysis.recommendation.action} | Confidence: ${aiAnalysis.recommendation.confidence}%`);

          io.emit('whale_alert', whaleAlert);

          io.emit('ai_prediction', {
            symbol: this.config.symbol,
            analysis: aiAnalysis
          });
        } else {
          trade.isWhale = false;
        }

        this.trades.push(trade);
        const oneHourAgo = Date.now() - ROLLING_WINDOW;
        this.trades = this.trades.filter(t => t.timestamp > oneHourAgo);

        const candles = this.updateCandleData(trade);

        io.emit('trade_update', trade);
        io.emit('metrics_update', {
          symbol: this.config.symbol,
          metrics: this.updateMetrics()
        });

        if (Math.random() < 0.1) {
          io.emit('chart_data', { symbol: this.config.symbol, candles });
        }

      } catch (error) {
        console.error(`❌ Error processing ${this.symbol}:`, error.message);
      }
    });

    this.ws.on('error', (error) => {
      console.error(`❌ WebSocket error (${this.symbol}):`, error.message);
    });

    this.ws.on('close', () => {
      console.log(`⚠️ WebSocket closed (${this.symbol}). Reconnecting in 5s...`);
      setTimeout(() => this.connect(), 5000);
    });
  }
}

async function initializeAssets() {
  console.log('🔄 Initializing asset trackers...');
  for (const [symbol, config] of Object.entries(SUPPORTED_ASSETS)) {
    const tracker = new AssetTracker(symbol, config);
    await tracker.fetchAssetInfo();
    tracker.connect();
    assetStates.set(symbol, tracker);
  }
  console.log('✓ All asset trackers initialized');
}

io.on('connection', (socket) => {
  console.log('✓ Client connected:', socket.id);

  socket.emit('available_assets', Object.keys(SUPPORTED_ASSETS));
  socket.emit('whale_categories', WHALE_CATEGORIES);

  socket.on('select_asset', (symbol) => {
    console.log(`📊 Client ${socket.id} selected: ${symbol}`);
    const tracker = assetStates.get(symbol);
    if (!tracker) {
      console.error(`❌ Asset not found: ${symbol}`);
      return;
    }

    socket.emit('asset_info', tracker.assetInfo);
    socket.emit('metrics_update', {
      symbol: tracker.config.symbol,
      metrics: tracker.metrics
    });

    const candles = Array.from(tracker.candleData.values())
      .sort((a, b) => a.time - b.time);
    if (candles.length > 0) {
      socket.emit('chart_data', candles);
    }

    tracker.whaleAlerts.slice(-20).forEach(whale => {
      socket.emit('whale_alert', whale);
    });
  });

  socket.on('disconnect', () => {
    console.log('✗ Client disconnected:', socket.id);
  });
});

setInterval(() => {
  for (const [symbol, tracker] of assetStates) {
    const candles = Array.from(tracker.candleData.values())
      .sort((a, b) => a.time - b.time);
    if (candles.length > 0) {
      io.emit('chart_data', { symbol: tracker.config.symbol, candles });
    }
  }
}, 10000);

app.get('/api/whale-history/:symbol', (req, res) => {
  const { symbol } = req.params;
  const limit = parseInt(req.query.limit) || 100;

  const filtered = whaleDatabase
    .filter(w => w.symbol === symbol)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);

  res.json(filtered);
});

app.get('/api/whale-stats/:symbol', (req, res) => {
  const { symbol } = req.params;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const filtered = whaleDatabase.filter(w =>
    w.symbol === symbol && w.timestamp > oneDayAgo
  );

  const stats = {
    total_whales: filtered.length,
    total_value: filtered.reduce((sum, w) => sum + w.trade_value, 0),
    avg_value: filtered.length > 0 ?
      filtered.reduce((sum, w) => sum + w.trade_value, 0) / filtered.length : 0,
    max_value: filtered.length > 0 ?
      Math.max(...filtered.map(w => w.trade_value)) : 0
  };

  res.json(stats);
});

async function start() {
  console.log('🚀 Starting Multi-Currency Whale Watcher with AI...');
  console.log('📁 Current directory:', __dirname);
  console.log('📁 Public directory:', path.join(__dirname, 'public'));

  await initializeAssets();

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log('╔═══════════════════════════════════════╗');
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log('╚═══════════════════════════════════════╝');
    console.log('📊 Monitoring:', Object.keys(SUPPORTED_ASSETS).join(', '));
    console.log('🐋 Whale categories: Small, Medium, Large, Mega');
    console.log('🤖 AI Predictions: ACTIVE');
    console.log('💾 Storage: In-Memory (No Database)');
    console.log('╚═══════════════════════════════════════╝');
  });
}

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

start();