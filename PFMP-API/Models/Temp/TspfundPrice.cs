using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class TspfundPrice
{
    public int TspfundPriceId { get; set; }

    public DateTime PriceDate { get; set; }

    public decimal GfundPrice { get; set; }

    public decimal FfundPrice { get; set; }

    public decimal CfundPrice { get; set; }

    public decimal SfundPrice { get; set; }

    public decimal IfundPrice { get; set; }

    public decimal? LincomeFundPrice { get; set; }

    public decimal? L2030fundPrice { get; set; }

    public decimal? L2035fundPrice { get; set; }

    public decimal? L2040fundPrice { get; set; }

    public decimal? L2045fundPrice { get; set; }

    public decimal? L2050fundPrice { get; set; }

    public decimal? L2055fundPrice { get; set; }

    public decimal? L2060fundPrice { get; set; }

    public decimal? L2065fundPrice { get; set; }

    public decimal? L2070fundPrice { get; set; }

    public decimal? L2075fundPrice { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? DataSource { get; set; }
}
