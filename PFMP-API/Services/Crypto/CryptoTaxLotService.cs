using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.Crypto;

namespace PFMP_API.Services.Crypto
{
    /// <summary>
    /// Wave 13 Phase 3: Computes FIFO tax lots for a single ExchangeConnection by replaying its
    /// CryptoTransactions in chronological order. Idempotent: clears prior lots for the connection
    /// and rebuilds from scratch on each call. Intended to run after every sync until exchanges
    /// start returning their own lot detail (Phase 3.x).
    /// </summary>
    public interface ICryptoTaxLotService
    {
        Task<CryptoTaxLotRecomputeResult> RecomputeForConnectionAsync(int exchangeConnectionId, CancellationToken cancellationToken = default);
        Task<CryptoRealizedPnLSummary> GetRealizedPnLAsync(int userId, int? year, CancellationToken cancellationToken = default);
        Task<CryptoStakingSummary> GetStakingSummaryAsync(int userId, CancellationToken cancellationToken = default);
    }

    public class CryptoTaxLotService : ICryptoTaxLotService
    {
        private static readonly TimeSpan LongTermThreshold = TimeSpan.FromDays(365);

        private readonly ApplicationDbContext _context;
        private readonly ILogger<CryptoTaxLotService> _logger;

        public CryptoTaxLotService(ApplicationDbContext context, ILogger<CryptoTaxLotService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<CryptoTaxLotRecomputeResult> RecomputeForConnectionAsync(int exchangeConnectionId, CancellationToken cancellationToken = default)
        {
            var existing = await _context.CryptoTaxLots
                .Where(l => l.ExchangeConnectionId == exchangeConnectionId)
                .ToListAsync(cancellationToken);
            if (existing.Count > 0)
            {
                _context.CryptoTaxLots.RemoveRange(existing);
            }

            var txns = await _context.CryptoTransactions
                .Where(t => t.ExchangeConnectionId == exchangeConnectionId)
                .OrderBy(t => t.ExecutedAt)
                .ThenBy(t => t.CryptoTransactionId)
                .ToListAsync(cancellationToken);

            var lotsBySymbol = new Dictionary<string, List<CryptoTaxLot>>(StringComparer.OrdinalIgnoreCase);
            int lotsOpened = 0;
            int lotsClosed = 0;

            foreach (var tx in txns)
            {
                if (string.IsNullOrWhiteSpace(tx.Symbol)) continue;

                if (IsInbound(tx.TransactionType) && tx.Quantity > 0)
                {
                    var basisPerUnit = tx.PriceUsd ?? 0m;
                    var lot = new CryptoTaxLot
                    {
                        ExchangeConnectionId = exchangeConnectionId,
                        SourceTransactionId = tx.CryptoTransactionId,
                        Symbol = tx.Symbol,
                        AcquiredAt = tx.ExecutedAt,
                        OriginalQuantity = tx.Quantity,
                        RemainingQuantity = tx.Quantity,
                        CostBasisUsdPerUnit = basisPerUnit,
                        IsRewardLot = tx.TransactionType is CryptoTransactionType.StakingReward or CryptoTransactionType.EarnInterest,
                        IsClosed = false,
                        DateCreated = DateTime.UtcNow,
                        DateUpdated = DateTime.UtcNow
                    };
                    _context.CryptoTaxLots.Add(lot);
                    if (!lotsBySymbol.TryGetValue(tx.Symbol, out var list))
                    {
                        list = new List<CryptoTaxLot>();
                        lotsBySymbol[tx.Symbol] = list;
                    }
                    list.Add(lot);
                    lotsOpened++;
                }
                else if (IsOutbound(tx.TransactionType) && tx.Quantity < 0)
                {
                    if (!lotsBySymbol.TryGetValue(tx.Symbol, out var openLots) || openLots.Count == 0)
                    {
                        // No lots to consume — could be pre-PFMP outflow. Skip gracefully.
                        continue;
                    }

                    var qtyToClose = -tx.Quantity; // positive
                    var proceedsPerUnit = tx.PriceUsd ?? 0m;
                    foreach (var lot in openLots)
                    {
                        if (qtyToClose <= 0) break;
                        if (lot.RemainingQuantity <= 0) continue;

                        var consume = Math.Min(lot.RemainingQuantity, qtyToClose);
                        var proceeds = consume * proceedsPerUnit;
                        var basis = consume * lot.CostBasisUsdPerUnit;
                        var gain = proceeds - basis;
                        var heldFor = tx.ExecutedAt - lot.AcquiredAt;
                        if (heldFor > LongTermThreshold)
                        {
                            lot.RealizedLongTermGainUsd += gain;
                        }
                        else
                        {
                            lot.RealizedShortTermGainUsd += gain;
                        }
                        lot.RealizedProceedsUsd += proceeds;
                        lot.RealizedCostBasisUsd += basis;
                        lot.RemainingQuantity -= consume;
                        lot.DateUpdated = DateTime.UtcNow;
                        if (lot.RemainingQuantity <= 0)
                        {
                            lot.IsClosed = true;
                            lot.ClosedAt = tx.ExecutedAt;
                            lotsClosed++;
                        }
                        qtyToClose -= consume;
                    }
                    // Drop fully-closed lots from the FIFO queue head for efficiency.
                    openLots.RemoveAll(l => l.RemainingQuantity <= 0);
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Recomputed {Opened} lots ({Closed} closed) for connection {Id}", lotsOpened, lotsClosed, exchangeConnectionId);
            return new CryptoTaxLotRecomputeResult { LotsOpened = lotsOpened, LotsClosed = lotsClosed };
        }

        public async Task<CryptoRealizedPnLSummary> GetRealizedPnLAsync(int userId, int? year, CancellationToken cancellationToken = default)
        {
            var query = from lot in _context.CryptoTaxLots
                        join conn in _context.ExchangeConnections on lot.ExchangeConnectionId equals conn.ExchangeConnectionId
                        where conn.UserId == userId && lot.RealizedCostBasisUsd != 0
                        select lot;
            var lots = await query.ToListAsync(cancellationToken);
            if (year.HasValue)
            {
                lots = lots.Where(l => (l.ClosedAt ?? l.DateUpdated).Year == year.Value).ToList();
            }

            var bySymbol = lots
                .GroupBy(l => l.Symbol, StringComparer.OrdinalIgnoreCase)
                .Select(g => new CryptoRealizedPnLBySymbol
                {
                    Symbol = g.Key,
                    ProceedsUsd = g.Sum(l => l.RealizedProceedsUsd),
                    CostBasisUsd = g.Sum(l => l.RealizedCostBasisUsd),
                    ShortTermGainUsd = g.Sum(l => l.RealizedShortTermGainUsd),
                    LongTermGainUsd = g.Sum(l => l.RealizedLongTermGainUsd)
                })
                .OrderByDescending(s => Math.Abs(s.ShortTermGainUsd + s.LongTermGainUsd))
                .ToList();

            return new CryptoRealizedPnLSummary
            {
                Year = year,
                TotalProceedsUsd = bySymbol.Sum(s => s.ProceedsUsd),
                TotalCostBasisUsd = bySymbol.Sum(s => s.CostBasisUsd),
                TotalShortTermGainUsd = bySymbol.Sum(s => s.ShortTermGainUsd),
                TotalLongTermGainUsd = bySymbol.Sum(s => s.LongTermGainUsd),
                BySymbol = bySymbol
            };
        }

        public async Task<CryptoStakingSummary> GetStakingSummaryAsync(int userId, CancellationToken cancellationToken = default)
        {
            var stakedHoldings = await (from h in _context.CryptoHoldings
                                        join conn in _context.ExchangeConnections on h.ExchangeConnectionId equals conn.ExchangeConnectionId
                                        where conn.UserId == userId && h.IsStaked
                                        select h).ToListAsync(cancellationToken);

            var rewardTxns = await (from tx in _context.CryptoTransactions
                                    join conn in _context.ExchangeConnections on tx.ExchangeConnectionId equals conn.ExchangeConnectionId
                                    where conn.UserId == userId
                                       && (tx.TransactionType == CryptoTransactionType.StakingReward
                                            || tx.TransactionType == CryptoTransactionType.EarnInterest)
                                    select tx).ToListAsync(cancellationToken);

            var ytd = rewardTxns.Where(t => t.ExecutedAt.Year == DateTime.UtcNow.Year).ToList();
            var ytdRewardsUsd = ytd.Sum(t => (t.PriceUsd ?? 0m) * t.Quantity);
            var totalStakedUsd = stakedHoldings.Sum(h => h.MarketValueUsd);

            decimal? weightedApy = null;
            if (totalStakedUsd > 0)
            {
                var weightedSum = stakedHoldings
                    .Where(h => h.StakingApyPercent.HasValue && h.MarketValueUsd > 0)
                    .Sum(h => h.StakingApyPercent!.Value * h.MarketValueUsd);
                var coveredValue = stakedHoldings
                    .Where(h => h.StakingApyPercent.HasValue && h.MarketValueUsd > 0)
                    .Sum(h => h.MarketValueUsd);
                if (coveredValue > 0)
                {
                    weightedApy = weightedSum / coveredValue;
                }
            }

            return new CryptoStakingSummary
            {
                TotalStakedValueUsd = totalStakedUsd,
                WeightedApyPercent = weightedApy,
                YtdRewardsUsd = ytdRewardsUsd,
                StakedAssetCount = stakedHoldings.Count,
                ByAsset = stakedHoldings
                    .OrderByDescending(h => h.MarketValueUsd)
                    .Select(h => new CryptoStakingByAsset
                    {
                        Symbol = h.Symbol,
                        Quantity = h.Quantity,
                        MarketValueUsd = h.MarketValueUsd,
                        ApyPercent = h.StakingApyPercent
                    })
                    .ToList()
            };
        }

        private static bool IsInbound(CryptoTransactionType t) => t is
            CryptoTransactionType.Buy or
            CryptoTransactionType.Deposit or
            CryptoTransactionType.StakingReward or
            CryptoTransactionType.EarnInterest or
            CryptoTransactionType.Transfer;

        private static bool IsOutbound(CryptoTransactionType t) => t is
            CryptoTransactionType.Sell or
            CryptoTransactionType.Withdrawal or
            CryptoTransactionType.Fee;
    }

    public class CryptoTaxLotRecomputeResult
    {
        public int LotsOpened { get; set; }
        public int LotsClosed { get; set; }
    }

    public class CryptoRealizedPnLSummary
    {
        public int? Year { get; set; }
        public decimal TotalProceedsUsd { get; set; }
        public decimal TotalCostBasisUsd { get; set; }
        public decimal TotalShortTermGainUsd { get; set; }
        public decimal TotalLongTermGainUsd { get; set; }
        public decimal TotalRealizedGainUsd => TotalShortTermGainUsd + TotalLongTermGainUsd;
        public List<CryptoRealizedPnLBySymbol> BySymbol { get; set; } = new();
    }

    public class CryptoRealizedPnLBySymbol
    {
        public string Symbol { get; set; } = string.Empty;
        public decimal ProceedsUsd { get; set; }
        public decimal CostBasisUsd { get; set; }
        public decimal ShortTermGainUsd { get; set; }
        public decimal LongTermGainUsd { get; set; }
        public decimal TotalGainUsd => ShortTermGainUsd + LongTermGainUsd;
    }

    public class CryptoStakingSummary
    {
        public decimal TotalStakedValueUsd { get; set; }
        public decimal? WeightedApyPercent { get; set; }
        public decimal YtdRewardsUsd { get; set; }
        public int StakedAssetCount { get; set; }
        public List<CryptoStakingByAsset> ByAsset { get; set; } = new();
    }

    public class CryptoStakingByAsset
    {
        public string Symbol { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal MarketValueUsd { get; set; }
        public decimal? ApyPercent { get; set; }
    }
}
