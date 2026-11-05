namespace AngularApiTemplate.Api.Controllers.Tasks;

public sealed class CreateTaskRequest
{
    [Required]
    [TrimmedMaxLength(TaskRequestLimits.Title)]
    public required string Title { get; init; }

    [MaxLength(TaskRequestLimits.Description)]
    public string? Description { get; init; }
}
