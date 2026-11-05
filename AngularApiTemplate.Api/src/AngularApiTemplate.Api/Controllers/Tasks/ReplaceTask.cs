namespace AngularApiTemplate.Api.Controllers.Tasks;

[ApiController]
[Authorize(Policy = AuthenticationExtensions.CustomerPolicy)]
[Route("tasks")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public sealed class ReplaceTask(ITaskService service) : ControllerBase
{
    [ProducesResponseType<TaskResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [HttpPut("{id}")]
    public async Task<ActionResult<TaskResponse>> ReplaceTaskAsync([FromRoute] Guid id, [FromBody] ReplaceTaskRequest request,
        CancellationToken cancellationToken)
    {
        var item = await service.ReplaceAsync(id, new Application.Tasks.ReplaceTaskRequest
        {
            Title = request.Title,
            Description = request.Description,
            IsCompleted = request.IsCompleted,
        }, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(new TaskResponse
        {
            Id = item.Id,
            Title = item.Title,
            Description = item.Description,
            IsCompleted = item.IsCompleted
        });
    }
}
