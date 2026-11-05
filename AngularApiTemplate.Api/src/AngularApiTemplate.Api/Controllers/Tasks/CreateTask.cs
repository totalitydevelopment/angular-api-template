namespace AngularApiTemplate.Api.Controllers.Tasks;

[ApiController]
[Authorize(Policy = AuthenticationExtensions.CustomerPolicy)]
[Route("tasks")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
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
