using PFMP_API.Models;

namespace PFMP_API.Services
{
    public interface IAdviceService
    {
        Task<Advice> GenerateBasicAdviceAsync(int userId);
        Task<IEnumerable<Advice>> GetAdviceForUserAsync(int userId);
    }
}
