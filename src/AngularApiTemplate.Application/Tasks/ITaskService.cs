namespace AngularApiTemplate.Application.Tasks;

public interface ITaskService
{
    Task<IReadOnlyList<TaskResult>> ListAsync(CancellationToken cancellationToken);
    Task<TaskResult?> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<TaskResult> CreateAsync(CreateTaskRequest request, CancellationToken cancellationToken);
    Task<TaskResult?> ReplaceAsync(Guid id, ReplaceTaskRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
