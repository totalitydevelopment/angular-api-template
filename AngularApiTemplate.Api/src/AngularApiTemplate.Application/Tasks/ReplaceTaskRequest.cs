namespace AngularApiTemplate.Application.Tasks;

public sealed record ReplaceTaskRequest
{
    public required string Title { get; init; }
    public required string? Description { get; init; }
    public required bool IsCompleted { get; init; }
}
