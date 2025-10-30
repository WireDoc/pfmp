using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class FinancialProfileExpense
{
    public int ExpenseBudgetId { get; set; }

    public int UserId { get; set; }

    public string Category { get; set; } = null!;

    public decimal MonthlyAmount { get; set; }

    public bool IsEstimated { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
