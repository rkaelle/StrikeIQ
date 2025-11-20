# 🚀 StrikeIQ Feature Roadmap & Implementation Plan

This document outlines the comprehensive plan for implementing the requested features and improvements.

---

## ✅ **COMPLETED**

### 1. **Mobile Performance Tab Fix** (DONE)
- **Issue**: "The data couldn't be read because it isn't in the correct format"
- **Fix**: Updated metrics API to return consistently formatted strings
- **Status**: ✅ Pushed to branch (commit: 2f5b5b3)
- **Impact**: Performance tab should now load without errors on iOS

---

## 🔧 **IN PROGRESS**

### 2. **SPY/QQQ/VIX/DIA Live Market Data** (STARTED)
- **Issue**: Hardcoded values in mobile app (VIX showing $129.13, DIA $461.76)
- **Root Cause**: `MarketOverviewBar` in iOS has static values
- **Solution Needed**:
  1. Create `MarketOverviewViewModel` to fetch live data
  2. Update iOS `ContentView.swift` to use live API data
  3. Ensure backend `/api/market/quote/:ticker` works for indices
  4. Add caching to reduce API calls (refresh every 30 seconds)
- **Files to Modify**:
  - `ios/StrikeIQ/Views/ContentView.swift` (lines 165-168)
  - `ios/StrikeIQ/ViewModels/MarketOverviewViewModel.swift` (create new)
- **Status**: 🔄 50% complete (backend working, iOS needs update)

---

## 📋 **PLANNED FEATURES** (Priority Order)

### 3. **Signal Activation System** (HIGH PRIORITY)
**Description**: Users manually select which signals to activate/watch

**Current Behavior**:
- All signals appear automatically
- No user control over which signals to track

**New Behavior**:
- Signals list shows ALL generated signals
- User can "activate" signals they want to watch
- Only activated signals appear in watchlist
- Deactivated signals remain in history

**Database Changes**:
```prisma
model UserSignalActivation {
  id        String   @id @default(uuid())
  userId    String
  signalId  String
  activated Boolean  @default(false)
  activatedAt DateTime?
  deactivatedAt DateTime?

  user   User   @relation(fields: [userId], references: [id])
  signal Signal @relation(fields: [signalId], references: [id])

  @@unique([userId, signalId])
}
```

**API Endpoints**:
- `POST /api/signals/:id/activate` - Activate a signal
- `POST /api/signals/:id/deactivate` - Deactivate a signal
- `GET /api/signals/active` - Get user's activated signals only

**UI Changes**:
- Web: Add "Activate" button on each signal card
- iOS: Add toggle/checkmark on signal rows
- Watchlist: Only show activated signals

**Estimated Time**: 8-12 hours

---

### 4. **Platform-Wide Backtesting** (HIGH PRIORITY)
**Description**: Backtest signal engine against historical market data

**Components**:

**A. Historical Data Collection**:
- Store 1-year+ of OHLCV data for all tracked tickers
- Store historical options flow data
- Store historical VIX data

**B. Backtest Engine**:
```typescript
interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  positionSize: number;  // % of capital per trade
  maxConcurrentTrades: number;
}

interface BacktestResult {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  bySignalType: Record<string, BacktestMetrics>;
  equityCurve: Array<{date: Date, equity: number}>;
}
```

**C. Implementation Steps**:
1. Create `backend/src/services/backtesting/`
   - `dataLoader.ts` - Load historical data
   - `backtestEngine.ts` - Run simulations
   - `metrics.ts` - Calculate performance metrics
2. Add `/api/backtest` endpoints
3. Create backtest dashboard (web + mobile)

**Database Tables**:
```prisma
model BacktestRun {
  id            String   @id @default(uuid())
  name          String
  startDate     DateTime
  endDate       DateTime
  initialCapital Float
  config        Json     // BacktestConfig
  results       Json     // BacktestResult
  createdAt     DateTime @default(now())
}
```

**Estimated Time**: 40-60 hours

---

### 5. **Sector Analysis & Portfolio Split** (MEDIUM PRIORITY)
**Description**: Show portfolio breakdown by sector

**Features**:
- Pie chart of portfolio by sector (Tech, Finance, Healthcare, etc.)
- Table showing P&L by sector
- Best/worst performing sectors
- Sector exposure warnings (over-concentrated)

**Sector Mapping**:
```typescript
const SECTOR_MAP = {
  'AAPL': 'Technology',
  'MSFT': 'Technology',
  'GOOGL': 'Technology',
  'JPM': 'Financials',
  'BAC': 'Financials',
  'UNH': 'Healthcare',
  // ... etc
};
```

**Database Changes**:
```prisma
model Stock {
  ticker String @id
  name   String
  sector String
}
```

**UI Components**:
- Sector allocation chart (pie/donut chart)
- Sector performance table
- Sector exposure meter
- Add to Portfolio tab (both web + iOS)

**Estimated Time**: 12-16 hours

---

### 6. **Watchlist Categorization** (MEDIUM PRIORITY)
**Description**: Organize watchlist into folders/categories

**Features**:
- Create custom folders (e.g., "Tech Plays", "Earnings This Week")
- Pre-defined categories by sector
- Drag-and-drop to organize (web)
- Multi-select bulk actions

**Database Changes**:
```prisma
model WatchlistFolder {
  id     String @id @default(uuid())
  userId String
  name   String
  color  String? // Optional color coding
  order  Int     // Display order

  user  User @relation(fields: [userId], references: [id])
  items WatchlistItem[]
}

model WatchlistItem {
  // Add folderId
  folderId String?
  folder   WatchlistFolder? @relation(fields: [folderId], references: [id])
}
```

**API Endpoints**:
- `POST /api/watchlist/folders` - Create folder
- `PUT /api/watchlist/folders/:id` - Update folder
- `DELETE /api/watchlist/folders/:id` - Delete folder
- `POST /api/watchlist/:id/move` - Move item to folder

**UI**:
- Web: Sidebar with folder tree
- iOS: Sections with folder headers

**Estimated Time**: 16-20 hours (8-10 per platform)

---

### 7. **Beginner-Friendly Onboarding** (HIGH PRIORITY)
**Description**: Interactive tutorial for new users

**Onboarding Flow**:

**Step 1: Welcome**
```
"Welcome to StrikeIQ!
Professional-grade 0DTE options signals powered by AI."

[Get Started]
```

**Step 2: How It Works**
```
"Our 5-Pillar System analyzes:
✓ Trend State
✓ Institutional Flow
✓ Volatility Conditions
✓ Liquidity
✓ Market Correlation"

[Next]
```

**Step 3: Signal Types**
```
"Signal Types:
• 0DTE: Same-day expiration (high precision)
• WEEKLY: Multi-day plays (more time)
• DARK POOL: Large institutional activity
• NEWS: Catalyst-driven moves"

[Next]
```

**Step 4: How to Use Signals**
```
"Using Signals:
1. Browse signals on the Signals tab
2. Tap 'Activate' to watch a signal
3. Enter trades in your brokerage
4. Log trades in StrikeIQ to track performance"

[Start Trading]
```

**Implementation**:
- Create `OnboardingView.swift` (iOS)
- Create `OnboardingFlow.tsx` (web)
- Store completion state in User model
- Add "Show Tutorial Again" in settings

**Estimated Time**: 8-12 hours

---

### 8. **Backtesting in Performance Tab** (HIGH PRIORITY)
**Description**: Show platform backtesting alongside user performance

**Layout**:
```
┌─────────────────────────────────────┐
│   Platform Performance (Backtest)   │
│   ─────────────────────────────────  │
│   Win Rate: 68.5%                   │
│   Avg Return: +12.3%                │
│   Max Drawdown: -8.2%               │
│   Sharpe Ratio: 1.85                │
│   ─────────────────────────────────  │
│   [View Full Backtest Report]       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Your Performance                  │
│   ─────────────────────────────────  │
│   Win Rate: 72.0%                   │
│   Total P&L: +$1,234.56             │
│   Active Trades: 3                  │
│   ─────────────────────────────────  │
│   [View Details]                    │
└─────────────────────────────────────┘
```

**Features**:
- Toggle between platform vs personal view
- Compare user performance to platform benchmark
- Show equity curves for both
- Highlight areas where user outperforms

**API Endpoints**:
- `GET /api/backtest/latest` - Get latest backtest results
- `GET /api/backtest/:id` - Get specific backtest
- `GET /api/metrics/compare?userId=:id` - Compare user to platform

**Estimated Time**: 16-20 hours (depends on backtest engine completion)

---

### 9. **Browser Extension** (MEDIUM PRIORITY)
**Description**: Minimalist Chrome/Firefox extension

**Features**:
- Popup shows active signals
- Real-time signal notifications
- Quick signal activation
- Market overview (SPY/QQQ/VIX/DIA)
- Link to full web app

**Tech Stack**:
- Manifest V3 (Chrome/Edge/Brave)
- Manifest V2 (Firefox)
- Shared codebase with web app (React)

**Structure**:
```
extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.tsx
│   └── popup.css
├── background.js
├── content.js
└── assets/
```

**Features**:
- Badge shows count of new signals
- Desktop notifications for high-confidence signals
- Syncs with main app via API
- Minimal permissions required

**Distribution**:
- Chrome Web Store
- Firefox Add-ons
- Edge Add-ons

**Estimated Time**: 20-30 hours

---

### 10. **Comprehensive User Action Tracking** (HIGH PRIORITY)
**Description**: Track all user actions for cross-device continuity

**Actions to Track**:

**Database Schema**:
```prisma
model UserAction {
  id        String   @id @default(uuid())
  userId    String
  action    String   // "signal_activated", "signal_viewed", "trade_entered", etc.
  entityId  String?  // ID of signal/trade/etc
  metadata  Json?    // Additional context
  deviceType String  // "web", "ios", "android", "extension"
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
  @@index([action])
}

model UserPreferences {
  id                String   @id @default(uuid())
  userId            String   @unique
  defaultFilters    Json?    // Saved filter preferences
  notificationSettings Json?
  watchlistView     String?  // "list", "grid", "compact"
  theme             String?  // "light", "dark", "auto"

  user User @relation(fields: [userId], references: [id])
}
```

**Actions to Track**:
1. **Signal Actions**:
   - `signal_viewed`
   - `signal_activated`
   - `signal_deactivated`
   - `signal_shared`

2. **Trade Actions**:
   - `trade_entered`
   - `trade_exited`
   - `trade_updated`

3. **Watchlist Actions**:
   - `watchlist_added`
   - `watchlist_removed`
   - `watchlist_folder_created`
   - `watchlist_item_moved`

4. **UI Actions**:
   - `filter_applied`
   - `tab_switched`
   - `chart_viewed`

**Benefits**:
- Full continuity across devices
- Personalized recommendations
- Usage analytics for product improvements
- Undo/redo functionality

**Estimated Time**: 12-16 hours

---

## 📊 **SUMMARY**

### Total Estimated Time: **180-250 hours**

### Priority Breakdown:

**🔥 Critical (Do First):**
1. ✅ Mobile Performance Tab Fix (DONE)
2. 🔄 SPY/QQQ/VIX/DIA Live Data (IN PROGRESS)
3. Signal Activation System (8-12h)
4. Onboarding Flow (8-12h)
5. User Action Tracking (12-16h)

**📈 High Priority (Do Next):**
6. Platform Backtesting (40-60h)
7. Backtesting in Performance Tab (16-20h)

**⚙️ Medium Priority (Nice to Have):**
8. Sector Analysis (12-16h)
9. Watchlist Categories (16-20h per platform)
10. Browser Extension (20-30h)

---

## 🎯 **RECOMMENDED PHASED ROLLOUT**

### Phase 1 (Week 1-2): Critical Fixes
- ✅ Performance tab fix
- ✅ Live market data
- Signal activation system
- User action tracking foundation

### Phase 2 (Week 3-4): User Experience
- Onboarding flow
- Basic sector analysis
- Improved watchlist organization

### Phase 3 (Week 5-8): Advanced Features
- Backtesting engine
- Backtesting UI integration
- Advanced portfolio analytics

### Phase 4 (Week 9-10): Extensions
- Browser extension
- Enhanced categorization
- Additional platforms

---

## 📝 **NOTES**

- All features maintain the institutional-grade signal engine at their core
- Database migrations will be needed for new tables
- API versioning may be needed for breaking changes
- Comprehensive testing required for each phase
- User feedback loops should inform priorities

---

**This roadmap is a living document and will be updated as features are completed.**
