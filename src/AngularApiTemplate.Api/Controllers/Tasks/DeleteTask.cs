namespace AngularApiTemplate.Api.Controllers.Tasks;

[ApiController]
[AllowAnonymous]
[Route("tasks")]
public sealed class DeleteTask(ITaskService service) : ControllerBase
{
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTaskAsync([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        return await service.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}
