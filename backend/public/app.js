const socket = io();
let candleSeries, volSeries, analyticsSeries, candleChart, analyticsChart;
let ma7Series, ma25Series, ma99Series;
let lastPrice = 0;
let priceHistory = [];
let allTrades = [];
let currentSymbol = 'BTCUSDT';
let availableAssets = [];
let whaleCategories = {};

// Audio Setup for Whale Alerts
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playWhaleSound(category) {
  const frequencies = {
    'SMALL': 440,
    'MEDIUM': 554,
    'LARGE': 659,
    'MEGA': 880
  };

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequencies[category] || 440;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

// Chart Setup
function initCharts() {
  candleChart = LightweightCharts.createChart(document.getElementById('candleChart'), {
    layout: {
      background: { color: '#0b0e11' },
      textColor: '#787b86'
    },
    grid: {
      vertLines: { color: '#1e222d', style: 0 },
      horzLines: { color: '#1e222d', style: 0 }
    },
    width: document.getElementById('candleChart').clientWidth,
    height: 500,
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: '#9598a1', width: 1, style: 3, labelBackgroundColor: '#363c4e' },
      horzLine: { color: '#9598a1', width: 1, style: 3, labelBackgroundColor: '#363c4e' }
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      borderColor: '#2b2f36',
      barSpacing: 6,
      minBarSpacing: 4,
      rightOffset: 12
    },
    rightPriceScale: {
      borderColor: '#2b2f36',
      scaleMargins: { top: 0.1, bottom: 0.2 }
    },
    localization: {
      priceFormatter: price => '$' + price.toFixed(2)
    }
  });

  candleSeries = candleChart.addCandlestickSeries({
    upColor: '#0ecb81',
    downColor: '#f6465d',
    borderUpColor: '#0ecb81',
    borderDownColor: '#f6465d',
    wickUpColor: '#0ecb81',
    wickDownColor: '#f6465d'
  });

  ma7Series = candleChart.addLineSeries({
    color: '#f7931a',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    title: 'MA 7'
  });

  ma25Series = candleChart.addLineSeries({
    color: '#c77dff',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    title: 'MA 25'
  });

  ma99Series = candleChart.addLineSeries({
    color: '#f72585',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    title: 'MA 99'
  });

  volSeries = candleChart.addHistogramSeries({
    color: '#26a69a',
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    scaleMargins: { top: 0.7, bottom: 0 }
  });

  analyticsChart = LightweightCharts.createChart(document.getElementById('analyticsChart'), {
    layout: {
      background: { color: '#0b0e11' },
      textColor: '#787b86'
    },
    grid: {
      vertLines: { color: '#1e222d', style: 0 },
      horzLines: { color: '#1e222d', style: 0 }
    },
    width: document.getElementById('analyticsChart').clientWidth,
    height: 200,
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      borderColor: '#2b2f36',
      barSpacing: 6,
      rightOffset: 12
    },
    rightPriceScale: {
      borderColor: '#2b2f36'
    }
  });

  analyticsSeries = analyticsChart.addAreaSeries({
    topColor: 'rgba(14, 203, 129, 0.4)',
    bottomColor: 'rgba(14, 203, 129, 0.0)',
    lineColor: '#0ecb81',
    lineWidth: 2,
    priceLineVisible: false,
    crosshairMarkerVisible: true
  });

  window.addEventListener('resize', () => {
    candleChart.resize(document.getElementById('candleChart').clientWidth, 500);
    analyticsChart.resize(document.getElementById('analyticsChart').clientWidth, 200);
  });
}

function calculateMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

// Socket Events
socket.on('connect', () => {
  console.log('✓ Connected to server');
  updateConnectionStatus(true);
  socket.emit('select_asset', currentSymbol);
});

socket.on('disconnect', () => {
  console.log('✗ Disconnected from server');
  updateConnectionStatus(false);
});

function updateConnectionStatus(connected) {
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.querySelector('.connection-status span:last-child');
  if (connected) {
    statusDot.classList.add('pulse');
    statusText.textContent = 'Live Stream';
  } else {
    statusDot.classList.remove('pulse');
    statusText.textContent = 'Disconnected';
  }
}

socket.on('available_assets', (assets) => {
  availableAssets = assets;
  renderAssetSelector();
});

socket.on('whale_categories', (categories) => {
  whaleCategories = categories;
  console.log('📊 Whale categories loaded:', categories);
});

function renderAssetSelector() {
  const selector = document.getElementById('assetSelector');
  selector.innerHTML = availableAssets.map(asset =>
    `<option value="${asset}" ${asset === currentSymbol ? 'selected' : ''}>${asset.replace('USDT', '')}</option>`
  ).join('');
}

function switchAsset(symbol) {
  currentSymbol = symbol;
  console.log('🔄 Switching to:', symbol);
  socket.emit('select_asset', symbol);

  document.getElementById('tickerLabel').textContent = symbol;

  allTrades = [];
  lastPrice = 0;
  document.getElementById('historyBody').innerHTML = '';
  clearWhaleAlerts();

  document.getElementById('tickerPrice').textContent = '$0.00';
  document.getElementById('tickerChange').textContent = '0.00%';
  document.getElementById('tickerChange').className = 'ticker-change';

  // Reset AI predictions
  resetAIPredictions();
}

socket.on('asset_info', info => {
  document.getElementById('assetLogo').src = info.logo;
  document.getElementById('assetSymbol').textContent = info.symbol;
  document.title = `${info.symbol} Whale Watcher | Real-Time`;
  console.log('✓ Asset info loaded:', info.name);
});

socket.on('trade_update', trade => {
  if (trade.symbol !== currentSymbol.replace('USDT', '')) return;

  allTrades.push(trade);
  const newPrice = trade.price;

  document.getElementById('tickerPrice').textContent = '$' + newPrice.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (lastPrice > 0) {
    const change = ((newPrice - lastPrice) / lastPrice) * 100;
    const changeEl = document.getElementById('tickerChange');
    changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
    changeEl.className = 'ticker-change ' + (change >= 0 ? 'positive' : 'negative');

    const priceEl = document.getElementById('tickerPrice');
    priceEl.classList.remove('flash-green', 'flash-red');
    void priceEl.offsetWidth;
    priceEl.classList.add(change >= 0 ? 'flash-green' : 'flash-red');
  }

  lastPrice = newPrice;

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${new Date(trade.timestamp).toLocaleTimeString()}</td>
    <td class="${trade.isWhale ? 'whale-trade' : ''}">${trade.quantity.toFixed(4)}</td>
    <td>${trade.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
  `;

  const tbody = document.getElementById('historyBody');
  tbody.insertBefore(row, tbody.firstChild);
  while (tbody.children.length > 50) tbody.removeChild(tbody.lastChild);
});

socket.on('whale_alert', (whale) => {
  if (whale.symbol !== currentSymbol.replace('USDT', '')) return;

  console.log('🐋 WHALE ALERT:', whale.categoryLabel, '$' + whale.tradeValue.toLocaleString());

  playWhaleSound(whale.category);
  addWhaleAlert(whale);
  showWhaleNotification(whale);

  // Update AI predictions if available
  if (whale.aiAnalysis) {
    updateAIPredictions(whale.aiAnalysis);
  }
});

// Handle AI prediction updates
socket.on('ai_prediction', (data) => {
  if (data.symbol !== currentSymbol.replace('USDT', '')) return;
  updateAIPredictions(data.analysis);
});

function showWhaleNotification(whale) {
  const banner = document.createElement('div');
  banner.className = 'whale-notification blink';
  banner.style.backgroundColor = whale.categoryColor;
  banner.innerHTML = `
    <span class="whale-icon">🐋</span>
    <span class="whale-text">${whale.categoryLabel} Detected!</span>
    <span class="whale-amount">$${whale.tradeValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
  `;

  document.body.appendChild(banner);

  setTimeout(() => {
    banner.classList.add('fade-out');
    setTimeout(() => banner.remove(), 500);
  }, 5000);
}

socket.on('metrics_update', (data) => {
  if (data.symbol !== currentSymbol.replace('USDT', '')) return;

  const m = data.metrics;
  document.getElementById('high1h').textContent = '$' + m.high1h.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  document.getElementById('low1h').textContent = '$' + m.low1h.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  document.getElementById('volume1h').textContent = m.volume1h.toFixed(2) + " " + currentSymbol.replace('USDT', '');
  document.getElementById('whaleCount').textContent = m.whaleCount;
  document.getElementById('maxWhale').textContent = "$" + Math.round(m.maxWhaleAmount).toLocaleString();

  const pressureEl = document.getElementById('whalePressure');
  pressureEl.textContent = m.whalePressure;
  pressureEl.className = 'pressure-badge ' + m.whalePressure.toLowerCase();
});

socket.on('chart_data', (data) => {
  let candles = data;
  if (data.candles) {
    if (data.symbol !== currentSymbol.replace('USDT', '')) return;
    candles = data.candles;
  }

  if (!candles || candles.length === 0) return;

  const candleData = candles.map(d => ({
    time: d.time,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close
  }));

  const volumeData = candles.map(d => ({
    time: d.time,
    value: d.volume,
    color: d.close >= d.open ? 'rgba(14, 203, 129, 0.5)' : 'rgba(246, 70, 93, 0.5)'
  }));

  candleSeries.setData(candleData);
  volSeries.setData(volumeData);

  if (candles.length >= 99) {
    const ma7Data = calculateMA(candles, 7);
    const ma25Data = calculateMA(candles, 25);
    const ma99Data = calculateMA(candles, 99);

    ma7Series.setData(ma7Data);
    ma25Series.setData(ma25Data);
    ma99Series.setData(ma99Data);
  }

  analyticsSeries.setData(candles.map(d => ({ time: d.time, value: d.close })));

  if (candles.length >= 20) {
    const prices = candles.map(d => d.close);

    const sma = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    document.getElementById('smaValue').textContent = '$' + sma.toFixed(2);

    const ema = calculateEMA(prices, 12);
    document.getElementById('emaValue').textContent = '$' + ema.toFixed(2);

    const rsi = calculateRSI(prices, 14);
    document.getElementById('rsiValue').textContent = rsi.toFixed(2);

    const rsiEl = document.getElementById('rsiValue');
    if (rsi > 70) rsiEl.style.color = '#f6465d';
    else if (rsi < 30) rsiEl.style.color = '#0ecb81';
    else rsiEl.style.color = '#f7931a';
  }
});

function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;

  let gains = 0, losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Whale Alert Management
let whaleAlerts = [];

function addWhaleAlert(trade) {
  whaleAlerts.unshift({
    time: trade.timestamp,
    quantity: trade.quantity,
    value: trade.tradeValue,
    price: trade.price,
    category: trade.category,
    categoryColor: trade.categoryColor,
    categoryLabel: trade.categoryLabel
  });

  if (whaleAlerts.length > 100) whaleAlerts = whaleAlerts.slice(0, 100);
  updateWhaleGroups();
}

function clearWhaleAlerts() {
  whaleAlerts = [];
  updateWhaleGroups();
}

function updateWhaleGroups() {
  const now = Date.now();
  const whales5min = whaleAlerts.filter(w => now - w.time < 5 * 60 * 1000);
  const whales10min = whaleAlerts.filter(w => now - w.time < 10 * 60 * 1000);
  const whales15min = whaleAlerts.filter(w => now - w.time < 15 * 60 * 1000);

  updateWhaleSection('alerts5min', whales5min.slice(0, 5));
  document.getElementById('count5min').textContent = whales5min.length;

  updateWhaleSection('alerts10min', whales10min.slice(0, 5));
  document.getElementById('count10min').textContent = whales10min.length;

  updateWhaleSection('alerts15min', whales15min.slice(0, 5));
  document.getElementById('count15min').textContent = whales15min.length;
}

function updateWhaleSection(containerId, alerts) {
  const container = document.getElementById(containerId);

  if (alerts.length === 0) {
    container.innerHTML = '<div class="no-alerts">No whale activity</div>';
    return;
  }

  container.innerHTML = alerts.map(alert => `
    <div class="alert-item" style="border-left-color: ${alert.categoryColor}">
      <div class="alert-header">
        <span class="alert-category" style="color: ${alert.categoryColor}">${alert.categoryLabel}</span>
        <span class="alert-time">${new Date(alert.time).toLocaleTimeString()}</span>
      </div>
      <div class="alert-amount">${alert.quantity.toFixed(2)} ${currentSymbol.replace('USDT', '')}</div>
      <div class="alert-value" style="color: ${alert.categoryColor}">$${alert.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
    </div>
  `).join('');
}

// AI Predictions Display Functions
function resetAIPredictions() {
  document.getElementById('aiStatusText').textContent = 'Analyzing...';
  document.getElementById('aiWhaleType').textContent = 'Unknown';
  document.getElementById('aiWhaleDesc').textContent = 'Waiting for data...';
  document.getElementById('aiWhaleBehavior').textContent = 'NEUTRAL';
  document.getElementById('aiWhaleBehavior').className = 'ai-badge neutral';
  document.getElementById('aiWhaleConfidence').textContent = 'Confidence: 0%';
  document.getElementById('aiPattern').textContent = 'Normal Activity';
  document.getElementById('aiPatternDesc').textContent = 'Standard patterns';
  document.getElementById('aiRecommendation').textContent = 'HOLD';
  document.getElementById('aiRecommendation').className = 'ai-badge-large hold';
  document.getElementById('aiRecommendationReason').textContent = 'No clear signals';
  document.getElementById('aiConfidenceFill').style.width = '0%';
  document.getElementById('aiConfidenceText').textContent = '0%';
  document.getElementById('aiRiskLevel').textContent = 'Risk: MEDIUM';
  document.getElementById('aiNextWhale').textContent = 'Unknown';
  document.getElementById('aiNextWhaleProb').textContent = 'Probability: 0%';
  document.getElementById('aiSentiment').textContent = 'NEUTRAL';
  document.getElementById('aiSentiment').className = 'ai-badge sentiment-neutral';
  document.getElementById('aiSentimentScore').textContent = 'Score: 50/100';
  document.getElementById('aiPriceImpact').textContent = 'MINIMAL';
  document.getElementById('aiPriceMove').textContent = 'Expected: $0.00';
}

function updateAIPredictions(analysis) {
  console.log('🤖 AI Analysis:', analysis);

  // Update status
  document.getElementById('aiStatusText').textContent = 'Active';

  // Whale Type
  document.getElementById('aiWhaleType').textContent = analysis.whaleType.type;
  document.getElementById('aiWhaleType').style.color = analysis.whaleType.color;
  document.getElementById('aiWhaleDesc').textContent = analysis.whaleType.description;

  // Whale Behavior
  const behaviorEl = document.getElementById('aiWhaleBehavior');
  behaviorEl.textContent = analysis.whaleType.behavior;
  behaviorEl.className = 'ai-badge ' + analysis.whaleType.behavior.toLowerCase();
  behaviorEl.style.borderColor = analysis.whaleType.color;
  behaviorEl.style.color = analysis.whaleType.color;
  document.getElementById('aiWhaleConfidence').textContent =
    `Confidence: ${analysis.whaleType.confidence}%`;

  // Pattern
  document.getElementById('aiPattern').textContent = analysis.pattern.name;
  document.getElementById('aiPatternDesc').textContent =
    analysis.pattern.implication || analysis.pattern.description;

  // Recommendation
  const recEl = document.getElementById('aiRecommendation');
  recEl.textContent = analysis.recommendation.action;
  recEl.className = 'ai-badge-large ' + analysis.recommendation.action.toLowerCase();
  document.getElementById('aiRecommendationReason').textContent =
    analysis.recommendation.reasoning;

  // Confidence
  const confidence = analysis.recommendation.confidence;
  const confidenceFill = document.getElementById('aiConfidenceFill');
  const confidenceText = document.getElementById('aiConfidenceText');
  confidenceFill.style.width = confidence + '%';
  confidenceText.textContent = confidence + '%';

  // Dynamic color coding based on confidence level
  if (confidence >= 85) {
    confidenceFill.style.background = 'linear-gradient(90deg, #0ecb81 0%, #26d97f 100%)';
  } else if (confidence >= 70) {
    confidenceFill.style.background = 'linear-gradient(90deg, #26d97f 0%, #f7931a 100%)';
  } else if (confidence >= 50) {
    confidenceFill.style.background = 'linear-gradient(90deg, #f7931a 0%, #ff6b35 100%)';
  } else {
    confidenceFill.style.background = 'linear-gradient(90deg, #ff6b35 0%, #f6465d 100%)';
  }

  document.getElementById('aiRiskLevel').textContent =
    `Risk: ${analysis.recommendation.riskLevel}`;

  // Add visual indicator for confidence level
  const riskEl = document.getElementById('aiRiskLevel');
  if (confidence >= 80) {
    riskEl.style.color = '#0ecb81';
  } else if (confidence >= 60) {
    riskEl.style.color = '#f7931a';
  } else {
    riskEl.style.color = '#f6465d';
  }

  // Next Whale Prediction
  const nextWhale = analysis.nextWhaleTiming;
  document.getElementById('aiNextWhale').textContent = nextWhale.timeframe;
  document.getElementById('aiNextWhaleProb').textContent =
    `Probability: ${nextWhale.probability}%`;

  // Sentiment
  const sentiment = analysis.sentiment;
  const sentimentEl = document.getElementById('aiSentiment');
  sentimentEl.textContent = sentiment.sentiment;
  sentimentEl.className = 'ai-badge sentiment-' +
    sentiment.sentiment.toLowerCase().replace(/ /g, '-');
  document.getElementById('aiSentimentScore').textContent =
    `Score: ${sentiment.score}/100`;

  // Price Impact
  const impact = analysis.priceImpact;
  document.getElementById('aiPriceImpact').textContent = impact.type;
  document.getElementById('aiPriceMove').textContent =
    `Expected: $${impact.estimatedMove}`;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  resetAIPredictions();
  console.log('🐋 Multi-Currency Whale Watcher Initialized');

  document.getElementById('assetSelector').addEventListener('change', (e) => {
    switchAsset(e.target.value);
  });

  setInterval(updateWhaleGroups, 20000);
});