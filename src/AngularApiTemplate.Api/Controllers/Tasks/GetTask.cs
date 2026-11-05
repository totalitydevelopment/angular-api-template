namespace AngularApiTemplate.Api.Controllers.Tasks;

[ApiController]
[AllowAnonymous]
[Route("tasks")]
public sealed class GetTask(ITaskService service) : ControllerBase
{
    public const string RouteName = "Tasks.GetById";

    [ProducesResponseType<TaskResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [HttpGet("{id}", Name = RouteName)]
    public async Task<ActionResult<TaskResponse>> GetTaskAsync([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await service.GetAsync(id, cancellationToken);
        if (result is null)
        {
            return NotFound();
        }

        return Ok(new TaskResponse
        {
            Id = result.Id,
            Title = result.Title,
            Description = result.Description,
            IsCompleted = result.IsCompleted
        });
    }
}
