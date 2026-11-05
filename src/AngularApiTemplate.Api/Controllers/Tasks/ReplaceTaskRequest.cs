namespace AngularApiTemplate.Api.Controllers.Tasks;

public sealed class ReplaceTaskRequest
{
    [Required]
    [TrimmedMaxLength(TaskItem.MaximumTitleLength)]
    public required string Title { get; init; }

    [MaxLength(TaskItem.MaximumDescriptionLength)]
    public required string? Description { get; init; }

    public required bool IsCompleted { get; init; }
}
