using PFMP_API.Models;

namespace PFMP_API.Services
{
    /// <summary>
    /// Wave 1.5 stub validator: inspects AI generated text and produces simple diagnostics JSON.
    /// Future waves: multi-model cross validation, policy engine, risk scoring.
    /// </summary>
    public interface IAdviceValidator
    {
        Task<AdviceValidationOutcome> ValidateAsync(Advice candidate);
    }
}
