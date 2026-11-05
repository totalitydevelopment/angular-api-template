namespace AngularApiTemplate.Api.Controllers.Tasks;

public sealed class ReplaceTaskRequest
{
    [Required]
    [TrimmedMaxLength(TaskRequestLimits.Title)]
    public required string Title { get; init; }

    [MaxLength(TaskRequestLimits.Description)]
    public required string? Description { get; init; }

    public required bool IsCompleted { get; init; }
}
