namespace AngularApiTemplate.Domain.Tasks;

public sealed class TaskItem
{
    private TaskItem() { }

    public Guid Id { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public bool IsCompleted { get; private set; }

    public static TaskItem Create(string title, string? description)
    {
        var item = new TaskItem { Id = Guid.CreateVersion7() };
        item.Replace(title, description, false);
        return item;
    }

    public void Replace(string title, string? description, bool isCompleted)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ArgumentException("Title must not be blank.", nameof(title));
        }

        Title = title.Trim();
        Description = description;
        IsCompleted = isCompleted;
    }
}
