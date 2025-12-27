// AI/ML Whale Prediction System
class WhaleAIPredictor {
  constructor() {
    this.whaleHistory = [];
    this.patterns = {
      accumulation: [],
      distribution: [],
      manipulation: []
    };
    this.predictions = {
      nextWhaleProbability: 0,
      priceImpact: 0,
      whaleType: 'unknown',
      confidence: 0
    };
    this.marketSentiment = 'neutral';
  }

  // Analyze whale behavior patterns
  analyzeWhalePattern(whale) {
    this.whaleHistory.push({
      timestamp: whale.timestamp,
      value: whale.tradeValue,
      price: whale.price,
      quantity: whale.quantity,
      category: whale.category
    });

    // Keep only last 100 whales
    if (this.whaleHistory.length > 100) {
      this.whaleHistory.shift();
    }

    // Detect patterns
    const pattern = this.detectPattern();
    const whaleType = this.classifyWhaleType(whale);
    const priceImpact = this.predictPriceImpact(whale);
    const nextWhaleTiming = this.predictNextWhale();

    return {
      pattern,
      whaleType,
      priceImpact,
      nextWhaleTiming,
      recommendation: this.generateRecommendation(pattern, whaleType)
    };
  }

  // Classify whale type using ML-like pattern recognition
  classifyWhaleType(whale) {
    const recentWhales = this.whaleHistory.slice(-10);

    if (recentWhales.length < 3) {
      return {
        type: 'Unknown',
        description: 'Insufficient data',
        confidence: 0
      };
    }

    // Calculate velocity (frequency)
    const timeSpan = whale.timestamp - recentWhales[0].timestamp;
    const frequency = recentWhales.length / (timeSpan / 60000); // whales per minute

    // Calculate volume trend
    const volumes = recentWhales.map(w => w.value);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volumeTrend = (whale.tradeValue - avgVolume) / avgVolume;

    // Calculate price correlation
    const prices = recentWhales.map(w => w.price);
    const priceChange = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;

    // Classification logic
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
    } else if (frequency > 0.8 && Math.abs(priceChange) > 2) {
      return {
        type: 'Market Maker',
        description: 'Providing liquidity / manipulating',
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

  // Detect market patterns
  detectPattern() {
    if (this.whaleHistory.length < 5) {
      return { name: 'Insufficient Data', confidence: 0 };
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

    // Pattern detection
    if (timeVariance < avgTimeSpan * 0.3 && recent.length > 10) {
      return {
        name: 'Coordinated Whale Activity',
        description: 'Multiple whales acting in coordination',
        confidence: 85,
        implication: 'Major market move expected'
      };
    } else if (volumeVariance > volumes[0] * 2) {
      return {
        name: 'Erratic Whale Behavior',
        description: 'Unpredictable large trades',
        confidence: 70,
        implication: 'High volatility expected'
      };
    } else if (this.isAccumulationPattern(recent)) {
      return {
        name: 'Accumulation Phase',
        description: 'Steady buying pressure from whales',
        confidence: 80,
        implication: 'Price likely to increase'
      };
    } else if (this.isDistributionPattern(recent)) {
      return {
        name: 'Distribution Phase',
        description: 'Whales selling into strength',
        confidence: 80,
        implication: 'Price likely to decrease'
      };
    } else {
      return {
        name: 'Normal Activity',
        description: 'Standard whale trading patterns',
        confidence: 60,
        implication: 'No major moves expected'
      };
    }
  }

  // Predict price impact
  predictPriceImpact(whale) {
    const marketCap = whale.price * 19000000; // Approximate BTC market cap
    const tradePercentage = (whale.tradeValue / marketCap) * 100;

    let impactPercentage = tradePercentage * 50; // Amplification factor
    let impactType = 'MINIMAL';
    let confidence = 0;

    if (impactPercentage > 1.0) {
      impactType = 'SEVERE';
      confidence = 90;
    } else if (impactPercentage > 0.5) {
      impactType = 'MAJOR';
      confidence = 85;
    } else if (impactPercentage > 0.1) {
      impactType = 'MODERATE';
      confidence = 75;
    } else if (impactPercentage > 0.01) {
      impactType = 'MINOR';
      confidence = 65;
    } else {
      impactType = 'MINIMAL';
      confidence = 50;
    }

    return {
      percentage: impactPercentage.toFixed(4),
      type: impactType,
      confidence,
      estimatedMove: `${(whale.price * impactPercentage / 100).toFixed(2)} USD`
    };
  }

  // Predict next whale activity
  predictNextWhale() {
    if (this.whaleHistory.length < 5) {
      return { probability: 0, timeframe: 'Unknown' };
    }

    const recent = this.whaleHistory.slice(-10);
    const timeGaps = [];

    for (let i = 1; i < recent.length; i++) {
      timeGaps.push(recent[i].timestamp - recent[i - 1].timestamp);
    }

    const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
    const lastWhaleTime = recent[recent.length - 1].timestamp;
    const timeSinceLastWhale = Date.now() - lastWhaleTime;

    const probability = Math.min(100, (timeSinceLastWhale / avgGap) * 100);
    const expectedTime = avgGap - timeSinceLastWhale;

    let timeframe;
    if (expectedTime < 0) {
      timeframe = 'Overdue';
    } else if (expectedTime < 60000) {
      timeframe = `${Math.round(expectedTime / 1000)}s`;
    } else if (expectedTime < 3600000) {
      timeframe = `${Math.round(expectedTime / 60000)}m`;
    } else {
      timeframe = `${Math.round(expectedTime / 3600000)}h`;
    }

    return {
      probability: Math.round(probability),
      timeframe,
      confidence: 70
    };
  }

  // Generate trading recommendation
  generateRecommendation(pattern, whaleType) {
    let action = 'HOLD';
    let reasoning = '';
    let confidence = 0;

    if (whaleType.behavior === 'BULLISH' && pattern.name === 'Accumulation Phase') {
      action = 'BUY';
      reasoning = 'Whales accumulating + accumulation pattern detected';
      confidence = 85;
    } else if (whaleType.behavior === 'BEARISH' && pattern.name === 'Distribution Phase') {
      action = 'SELL';
      reasoning = 'Whales distributing + distribution pattern detected';
      confidence = 85;
    } else if (pattern.name === 'Coordinated Whale Activity') {
      action = 'WAIT';
      reasoning = 'Coordinated whale activity - wait for direction';
      confidence = 70;
    } else if (whaleType.type === 'Market Maker') {
      action = 'HOLD';
      reasoning = 'Market maker activity - avoid chasing';
      confidence = 65;
    } else {
      action = 'HOLD';
      reasoning = 'No clear signals from whale activity';
      confidence = 50;
    }

    return {
      action,
      reasoning,
      confidence,
      riskLevel: this.assessRisk(pattern, whaleType)
    };
  }

  // Helper functions
  calculateVariance(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  isAccumulationPattern(whales) {
    if (whales.length < 5) return false;
    const volumes = whales.map(w => w.value);
    let increasing = 0;
    for (let i = 1; i < volumes.length; i++) {
      if (volumes[i] > volumes[i - 1]) increasing++;
    }
    return increasing / volumes.length > 0.6;
  }

  isDistributionPattern(whales) {
    if (whales.length < 5) return false;
    const volumes = whales.map(w => w.value);
    let decreasing = 0;
    for (let i = 1; i < volumes.length; i++) {
      if (volumes[i] < volumes[i - 1]) decreasing++;
    }
    return decreasing / volumes.length > 0.6;
  }

  assessRisk(pattern, whaleType) {
    if (pattern.name === 'Erratic Whale Behavior') return 'HIGH';
    if (whaleType.type === 'Market Maker') return 'MEDIUM';
    if (pattern.name === 'Coordinated Whale Activity') return 'MEDIUM';
    return 'LOW';
  }

  // Calculate market sentiment
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
    let sentiment;

    if (sentimentScore > 70) sentiment = 'VERY BULLISH';
    else if (sentimentScore > 55) sentiment = 'BULLISH';
    else if (sentimentScore > 45) sentiment = 'NEUTRAL';
    else if (sentimentScore > 30) sentiment = 'BEARISH';
    else sentiment = 'VERY BEARISH';

    return { sentiment, score: Math.round(sentimentScore) };
  }
}

module.exports = WhaleAIPredictor;