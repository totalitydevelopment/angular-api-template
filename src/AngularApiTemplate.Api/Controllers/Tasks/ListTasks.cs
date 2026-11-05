namespace AngularApiTemplate.Api.Controllers.Tasks;

[ApiController]
[AllowAnonymous]
[Route("tasks")]
public sealed class ListTasks(ITaskService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<TaskResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TaskResponse>>> ListTasksAsync(CancellationToken cancellationToken)
    {
        var results = await service.ListAsync(cancellationToken);
        return Ok(results.Select(item => new TaskResponse
        {
            Id = item.Id,
            Title = item.Title,
            Description = item.Description,
            IsCompleted = item.IsCompleted
        }).ToArray());
    }
}
