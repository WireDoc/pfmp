using Microsoft.AspNetCore.Mvc;

namespace PFMP_API.Controllers
{
    [ApiController]
    [Route("api/docs")]
    public class DocsController : ControllerBase
    {
        [HttpGet("endpoints")]
        [ProducesResponseType(typeof(IEnumerable<object>), 200)]
        public IActionResult ListEndpoints()
        {
            // Minimal reflection-based endpoint listing for quick custom docs.
            var endpoints = HttpContext.RequestServices.GetService(typeof(IEndpointRouteBuilder)) as IEndpointRouteBuilder;
            // Fallback: build from action descriptors
            var provider = HttpContext.RequestServices.GetService(typeof(Microsoft.AspNetCore.Mvc.Infrastructure.IActionDescriptorCollectionProvider)) as Microsoft.AspNetCore.Mvc.Infrastructure.IActionDescriptorCollectionProvider;
            var actions = provider?.ActionDescriptors.Items
                .OfType<Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor>()
                .Select(a => new {
                    controller = a.ControllerName,
                    action = a.ActionName,
                    http = string.Join(',', a.ActionConstraints?.OfType<Microsoft.AspNetCore.Mvc.ActionConstraints.HttpMethodActionConstraint>().FirstOrDefault()?.HttpMethods ?? new List<string>{"GET"}),
                    route = "/" + a.AttributeRouteInfo?.Template
                })
                .OrderBy(x => x.controller)
                .ThenBy(x => x.route)
                .ToList();
            return Ok(actions);
        }
    }
}
