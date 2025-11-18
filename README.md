# StrikeIQ

AI-powered options trading signals with confidence scoring, risk management, and educational resources.

## Overview

StrikeIQ is a full-stack options trading signal application that provides:

- **Real-time trading signals** with confidence scores (0DTE, Weekly, Earnings, Dark Pool, News)
- **Risk management** with automatic entry, stop loss, and target suggestions
- **Performance tracking** for both system and user trades
- **Educational content** covering options basics, Greeks, psychology, and risk management
- **Watchlist management** for tracking signals of interest

## Project Structure

```
StrikeIQ/
├── backend/          # Node.js/Express API server
│   ├── prisma/       # Database schema and migrations
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── services/ # Business logic
│   │   │   └── analysis/  # Signal analysis modules
│   │   └── middleware/    # Auth and other middleware
│   └── package.json
├── web/              # Next.js web application
│   ├── src/
│   │   ├── app/      # Pages and layouts
│   │   ├── components/    # React components
│   │   └── store/    # Zustand state management
│   └── package.json
└── ios/              # Swift/SwiftUI iOS app
    └── StrikeIQ/
        ├── Models/   # Data models
        ├── Views/    # SwiftUI views
        ├── Stores/   # State management
        └── Services/ # API services
```

## Features

### Signal Engine
- **Flow Analysis**: Institutional options flow, sweeps, blocks
- **Technical Analysis**: RSI, MACD, Bollinger Bands, support/resistance
- **Volatility Analysis**: VIX, IV rank, IV percentile
- **Sentiment Analysis**: News sentiment, social media indicators
- **Risk Analysis**: Position sizing, Greeks calculation

### Signal Types
- **0DTE**: Same-day expiration plays with high gamma
- **Weekly**: Standard swing trade signals
- **Earnings**: Pre-earnings positioning based on flow
- **Dark Pool**: Large institutional block trades
- **News**: Breaking news catalyst plays

### Risk Management
- Automatic entry price suggestions
- Stop loss recommendations based on volatility
- Target prices with risk/reward ratios
- Risk level indicators (Low/Medium/High/Extreme)
- Visual warnings for risky trades

### Education
- Options basics module
- Greeks explained (Delta, Gamma, Theta, Vega)
- Trading psychology
- Risk management and position sizing
- Famous trading quotes for motivation

## Getting Started

### Backend Setup

```bash
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Set up database
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

### Web App Setup

```bash
cd web
npm install

# Start development server
npm run dev
```

The web app will be available at http://localhost:3000

### iOS App Setup

1. Open `ios/StrikeIQ.xcodeproj` in Xcode
2. Update the API base URL in `Services/APIService.swift`
3. Build and run on simulator or device

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://user:password@localhost:5432/strikeiq"
JWT_SECRET="your-jwt-secret"
POLYGON_API_KEY="your-polygon-api-key"
ALPHA_VANTAGE_KEY="your-alpha-vantage-key"
FINNHUB_API_KEY="your-finnhub-api-key"
NEWS_API_KEY="your-news-api-key"
PORT=3001
```

### Web (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## API Endpoints

### Signals
- `GET /api/signals` - Get all active signals
- `GET /api/signals/:id` - Get signal by ID
- `GET /api/signals/type/:type` - Get signals by type
- `GET /api/signals/history/all` - Get historical signals

### Market Data
- `GET /api/market/quote/:ticker` - Get stock quote
- `GET /api/market/options/:ticker` - Get options chain
- `GET /api/market/flow/:ticker` - Get options flow
- `GET /api/market/vix` - Get VIX data
- `GET /api/market/technicals/:ticker` - Get technical analysis
- `GET /api/market/volatility/:ticker` - Get volatility analysis
- `GET /api/market/sentiment/:ticker` - Get sentiment analysis

### User
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `PUT /api/auth/settings` - Update user settings

### Watchlist
- `GET /api/watchlist/:userId` - Get user's watchlist
- `POST /api/watchlist` - Add to watchlist
- `DELETE /api/watchlist/:id` - Remove from watchlist

### Trades
- `GET /api/trades/:userId` - Get user's trades
- `POST /api/trades` - Create trade
- `PUT /api/trades/:id/close` - Close trade

### Metrics
- `GET /api/metrics/system` - Get system performance
- `GET /api/metrics/user/:userId` - Get user performance

### Education
- `GET /api/education/modules` - Get all modules
- `GET /api/education/modules/:id` - Get module content
- `GET /api/education/quotes/random` - Get random quote

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.IO for real-time updates
- JWT authentication

### Web
- Next.js 14
- React 18
- TypeScript
- TailwindCSS
- Zustand state management
- Framer Motion animations
- Recharts + Lightweight Charts

### iOS
- Swift 5
- SwiftUI
- Combine
- Charts framework

## Disclaimer

**StrikeIQ is for educational and informational purposes only. This is NOT financial advice.**

Options trading involves substantial risk of loss and is not suitable for all investors. You could lose your entire investment. Only trade with capital you can afford to lose.

Always conduct your own research and analysis before making any trading decisions. Past performance does not guarantee future results. Consult with a qualified financial advisor before trading.

## License

MIT License - See LICENSE file for details.
