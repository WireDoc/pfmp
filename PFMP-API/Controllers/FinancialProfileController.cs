using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Services.FinancialProfile;

namespace PFMP_API.Controllers
{
    [ApiController]
    [Route("api/financial-profile")]
    public class FinancialProfileController : ControllerBase
    {
        private readonly IFinancialProfileService _service;
        private readonly ApplicationDbContext _db;

        public FinancialProfileController(IFinancialProfileService service, ApplicationDbContext db)
        {
            _service = service;
            _db = db;
        }

        [HttpGet("{userId:int}/snapshot")]
        public async Task<ActionResult<FinancialProfileSnapshot>> GetSnapshot(int userId, CancellationToken ct = default)
        {
            var snapshot = await _service.GetSnapshotAsync(userId, ct);
            if (snapshot == null)
            {
                return NotFound();
            }

            return Ok(snapshot);
        }

        [HttpPost("{userId:int}/household")]
        public async Task<ActionResult> UpsertHousehold(int userId, [FromBody] HouseholdProfileRequest request, CancellationToken ct = default)
        {
            await _service.UpsertHouseholdAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/household")]
        public async Task<ActionResult<HouseholdProfileInput>> GetHousehold(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetHouseholdAsync(userId, ct);
            return Ok(payload);
        }

        [HttpPost("{userId:int}/risk-goals")]
        public async Task<ActionResult> UpsertRiskGoals(int userId, [FromBody] RiskGoalsRequest request, CancellationToken ct = default)
        {
            await _service.UpsertRiskGoalsAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/risk-goals")]
        public async Task<ActionResult<RiskGoalsInput>> GetRiskGoals(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetRiskGoalsAsync(userId, ct);
            return Ok(payload);
        }

        [HttpPost("{userId:int}/tsp")]
        public async Task<ActionResult> UpsertTsp(int userId, [FromBody] TspProfileRequest request, CancellationToken ct = default)
        {
            await _service.UpsertTspAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/tsp")]
        public async Task<ActionResult<TspAllocationInput>> GetTsp(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetTspAsync(userId, ct);
            return Ok(payload);
        }

        [HttpGet("{userId:int}/tsp/summary")]
        public async Task<ActionResult<TspSummary>> GetTspSummary(int userId, CancellationToken ct = default)
        {
            var summary = await _service.GetTspSummaryAsync(userId, ct);
            return Ok(summary);
        }

        // Lightweight denormalized quick-read summary
        [HttpGet("{userId:int}/tsp/summary-lite")]
        public async Task<ActionResult<TspSummaryLite>> GetTspSummaryLite(int userId, CancellationToken ct = default)
        {
            var summary = await _service.GetTspSummaryLiteAsync(userId, ct);
            return Ok(summary);
        }

        /// <summary>
        /// Get comprehensive TSP detail view including user positions and all fund prices.
        /// Uses stored prices only (no external API calls) - prices updated by TspPriceRefreshJob.
        /// </summary>
        [HttpGet("{userId:int}/tsp/detail")]
        public async Task<ActionResult<TspDetailResponse>> GetTspDetail(int userId, CancellationToken ct = default)
        {
            var detail = await _service.GetTspDetailAsync(userId, ct);
            return Ok(detail);
        }

        [HttpPost("{userId:int}/tsp/snapshot")]
        public async Task<ActionResult> CreateTspSnapshot(int userId, CancellationToken ct = default)
        {
            await _service.CreateTspSnapshotAsync(userId, ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/tsp/snapshot/latest")]
        public async Task<ActionResult<TspSnapshotMeta>> GetLatestTspSnapshotMeta(int userId, CancellationToken ct = default)
        {
            var meta = await _service.GetLatestTspSnapshotMetaAsync(userId, ct);
            if (meta == null)
            {
                return NoContent();
            }
            return Ok(meta);
        }

        // Admin backfill: dev/testing only
        [HttpPost("{userId:int}/tsp/backfill/base-funds")]
        public async Task<ActionResult<BackfillResult>> BackfillTspBaseFunds(int userId, [FromQuery] bool dryRun = true, CancellationToken ct = default)
        {
            // simple environment gate via Program's env; if not allowed, return 404 to avoid leaking
            if (!HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment() &&
                !HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsEnvironment("Testing"))
            {
                return NotFound();
            }
            var result = await _service.BackfillTspBasePositionsAsync(userId, dryRun, ct);
            return Ok(result);
        }

        [HttpPost("{userId:int}/cash")]
        public async Task<ActionResult> UpsertCash(int userId, [FromBody] CashAccountsRequest request, CancellationToken ct = default)
        {
            await _service.UpsertCashAccountsAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/cash")]
        public async Task<ActionResult<CashAccountsInput>> GetCashAccounts(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetCashAccountsAsync(userId, ct);
            return Ok(payload);
        }

        [HttpPost("{userId:int}/investments")]
        public async Task<ActionResult> UpsertInvestments(int userId, [FromBody] InvestmentAccountsRequest request, CancellationToken ct = default)
        {
            await _service.UpsertInvestmentAccountsAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/investments")]
        public async Task<ActionResult<InvestmentAccountsInput>> GetInvestmentAccounts(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetInvestmentAccountsAsync(userId, ct);
            return Ok(payload);
        }

        [HttpPost("{userId:int}/real-estate")]
        public async Task<ActionResult> UpsertRealEstate(int userId, [FromBody] PropertiesRequest request, CancellationToken ct = default)
        {
            await _service.UpsertPropertiesAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/real-estate")]
        public async Task<ActionResult<PropertiesInput>> GetRealEstate(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetPropertiesAsync(userId, ct);
            return Ok(payload);
        }

        [HttpPost("{userId:int}/liabilities")]
        public async Task<ActionResult> UpsertLiabilities(int userId, [FromBody] LiabilitiesRequest request, CancellationToken ct = default)
        {
            await _service.UpsertLiabilitiesAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/liabilities")]
        public async Task<ActionResult<LiabilitiesInput>> GetLiabilities(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetLiabilitiesAsync(userId, ct);
            return Ok(payload);
        }

        [HttpPost("{userId:int}/expenses")]
        public async Task<ActionResult> UpsertExpenses(int userId, [FromBody] ExpensesRequest request, CancellationToken ct = default)
        {
            await _service.UpsertExpensesAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/expenses")]
        public async Task<ActionResult<ExpensesInput>> GetExpenses(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetExpensesAsync(userId, ct);
            return Ok(payload);
        }

        [HttpPost("{userId:int}/tax")]
        public async Task<ActionResult> UpsertTax(int userId, [FromBody] TaxProfileRequestV2 request, CancellationToken ct = default)
        {
            await _service.UpsertTaxProfileAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/tax")]
        public async Task<ActionResult<TaxProfileInput>> GetTaxProfile(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetTaxProfileAsync(userId, ct);
            return Ok(payload);
        }

        [HttpPost("{userId:int}/insurance")]
        public async Task<ActionResult> UpsertInsurance(int userId, [FromBody] InsurancePoliciesRequest request, CancellationToken ct = default)
        {
            await _service.UpsertInsurancePoliciesAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/insurance")]
        public async Task<ActionResult<InsurancePoliciesInput>> GetInsurancePolicies(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetInsurancePoliciesAsync(userId, ct);
            return Ok(payload);
        }

        [HttpPost("{userId:int}/benefits")]
        public async Task<ActionResult> UpsertBenefits(int userId, [FromBody] BenefitsRequest request, CancellationToken ct = default)
        {
            await _service.UpsertBenefitsAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/benefits")]
        public async Task<ActionResult<BenefitsInput>> GetBenefits(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetBenefitsAsync(userId, ct);
            return Ok(payload);
        }

        [HttpPost("{userId:int}/long-term-obligations")]
        public async Task<ActionResult> UpsertLongTermObligations(int userId, [FromBody] LongTermObligationsRequest request, CancellationToken ct = default)
        {
            await _service.UpsertLongTermObligationsAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/long-term-obligations")]
        public async Task<ActionResult<LongTermObligationsInput>> GetLongTermObligations(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetLongTermObligationsAsync(userId, ct);
            return Ok(payload);
        }

        [HttpPost("{userId:int}/income")]
        public async Task<ActionResult> UpsertIncome(int userId, [FromBody] IncomeStreamsRequest request, CancellationToken ct = default)
        {
            await _service.UpsertIncomeStreamsAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/income")]
        public async Task<ActionResult<IncomeStreamsInput>> GetIncomeStreams(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetIncomeStreamsAsync(userId, ct);
            return Ok(payload);
        }

        [HttpPost("{userId:int}/equity")]
        public async Task<ActionResult> UpsertEquityInterest(int userId, [FromBody] EquityInterestRequest request, CancellationToken ct = default)
        {
            await _service.UpsertEquityInterestAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/equity")]
        public async Task<ActionResult<EquityInterestInput>> GetEquityInterest(int userId, CancellationToken ct = default)
        {
            var payload = await _service.GetEquityInterestAsync(userId, ct);
            return Ok(payload);
        }

        [HttpGet("{userId:int}/sections")]
        public async Task<ActionResult<IEnumerable<FinancialProfileSectionStatus>>> GetSectionStatuses(int userId, CancellationToken ct = default)
        {
            var statuses = await _db.FinancialProfileSectionStatuses.AsNoTracking().Where(s => s.UserId == userId).ToListAsync(ct);
            return Ok(statuses);
        }

        [HttpPut("{userId:int}/sections/{sectionKey}")]
        public async Task<ActionResult> UpdateSectionStatus(int userId, string sectionKey, [FromBody] UpdateSectionStatusRequest request, CancellationToken ct = default)
        {
            Console.WriteLine($"[UpdateSectionStatus] Called with userId={userId}, sectionKey={sectionKey}, status={request.Status}");
            
            var existing = await _db.FinancialProfileSectionStatuses.FirstOrDefaultAsync(s => s.UserId == userId && s.SectionKey == sectionKey, ct);
            
            if (existing == null)
            {
                Console.WriteLine($"[UpdateSectionStatus] Creating new record for {sectionKey}");
                existing = new FinancialProfileSectionStatus
                {
                    UserId = userId,
                    SectionKey = sectionKey,
                    Status = request.Status,
                    UpdatedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };
                _db.FinancialProfileSectionStatuses.Add(existing);
            }
            else
            {
                Console.WriteLine($"[UpdateSectionStatus] Updating existing record for {sectionKey}");
                existing.Status = request.Status;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);
            Console.WriteLine($"[UpdateSectionStatus] Saved to database successfully");
            return Ok();
        }
    }

    #region Request DTOs

    public class HouseholdProfileRequest
    {
        public string? PreferredName { get; set; }
        public string? MaritalStatus { get; set; }
        public int? DependentCount { get; set; }
        public string? ServiceNotes { get; set; }
        public SectionOptOutRequest? OptOut { get; set; }

        public HouseholdProfileInput ToInput() => new()
        {
            PreferredName = PreferredName,
            MaritalStatus = MaritalStatus,
            DependentCount = DependentCount,
            ServiceNotes = ServiceNotes,
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class RiskGoalsRequest
    {
        public int? RiskTolerance { get; set; }
        public DateTime? TargetRetirementDate { get; set; }
        public decimal? PassiveIncomeGoal { get; set; }
        public decimal? LiquidityBufferMonths { get; set; }
        public decimal? EmergencyFundTarget { get; set; }
        public decimal? TransactionalAccountDesiredBalance { get; set; }
        public SectionOptOutRequest? OptOut { get; set; }

        public RiskGoalsInput ToInput() => new()
        {
            RiskTolerance = RiskTolerance,
            TargetRetirementDate = TargetRetirementDate,
            PassiveIncomeGoal = PassiveIncomeGoal,
            LiquidityBufferMonths = LiquidityBufferMonths,
            EmergencyFundTarget = EmergencyFundTarget,
            TransactionalAccountDesiredBalance = TransactionalAccountDesiredBalance,
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class TspProfileRequest
    {
        public decimal ContributionRatePercent { get; set; }
        public decimal EmployerMatchPercent { get; set; }
        public decimal CurrentBalance { get; set; }
        public decimal TargetBalance { get; set; }
        public decimal GFundPercent { get; set; }
        public decimal FFundPercent { get; set; }
        public decimal CFundPercent { get; set; }
        public decimal SFundPercent { get; set; }
        public decimal IFundPercent { get; set; }
        public decimal? LifecyclePercent { get; set; }
        public decimal? LifecycleBalance { get; set; }
        public List<TspLifecyclePositionRequest> LifecyclePositions { get; set; } = new();
        public SectionOptOutRequest? OptOut { get; set; }

        public TspAllocationInput ToInput() => new()
        {
            ContributionRatePercent = ContributionRatePercent,
            EmployerMatchPercent = EmployerMatchPercent,
            CurrentBalance = CurrentBalance,
            TargetBalance = TargetBalance,
            GFundPercent = GFundPercent,
            FFundPercent = FFundPercent,
            CFundPercent = CFundPercent,
            SFundPercent = SFundPercent,
            IFundPercent = IFundPercent,
            LifecyclePercent = LifecyclePercent,
            LifecycleBalance = LifecycleBalance,
            LifecyclePositions = LifecyclePositions.Select(p => p.ToInput()).ToList(),
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class TspLifecyclePositionRequest
    {
        public string FundCode { get; set; } = string.Empty;
        public decimal ContributionPercent { get; set; }
        public decimal Units { get; set; }
        public DateTime? DateUpdated { get; set; }

        public TspLifecyclePositionInput ToInput() => new()
        {
            FundCode = FundCode,
            ContributionPercent = ContributionPercent,
            Units = Units,
            DateUpdated = DateUpdated
        };
    }

    public class CashAccountsRequest
    {
        public List<CashAccountRequest> Accounts { get; set; } = new();
        public SectionOptOutRequest? OptOut { get; set; }

        public CashAccountsInput ToInput() => new()
        {
            Accounts = Accounts.Select(a => a.ToInput()).ToList(),
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class CashAccountRequest
    {
        public string Nickname { get; set; } = string.Empty;
        public string AccountType { get; set; } = "checking";
        public string? Institution { get; set; }
        public decimal Balance { get; set; }
        public decimal? InterestRateApr { get; set; }
        public bool IsEmergencyFund { get; set; }
        public DateTime? RateLastChecked { get; set; }
        public string? Purpose { get; set; }

        public CashAccountInput ToInput() => new()
        {
            Nickname = Nickname,
            AccountType = AccountType,
            Institution = Institution,
            Balance = Balance,
            InterestRateApr = InterestRateApr,
            IsEmergencyFund = IsEmergencyFund,
            RateLastChecked = RateLastChecked,
            Purpose = Purpose
        };
    }

    public class InvestmentAccountsRequest
    {
        public List<InvestmentAccountRequest> Accounts { get; set; } = new();
        public SectionOptOutRequest? OptOut { get; set; }

        public InvestmentAccountsInput ToInput() => new()
        {
            Accounts = Accounts.Select(a => a.ToInput()).ToList(),
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class InvestmentAccountRequest
    {
        public string AccountName { get; set; } = string.Empty;
        public string AccountCategory { get; set; } = "brokerage";
        public string? Institution { get; set; }
        public string? AssetClass { get; set; }
        public decimal CurrentValue { get; set; }
        public decimal? CostBasis { get; set; }
        public decimal? ContributionRatePercent { get; set; }
        public bool IsTaxAdvantaged { get; set; }
        public DateTime? LastContributionDate { get; set; }

        public InvestmentAccountInput ToInput() => new()
        {
            AccountName = AccountName,
            AccountCategory = AccountCategory,
            Institution = Institution,
            AssetClass = AssetClass,
            CurrentValue = CurrentValue,
            CostBasis = CostBasis,
            ContributionRatePercent = ContributionRatePercent,
            IsTaxAdvantaged = IsTaxAdvantaged,
            LastContributionDate = LastContributionDate
        };
    }

    public class PropertiesRequest
    {
        public List<PropertyRequest> Properties { get; set; } = new();
        public SectionOptOutRequest? OptOut { get; set; }

        public PropertiesInput ToInput() => new()
        {
            Properties = Properties.Select(p => p.ToInput()).ToList(),
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class PropertyRequest
    {
        public string PropertyName { get; set; } = string.Empty;
        public string PropertyType { get; set; } = "primary";
        public string Occupancy { get; set; } = "owner";
        public decimal EstimatedValue { get; set; }
        public decimal? MortgageBalance { get; set; }
        public decimal? MonthlyMortgagePayment { get; set; }
        public decimal? MonthlyRentalIncome { get; set; }
        public decimal? MonthlyExpenses { get; set; }
        public bool HasHeloc { get; set; }

        public PropertyInput ToInput() => new()
        {
            PropertyName = PropertyName,
            PropertyType = PropertyType,
            Occupancy = Occupancy,
            EstimatedValue = EstimatedValue,
            MortgageBalance = MortgageBalance,
            MonthlyMortgagePayment = MonthlyMortgagePayment,
            MonthlyRentalIncome = MonthlyRentalIncome,
            MonthlyExpenses = MonthlyExpenses,
            HasHeloc = HasHeloc
        };
    }

    public class LiabilitiesRequest
    {
        public List<LiabilityAccountRequest> Liabilities { get; set; } = new();
        public SectionOptOutRequest? OptOut { get; set; }

        public LiabilitiesInput ToInput() => new()
        {
            Liabilities = Liabilities.Select(l => l.ToInput()).ToList(),
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class LiabilityAccountRequest
    {
        public string LiabilityType { get; set; } = string.Empty;
        public string? Lender { get; set; }
        public decimal CurrentBalance { get; set; }
        public decimal? InterestRateApr { get; set; }
        public decimal? MinimumPayment { get; set; }
        public DateTime? PayoffTargetDate { get; set; }
        public bool IsPriorityToEliminate { get; set; }

        public LiabilityAccountInput ToInput() => new()
        {
            LiabilityType = LiabilityType,
            Lender = Lender,
            CurrentBalance = CurrentBalance,
            InterestRateApr = InterestRateApr,
            MinimumPayment = MinimumPayment,
            PayoffTargetDate = PayoffTargetDate,
            IsPriorityToEliminate = IsPriorityToEliminate
        };
    }

    public class ExpensesRequest
    {
        public List<ExpenseBudgetRequest> Expenses { get; set; } = new();
        public SectionOptOutRequest? OptOut { get; set; }

        public ExpensesInput ToInput() => new()
        {
            Expenses = Expenses.Select(e => e.ToInput()).ToList(),
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class ExpenseBudgetRequest
    {
        public string Category { get; set; } = string.Empty;
        public decimal MonthlyAmount { get; set; }
        public bool IsEstimated { get; set; }
        public string? Notes { get; set; }

        public ExpenseBudgetInput ToInput() => new()
        {
            Category = Category,
            MonthlyAmount = MonthlyAmount,
            IsEstimated = IsEstimated,
            Notes = Notes
        };
    }

    public class TaxProfileRequestV2
    {
        public string FilingStatus { get; set; } = "single";
        public string? StateOfResidence { get; set; }
        public decimal? MarginalRatePercent { get; set; }
        public decimal? EffectiveRatePercent { get; set; }
        public decimal? FederalWithholdingPercent { get; set; }
        public decimal? ExpectedRefundAmount { get; set; }
        public decimal? ExpectedPaymentAmount { get; set; }
        public bool UsesCpaOrPreparer { get; set; }
        public string? Notes { get; set; }
        public SectionOptOutRequest? OptOut { get; set; }

        public TaxProfileInput ToInput() => new()
        {
            FilingStatus = FilingStatus,
            StateOfResidence = StateOfResidence,
            MarginalRatePercent = MarginalRatePercent,
            EffectiveRatePercent = EffectiveRatePercent,
            FederalWithholdingPercent = FederalWithholdingPercent,
            ExpectedRefundAmount = ExpectedRefundAmount,
            ExpectedPaymentAmount = ExpectedPaymentAmount,
            UsesCpaOrPreparer = UsesCpaOrPreparer,
            Notes = Notes,
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class InsurancePoliciesRequest
    {
        public List<InsurancePolicyRequest> Policies { get; set; } = new();
        public SectionOptOutRequest? OptOut { get; set; }

        public InsurancePoliciesInput ToInput() => new()
        {
            Policies = Policies.Select(p => p.ToInput()).ToList(),
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class InsurancePolicyRequest
    {
        public string PolicyType { get; set; } = string.Empty;
        public string? Carrier { get; set; }
        public string? PolicyName { get; set; }
        public decimal? CoverageAmount { get; set; }
        public decimal? PremiumAmount { get; set; }
        public string? PremiumFrequency { get; set; }
        public DateTime? RenewalDate { get; set; }
        public bool IsAdequateCoverage { get; set; }
        public decimal? RecommendedCoverage { get; set; }

        public InsurancePolicyInput ToInput() => new()
        {
            PolicyType = PolicyType,
            Carrier = Carrier,
            PolicyName = PolicyName,
            CoverageAmount = CoverageAmount,
            PremiumAmount = PremiumAmount,
            PremiumFrequency = PremiumFrequency,
            RenewalDate = RenewalDate,
            IsAdequateCoverage = IsAdequateCoverage,
            RecommendedCoverage = RecommendedCoverage
        };
    }

    public class BenefitsRequest
    {
        public List<BenefitCoverageRequest> Benefits { get; set; } = new();
        public SectionOptOutRequest? OptOut { get; set; }

        public BenefitsInput ToInput() => new()
        {
            Benefits = Benefits.Select(b => b.ToInput()).ToList(),
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class LongTermObligationsRequest
    {
        public List<LongTermObligationRequest> Obligations { get; set; } = new();
        public SectionOptOutRequest? OptOut { get; set; }

        public LongTermObligationsInput ToInput() => new()
        {
            Obligations = Obligations.Select(o => o.ToInput()).ToList(),
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class BenefitCoverageRequest
    {
        public string BenefitType { get; set; } = string.Empty;
        public string? Provider { get; set; }
        public bool IsEnrolled { get; set; }
        public decimal? EmployerContributionPercent { get; set; }
        public decimal? MonthlyCost { get; set; }
        public string? Notes { get; set; }

        public BenefitCoverageInput ToInput() => new()
        {
            BenefitType = BenefitType,
            Provider = Provider,
            IsEnrolled = IsEnrolled,
            EmployerContributionPercent = EmployerContributionPercent,
            MonthlyCost = MonthlyCost,
            Notes = Notes
        };
    }

    public class LongTermObligationRequest
    {
        public string ObligationName { get; set; } = string.Empty;
        public string ObligationType { get; set; } = "general";
        public DateTime? TargetDate { get; set; }
        public decimal? EstimatedCost { get; set; }
        public decimal? FundsAllocated { get; set; }
        public string? FundingStatus { get; set; }
        public bool IsCritical { get; set; }
        public string? Notes { get; set; }

        public LongTermObligationInput ToInput() => new()
        {
            ObligationName = ObligationName,
            ObligationType = ObligationType,
            TargetDate = TargetDate,
            EstimatedCost = EstimatedCost,
            FundsAllocated = FundsAllocated,
            FundingStatus = FundingStatus,
            IsCritical = IsCritical,
            Notes = Notes
        };
    }

    public class IncomeStreamsRequest
    {
        public List<IncomeStreamRequest> Streams { get; set; } = new();
        public SectionOptOutRequest? OptOut { get; set; }

        public IncomeStreamsInput ToInput() => new()
        {
            Streams = Streams.Select(s => s.ToInput()).ToList(),
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class IncomeStreamRequest
    {
        public string Name { get; set; } = string.Empty;
        public string IncomeType { get; set; } = "salary";
        public decimal? MonthlyAmount { get; set; }
        public decimal? AnnualAmount { get; set; }
        public bool IsGuaranteed { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; } = true;

        public IncomeStreamInput ToInput() => new()
        {
            Name = Name,
            IncomeType = IncomeType,
            MonthlyAmount = MonthlyAmount,
            AnnualAmount = AnnualAmount,
            IsGuaranteed = IsGuaranteed,
            StartDate = StartDate,
            EndDate = EndDate,
            IsActive = IsActive
        };
    }

    public class EquityInterestRequest
    {
        public bool IsInterestedInTracking { get; set; }
        public string? Notes { get; set; }
        public SectionOptOutRequest? OptOut { get; set; }

        public EquityInterestInput ToInput() => new()
        {
            IsInterestedInTracking = IsInterestedInTracking,
            Notes = Notes,
            OptOut = OptOut?.ToOptOut()
        };
    }

    public class SectionOptOutRequest
    {
        public bool IsOptedOut { get; set; }
        public string? Reason { get; set; }
        public DateTime? AcknowledgedAt { get; set; }

        public SectionOptOut ToOptOut() => new()
        {
            IsOptedOut = IsOptedOut,
            Reason = Reason,
            AcknowledgedAt = AcknowledgedAt
        };
    }

    public class UpdateSectionStatusRequest
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }

    #endregion
}
