using PFMP_API.Models;

namespace PFMP_API.DTOs
{
    public class UpdateBalanceRequest
    {
        public decimal NewBalance { get; set; }
    }

    public class TransitionToDetailedRequest
    {
        public List<InitialHoldingRequest> Holdings { get; set; } = new();
        public DateTime AcquisitionDate { get; set; }
    }

    public class InitialHoldingRequest
    {
        public string Symbol { get; set; } = string.Empty;
        public string? Name { get; set; }
        public AssetType AssetType { get; set; }
        public decimal Quantity { get; set; }
        public decimal Price { get; set; }
    }
}
