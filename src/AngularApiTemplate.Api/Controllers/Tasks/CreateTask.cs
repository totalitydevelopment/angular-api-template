namespace AngularApiTemplate.Api.Controllers.Tasks;

[ApiController]
[AllowAnonymous]
[Route("tasks")]
public sealed class CreateTask(ITaskService service) : ControllerBase
{
    [ProducesResponseType<TaskResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [HttpPost]
    public async Task<ActionResult<TaskResponse>> CreateTaskAsync([FromBody] CreateTaskRequest request,
        CancellationToken cancellationToken)
    {
        var item = await service.CreateAsync(new Application.Tasks.CreateTaskRequest
        {
            Title = request.Title,
            Description = request.Description,
        }, cancellationToken);

        var response = new TaskResponse
        {
            Id = item.Id,
            Title = item.Title,
            Description = item.Description,
            IsCompleted = item.IsCompleted
        };
        return CreatedAtRoute(GetTask.RouteName, new { id = item.Id }, response);
    }
}
