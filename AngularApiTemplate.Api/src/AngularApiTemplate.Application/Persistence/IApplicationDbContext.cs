namespace AngularApiTemplate.Application.Persistence;

public interface IApplicationDbContext
{
    DbSet<TaskItem> Tasks { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
