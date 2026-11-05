namespace AngularApiTemplate.Domain.Tasks;

public sealed class TaskItem
{
    public const int MaximumTitleLength = 200;
    public const int MaximumDescriptionLength = 2000;

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
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > MaximumTitleLength)
        {
            throw new ArgumentException("Title must contain between 1 and 200 characters after trimming.", nameof(title));
        }

        if (description?.Length > MaximumDescriptionLength)
        {
            throw new ArgumentException("Description must not exceed 2,000 characters.", nameof(description));
        }

        Title = title.Trim();
        Description = description;
        IsCompleted = isCompleted;
    }
}
