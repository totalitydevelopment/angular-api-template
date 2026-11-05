namespace AngularApiTemplate.Application.Tasks;

public sealed class TaskService(IApplicationDbContext context) : ITaskService
{
    public async Task<IReadOnlyList<TaskResult>> ListAsync(CancellationToken cancellationToken)
    {
        return await context.Tasks
            .AsNoTracking()
            .OrderBy(item => item.Id)
            .Select(item => new TaskResult
            {
                Id = item.Id,
                Title = item.Title,
                Description = item.Description,
                IsCompleted = item.IsCompleted
            })
            .ToListAsync(cancellationToken);
    }

    public Task<TaskResult?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        return context.Tasks
            .AsNoTracking()
            .Where(item => item.Id == id)
            .Select(item => new TaskResult
            {
                Id = item.Id,
                Title = item.Title,
                Description = item.Description,
                IsCompleted = item.IsCompleted
            })
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<TaskResult> CreateAsync(CreateTaskRequest request, CancellationToken cancellationToken)
    {
        var item = TaskItem.Create(request.Title, request.Description);
        context.Tasks.Add(item);
        await context.SaveChangesAsync(cancellationToken);
        return ToResult(item);
    }

    public async Task<TaskResult?> ReplaceAsync(Guid id, ReplaceTaskRequest request, CancellationToken cancellationToken)
    {
        var item = await context.Tasks.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (item is null)
        {
            return null;
        }

        item.Replace(request.Title, request.Description, request.IsCompleted);
        await context.SaveChangesAsync(cancellationToken);
        return ToResult(item);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var item = await context.Tasks.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (item is null)
        {
            return false;
        }

        context.Tasks.Remove(item);
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static TaskResult ToResult(TaskItem item)
    {
        return new TaskResult()
        {
            Id = item.Id,
            Title = item.Title,
            Description = item.Description,
            IsCompleted = item.IsCompleted
        };
    }
}
