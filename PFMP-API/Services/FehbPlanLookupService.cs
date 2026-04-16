using System.Collections.Frozen;

namespace PFMP_API.Services;

/// <summary>
/// Static lookup for FEHB enrollment codes → plan name, coverage level, and plan type.
/// Data sourced from OPM.gov plan brochures. Update annually during Open Season.
/// Also computes employer (government) contribution from the employee's biweekly deduction.
/// </summary>
public class FehbPlanLookupService
{
    public record FehbPlanInfo(string PlanName, string CoverageLevel, string PlanType);

    /// <summary>
    /// OPM-published maximum biweekly government contributions (72% of weighted average).
    /// Updated annually — current values are for plan year 2026.
    /// </summary>
    private static readonly Dictionary<string, decimal> MaxGovtBiweekly2026 = new()
    {
        ["Self Only"] = 324.76m,
        ["Self Plus One"] = 711.17m,
        ["Self and Family"] = 778.03m
    };

    /// <summary>
    /// FEHB enrollment code → plan info. Covers major nationwide FFS plans.
    /// Codes from OPM plan brochures (opm.gov/healthcare-insurance).
    /// </summary>
    private static readonly FrozenDictionary<string, FehbPlanInfo> Plans = new Dictionary<string, FehbPlanInfo>
    {
        // === Blue Cross Blue Shield FEP ===
        // Standard Option
        ["104"] = new("Blue Cross Blue Shield Standard", "Self Only", "FFS"),
        ["105"] = new("Blue Cross Blue Shield Standard", "Self Plus One", "FFS"),
        ["106"] = new("Blue Cross Blue Shield Standard", "Self and Family", "FFS"),
        // Basic Option
        ["111"] = new("Blue Cross Blue Shield Basic", "Self Only", "FFS"),
        ["112"] = new("Blue Cross Blue Shield Basic", "Self Plus One", "FFS"),
        ["113"] = new("Blue Cross Blue Shield Basic", "Self and Family", "FFS"),
        // FEP Blue Focus
        ["131"] = new("Blue Cross Blue Shield FEP Blue Focus", "Self Only", "FFS"),
        ["132"] = new("Blue Cross Blue Shield FEP Blue Focus", "Self Plus One", "FFS"),
        ["133"] = new("Blue Cross Blue Shield FEP Blue Focus", "Self and Family", "FFS"),

        // === GEHA ===
        // Standard Option
        ["311"] = new("GEHA Standard", "Self Only", "FFS"),
        ["312"] = new("GEHA Standard", "Self Plus One", "FFS"),
        ["313"] = new("GEHA Standard", "Self and Family", "FFS"),
        // HDHP
        ["314"] = new("GEHA HDHP", "Self Only", "HDHP"),
        ["315"] = new("GEHA HDHP", "Self Plus One", "HDHP"),
        ["316"] = new("GEHA HDHP", "Self and Family", "HDHP"),
        // Elevate
        ["341"] = new("GEHA Elevate", "Self Only", "FFS"),
        ["342"] = new("GEHA Elevate", "Self Plus One", "FFS"),
        ["343"] = new("GEHA Elevate", "Self and Family", "FFS"),
        // Elevate Plus
        ["344"] = new("GEHA Elevate Plus", "Self Only", "FFS"),
        ["345"] = new("GEHA Elevate Plus", "Self Plus One", "FFS"),
        ["346"] = new("GEHA Elevate Plus", "Self and Family", "FFS"),

        // === NALC (National Association of Letter Carriers) ===
        // High Option
        ["321"] = new("NALC High", "Self Only", "FFS"),
        ["322"] = new("NALC High", "Self Plus One", "FFS"),
        ["323"] = new("NALC High", "Self and Family", "FFS"),
        // Value Plan
        ["324"] = new("NALC Value Plan", "Self Only", "FFS"),
        ["325"] = new("NALC Value Plan", "Self Plus One", "FFS"),
        ["326"] = new("NALC Value Plan", "Self and Family", "FFS"),
        // CDHP
        ["381"] = new("NALC CDHP", "Self Only", "CDHP"),
        ["382"] = new("NALC CDHP", "Self Plus One", "CDHP"),
        ["383"] = new("NALC CDHP", "Self and Family", "CDHP"),

        // === MHBP (Mail Handlers Benefit Plan) ===
        // Standard Option
        ["451"] = new("MHBP Standard", "Self Only", "FFS"),
        ["452"] = new("MHBP Standard", "Self Plus One", "FFS"),
        ["453"] = new("MHBP Standard", "Self and Family", "FFS"),
        // Value Plan
        ["454"] = new("MHBP Value Plan", "Self Only", "FFS"),
        ["455"] = new("MHBP Value Plan", "Self Plus One", "FFS"),
        ["456"] = new("MHBP Value Plan", "Self and Family", "FFS"),
        // Consumer Option (CDHP)
        ["481"] = new("MHBP Consumer Option", "Self Only", "CDHP"),
        ["482"] = new("MHBP Consumer Option", "Self Plus One", "CDHP"),
        ["483"] = new("MHBP Consumer Option", "Self and Family", "CDHP"),

        // === Aetna ===
        // Direct CDHP
        ["221"] = new("Aetna Direct CDHP", "Self Only", "CDHP"),
        ["222"] = new("Aetna Direct CDHP", "Self Plus One", "CDHP"),
        ["223"] = new("Aetna Direct CDHP", "Self and Family", "CDHP"),
        // Open Access
        ["224"] = new("Aetna Open Access", "Self Only", "FFS"),
        ["225"] = new("Aetna Open Access", "Self Plus One", "FFS"),
        ["226"] = new("Aetna Open Access", "Self and Family", "FFS"),
        // HealthFund HDHP
        ["227"] = new("Aetna HealthFund HDHP", "Self Only", "HDHP"),
        ["228"] = new("Aetna HealthFund HDHP", "Self Plus One", "HDHP"),
        ["229"] = new("Aetna HealthFund HDHP", "Self and Family", "HDHP"),

        // === Foreign Service Benefit Plan ===
        ["401"] = new("Foreign Service Benefit Plan", "Self Only", "FFS"),
        ["402"] = new("Foreign Service Benefit Plan", "Self Plus One", "FFS"),
        ["403"] = new("Foreign Service Benefit Plan", "Self and Family", "FFS"),

        // === APWU Health Plan ===
        // High Option
        ["471"] = new("APWU High Option", "Self Only", "FFS"),
        ["472"] = new("APWU High Option", "Self Plus One", "FFS"),
        ["473"] = new("APWU High Option", "Self and Family", "FFS"),
        // Consumer Driven
        ["474"] = new("APWU Consumer Driven", "Self Only", "CDHP"),
        ["475"] = new("APWU Consumer Driven", "Self Plus One", "CDHP"),
        ["476"] = new("APWU Consumer Driven", "Self and Family", "CDHP"),

        // === SAMBA (Special Agents Mutual Benefit Association) ===
        ["441"] = new("SAMBA Standard", "Self Only", "FFS"),
        ["442"] = new("SAMBA Standard", "Self Plus One", "FFS"),
        ["443"] = new("SAMBA Standard", "Self and Family", "FFS"),
        ["444"] = new("SAMBA High", "Self Only", "FFS"),
        ["445"] = new("SAMBA High", "Self Plus One", "FFS"),
        ["446"] = new("SAMBA High", "Self and Family", "FFS"),
    }.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Look up FEHB plan info by enrollment code.
    /// </summary>
    public FehbPlanInfo? Lookup(string? enrollmentCode)
    {
        if (string.IsNullOrWhiteSpace(enrollmentCode)) return null;
        return Plans.GetValueOrDefault(enrollmentCode.Trim());
    }

    /// <summary>
    /// Compute the biweekly government (employer) contribution.
    /// FEHB formula: govt pays the lesser of 75% of total premium OR 72% of weighted average (the published max).
    /// Since employee_share = total - govt:
    ///   If 75% rule applies: govt = 3 * employee (i.e., employee pays 25%)
    ///   If capped: govt = maxGovt
    /// Threshold: employee * 3 ≤ maxGovt → 75% rule; otherwise capped at maxGovt.
    /// </summary>
    public decimal? ComputeBiweeklyGovernmentShare(decimal biweeklyEmployeeShare, string coverageLevel)
    {
        if (!MaxGovtBiweekly2026.TryGetValue(coverageLevel, out var maxGovt))
            return null;

        var seventyFivePercent = biweeklyEmployeeShare * 3m; // employee = 25% → govt = 75% = 3×employee
        return seventyFivePercent <= maxGovt ? seventyFivePercent : maxGovt;
    }
}
