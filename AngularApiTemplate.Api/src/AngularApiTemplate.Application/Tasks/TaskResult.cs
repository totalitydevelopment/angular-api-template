namespace AngularApiTemplate.Application.Tasks;

public sealed record TaskResult
{
    public required Guid Id { get; init; }
    public required string Title { get; init; }
    public required string? Description { get; init; }
    public required bool IsCompleted { get; init; }
}
