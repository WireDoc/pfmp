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

        [HttpPost("{userId:int}/risk-goals")]
        public async Task<ActionResult> UpsertRiskGoals(int userId, [FromBody] RiskGoalsRequest request, CancellationToken ct = default)
        {
            await _service.UpsertRiskGoalsAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpPost("{userId:int}/tsp")]
        public async Task<ActionResult> UpsertTsp(int userId, [FromBody] TspProfileRequest request, CancellationToken ct = default)
        {
            await _service.UpsertTspAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpPost("{userId:int}/cash")]
        public async Task<ActionResult> UpsertCash(int userId, [FromBody] CashAccountsRequest request, CancellationToken ct = default)
        {
            await _service.UpsertCashAccountsAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpPost("{userId:int}/investments")]
        public async Task<ActionResult> UpsertInvestments(int userId, [FromBody] InvestmentAccountsRequest request, CancellationToken ct = default)
        {
            await _service.UpsertInvestmentAccountsAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpPost("{userId:int}/real-estate")]
        public async Task<ActionResult> UpsertRealEstate(int userId, [FromBody] PropertiesRequest request, CancellationToken ct = default)
        {
            await _service.UpsertPropertiesAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpPost("{userId:int}/insurance")]
        public async Task<ActionResult> UpsertInsurance(int userId, [FromBody] InsurancePoliciesRequest request, CancellationToken ct = default)
        {
            await _service.UpsertInsurancePoliciesAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpPost("{userId:int}/income")]
        public async Task<ActionResult> UpsertIncome(int userId, [FromBody] IncomeStreamsRequest request, CancellationToken ct = default)
        {
            await _service.UpsertIncomeStreamsAsync(userId, request.ToInput(), ct);
            return NoContent();
        }

        [HttpGet("{userId:int}/sections")]
        public async Task<ActionResult<IEnumerable<FinancialProfileSectionStatus>>> GetSectionStatuses(int userId, CancellationToken ct = default)
        {
            var statuses = await _db.FinancialProfileSectionStatuses.AsNoTracking().Where(s => s.UserId == userId).ToListAsync(ct);
            return Ok(statuses);
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
        public SectionOptOutRequest? OptOut { get; set; }

        public RiskGoalsInput ToInput() => new()
        {
            RiskTolerance = RiskTolerance,
            TargetRetirementDate = TargetRetirementDate,
            PassiveIncomeGoal = PassiveIncomeGoal,
            LiquidityBufferMonths = LiquidityBufferMonths,
            EmergencyFundTarget = EmergencyFundTarget,
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
            OptOut = OptOut?.ToOptOut()
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

        public CashAccountInput ToInput() => new()
        {
            Nickname = Nickname,
            AccountType = AccountType,
            Institution = Institution,
            Balance = Balance,
            InterestRateApr = InterestRateApr,
            IsEmergencyFund = IsEmergencyFund,
            RateLastChecked = RateLastChecked
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
        public decimal MonthlyAmount { get; set; }
        public decimal AnnualAmount { get; set; }
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

    #endregion
}
