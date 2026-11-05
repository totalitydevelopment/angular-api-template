namespace AngularApiTemplate.Api.Controllers.Tasks;

public sealed class CreateTaskRequest
{
    [Required]
    [TrimmedMaxLength(TaskItem.MaximumTitleLength)]
    public required string Title { get; init; }

    [MaxLength(TaskItem.MaximumDescriptionLength)]
    public string? Description { get; init; }
}
