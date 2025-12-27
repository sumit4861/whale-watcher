# 🐋 Whale Watcher: Real-Time Institutional Trade Detection

An AI-powered dashboard designed to bridge the information gap between institutional "Whales" and retail investors by detecting, analyzing, and predicting the impact of large-scale cryptocurrency transactions in real-time.

---

## 1. Problem Statement
In the volatile cryptocurrency market, “Whales” (large-scale holders) influence price movements by moving massive amounts of capital to exchanges to sell. Retail investors are often at a disadvantage because they lack the high-level data tools to see these moves in real-time. By the time a price drop is visible on a standard chart, the move has already happened.

## 2. The Objective
The objective of this project is to build a real-time dashboard that highlights "signals" (massive trades) amidst market "noise". The system maintains a constant connection to exchange data to ensure retail traders can react to institutional moves as they happen.

## 3. Features & Modules

### 🛠 Real-Time Data Pipeline
* **WebSocket Integration:** Uses a functional integration with the Binance stream to pull live trade data for BTC, ETH, SOL, BNB, and XRP.
* **Live Updates:** Trades are processed instantly and broadcasted via Socket.io to the frontend.

### 🤖 AI Whale Prediction System
* **Whale Classification:** Categorizes traders into types such as "Accumulator," "Distributor," "Market Maker," or "Institutional" based on frequency and volume trends.
* **Pattern Recognition:** Detects "Coordinated Whale Activity" and "Erratic Behavior" to forecast market volatility.
* **Sentiment Analysis:** Calculates real-time market sentiment (e.g., "Very Bullish" to "Very Bearish") based on recent whale price action.

### 📊 Analytical Visualizer
* **Dynamic Charting:** Features a high-performance candlestick chart using `Lightweight Charts`.
* **Technical Indicators:** Real-time calculation of RSI (14), SMA (20), and EMA (12).
* **Rolling Window:** Plots trading volume against price over a rolling 60-minute window.

### 🔔 Automated Alert System
* **Smart Filtering:** Logic engine identifies transactions exceeding the **$500,000 USD** whale threshold.
* **Visual & Audio Notifications:** Triggers categorized banners (Small, Medium, Large, Mega) and unique audio cues based on trade size.

---

## 4. Tech Stack
* **Frontend:** HTML5, CSS3 (Custom Grid/Flexbox), JavaScript (ES6+).
* **Backend:** Node.js, Express.js.
* **Real-Time Engine:** Socket.io, WebSockets (ws).
* **Charting:** Lightweight Charts by TradingView.
* **APIs:** Binance WebSocket (Trade Streams), CoinGecko API (Asset Metadata).
* **Database:** SQLite (for historical trade logging in `whale_alerts.db`).

---

## 5. Screenshots / Demos
*<img width="1184" height="376" alt="image" src="https://github.com/user-attachments/assets/d8bfaffd-2c5b-4069-8bc4-eb7bd8816c94" />
*
> **AI Panel:** Displays the predicted Whale Type, Market Pattern, and Trade Recommendation (BUY/SELL/HOLD) with a confidence score.

*<img width="1174" height="669" alt="image" src="https://github.com/user-attachments/assets/2c736c08-9a6a-4ae6-a8d7-14a0b966dff4" />
*
> **Main Chart:** Shows the live BTCUSDT candlestick data with MA overlays and the RSI indicator.

---

## 6. Local Setup Instructions

### Prerequisites
* [Node.js](https://nodejs.org/) (v14+)
* npm

### Installation
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/whale-watcher.git](https://github.com/your-username/whale-watcher.git)
   cd whale-watcher
