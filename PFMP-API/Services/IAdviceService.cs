using PFMP_API.Models;

namespace PFMP_API.Services
{
    public interface IAdviceService
    {
        Task<Advice> GenerateBasicAdviceAsync(int userId);
        Task<Advice> GenerateAdviceFromAlertAsync(int alertId, int userId, bool includeSnapshot = true);
        Task<IEnumerable<Advice>> GetAdviceForUserAsync(int userId, string? status = null, bool includeDismissed = false);
        Task<Advice?> AcceptAdviceAsync(int adviceId);
        Task<Advice?> DismissAdviceAsync(int adviceId);
    }
}
