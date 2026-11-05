namespace AngularApiTemplate.Application.Tasks;

public sealed record CreateTaskRequest
{
    public required string Title { get; init; }
    public string? Description { get; init; }
}
