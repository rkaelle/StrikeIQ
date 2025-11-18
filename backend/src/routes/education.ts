import { Router } from 'express';

const router = Router();

// Educational content
const educationContent = {
  basics: {
    title: 'Options Trading Basics',
    sections: [
      {
        id: 'what-are-options',
        title: 'What Are Options?',
        content: `Options are financial derivatives that give buyers the right, but not the obligation, to buy or sell an underlying asset at a specified price within a specific time period.

**Call Options**: Give the holder the right to BUY the underlying asset
**Put Options**: Give the holder the right to SELL the underlying asset

Key Terms:
- Strike Price: The price at which you can buy/sell the asset
- Premium: The price you pay for the option
- Expiration: When the option expires
- In-the-money (ITM): Option has intrinsic value
- Out-of-the-money (OTM): Option has no intrinsic value
- At-the-money (ATM): Strike price equals current stock price`
      },
      {
        id: 'why-trade-options',
        title: 'Why Trade Options?',
        content: `Options offer several advantages over trading stocks:

1. **Leverage**: Control more shares with less capital
2. **Limited Risk**: Maximum loss is the premium paid (for buyers)
3. **Flexibility**: Profit in any market direction
4. **Income Generation**: Sell options to collect premium
5. **Hedging**: Protect existing positions

However, options come with risks:
- Time decay works against buyers
- Complexity requires education
- Leverage can amplify losses
- Liquidity varies by strike/expiration`
      }
    ]
  },
  greeks: {
    title: 'Understanding the Greeks',
    sections: [
      {
        id: 'delta',
        title: 'Delta (Δ)',
        content: `Delta measures how much an option's price changes for a $1 move in the underlying.

- Call delta: 0 to 1.0
- Put delta: -1.0 to 0
- ATM options: ~0.50 delta

**Practical Use**:
- Probability proxy: 0.30 delta ≈ 30% chance of expiring ITM
- Hedge ratio: 100 shares = delta of 1.0
- Direction indicator: Higher delta = more directional exposure`
      },
      {
        id: 'gamma',
        title: 'Gamma (Γ)',
        content: `Gamma measures the rate of change in delta for a $1 move in the underlying.

- Highest at ATM options
- Increases as expiration approaches
- Always positive for long options

**Practical Use**:
- Risk indicator: High gamma = rapid delta changes
- 0DTE caution: Gamma explodes near expiration
- Position management: Monitor gamma risk closely`
      },
      {
        id: 'theta',
        title: 'Theta (Θ)',
        content: `Theta measures time decay - how much value an option loses daily.

- Always negative for long options
- Accelerates near expiration
- Higher for ATM options

**Practical Use**:
- Buying: Theta works against you
- Selling: Theta works for you
- Strategy selection: Consider time horizon vs theta cost`
      },
      {
        id: 'vega',
        title: 'Vega (V)',
        content: `Vega measures sensitivity to implied volatility changes.

- Higher for longer-dated options
- Highest at ATM strikes
- Positive for long options

**Practical Use**:
- IV expansion: Benefits long options
- IV crush: Hurts long options (post-earnings)
- Strategy: Buy low IV, sell high IV`
      }
    ]
  },
  psychology: {
    title: 'Trading Psychology',
    sections: [
      {
        id: 'emotional-control',
        title: 'Emotional Control',
        content: `The most important aspect of trading is managing emotions:

**Common Emotional Pitfalls**:
- FOMO (Fear of Missing Out)
- Revenge trading after losses
- Overconfidence after wins
- Paralysis from fear
- Greed holding winners too long

**Solutions**:
1. Follow your trading plan religiously
2. Use stop losses consistently
3. Take breaks after losses
4. Journal your trades and emotions
5. Accept that losses are part of trading`
      },
      {
        id: 'discipline',
        title: 'Trading Discipline',
        content: `Discipline separates profitable traders from the rest:

**Key Disciplines**:
1. **Position Sizing**: Never risk more than 1-3% per trade
2. **Entry Rules**: Only enter trades that meet all criteria
3. **Exit Rules**: Honor your stops and targets
4. **Daily Limits**: Stop trading after X losses
5. **Review Process**: Analyze all trades weekly

Remember: It's not about being right, it's about managing risk.`
      }
    ]
  },
  riskManagement: {
    title: 'Risk Management',
    sections: [
      {
        id: 'position-sizing',
        title: 'Position Sizing',
        content: `Proper position sizing protects your account:

**The 1-2% Rule**:
Never risk more than 1-2% of your account on a single trade.

Example:
- Account: $10,000
- Max risk: $100-200 per trade
- If stop loss = 50% of position, max position = $200-400

**Scaling**:
- Start small with new strategies
- Increase size only with consistent results
- Reduce size during drawdowns`
      },
      {
        id: 'stop-losses',
        title: 'Stop Loss Strategies',
        content: `Stop losses are non-negotiable for options:

**Types of Stops**:
1. **Percentage Stop**: Exit at 50% loss
2. **Time Stop**: Exit if no move by date
3. **Technical Stop**: Exit on pattern break
4. **Volatility Stop**: Wider stops in high IV

**StrikeIQ Recommendations**:
- 0DTE: 30-50% stops
- Weekly: 40-60% stops
- Monthly: 50-70% stops

Never remove a stop once placed!`
      },
      {
        id: 'diversification',
        title: 'Diversification',
        content: `Don't put all eggs in one basket:

**Diversify Across**:
- Tickers (avoid 100% in one stock)
- Sectors (spread across industries)
- Strategies (mix directional/neutral)
- Timeframes (0DTE to monthly)

**Portfolio Rules**:
- Max 25% in single ticker
- Max 50% in single sector
- Always have some hedges
- Keep cash reserve (30%+)`
      }
    ]
  },
  signalTypes: {
    title: 'Understanding Signal Types',
    sections: [
      {
        id: '0dte-signals',
        title: '0DTE Signals',
        content: `Same-day expiration options for experienced traders.

**Characteristics**:
- Highest gamma exposure
- Rapid price movements
- Maximum time decay
- Requires active management

**Best Practices**:
- Smaller position sizes
- Tight stops (30-50%)
- Quick profit taking
- Only during high volume hours`
      },
      {
        id: 'weekly-signals',
        title: 'Weekly Signals',
        content: `Options expiring within 1-5 days.

**Characteristics**:
- Balanced risk/reward
- Moderate theta decay
- Good for swing trades
- Most popular timeframe

**Best Practices**:
- Standard position sizing
- Technical-based entries
- Follow trend direction
- Use support/resistance levels`
      },
      {
        id: 'earnings-signals',
        title: 'Earnings Signals',
        content: `Plays around quarterly earnings reports.

**Characteristics**:
- High IV environment
- Binary event outcome
- IV crush post-earnings
- Larger potential moves

**Best Practices**:
- Understand IV crush
- Consider spreads to reduce cost
- Position for expected move
- Have clear thesis (beat/miss)`
      },
      {
        id: 'darkpool-signals',
        title: 'Dark Pool Signals',
        content: `Institutional activity on private exchanges.

**Characteristics**:
- Large block trades
- Smart money indication
- Often precedes moves
- Requires interpretation

**Best Practices**:
- Confirm with technicals
- Look for volume confirmation
- Consider timing carefully
- Use as supporting evidence`
      }
    ]
  },
  quotes: {
    title: 'Trading Wisdom',
    quotes: [
      {
        text: "The goal of a successful trader is to make the best trades. Money is secondary.",
        author: "Alexander Elder"
      },
      {
        text: "It's not whether you're right or wrong that's important, but how much money you make when you're right and how much you lose when you're wrong.",
        author: "George Soros"
      },
      {
        text: "The stock market is filled with individuals who know the price of everything, but the value of nothing.",
        author: "Philip Fisher"
      },
      {
        text: "Risk comes from not knowing what you're doing.",
        author: "Warren Buffett"
      },
      {
        text: "The elements of good trading are: cutting losses, cutting losses, and cutting losses.",
        author: "Ed Seykota"
      },
      {
        text: "In trading, the impossible happens about twice a year.",
        author: "Henri M. Simoes"
      },
      {
        text: "The market can stay irrational longer than you can stay solvent.",
        author: "John Maynard Keynes"
      },
      {
        text: "Plan your trade and trade your plan.",
        author: "Trading Proverb"
      }
    ]
  }
};

// Get all education modules
router.get('/modules', (req, res) => {
  const modules = Object.keys(educationContent).map(key => ({
    id: key,
    title: educationContent[key as keyof typeof educationContent].title
  }));

  res.json(modules);
});

// Get specific module
router.get('/modules/:moduleId', (req, res) => {
  const { moduleId } = req.params;
  const module = educationContent[moduleId as keyof typeof educationContent];

  if (!module) {
    return res.status(404).json({ error: 'Module not found' });
  }

  res.json(module);
});

// Get trading quotes
router.get('/quotes', (req, res) => {
  res.json(educationContent.quotes);
});

// Get random quote
router.get('/quotes/random', (req, res) => {
  const quotes = educationContent.quotes.quotes;
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  res.json(randomQuote);
});

export default router;
