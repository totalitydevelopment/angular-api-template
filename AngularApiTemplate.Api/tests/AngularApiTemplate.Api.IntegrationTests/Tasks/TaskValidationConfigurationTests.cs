namespace AngularApiTemplate.Api.IntegrationTests.Tasks;

public sealed class TaskValidationConfigurationTests
{
    [Theory]
    [InlineData(typeof(AngularApiTemplate.Api.Controllers.Tasks.CreateTaskRequest))]
    [InlineData(typeof(AngularApiTemplate.Api.Controllers.Tasks.ReplaceTaskRequest))]
    public void Http_length_limits_match_the_sql_server_model(Type requestType)
    {
        using var context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost;Database=ModelChecks;Integrated Security=True").Options);
        var entity = context.Model.FindEntityType(typeof(TaskItem))!;
        var title = requestType.GetProperty(nameof(TaskItem.Title))!
            .GetCustomAttribute<TrimmedMaxLengthAttribute>()!;
        var description = requestType.GetProperty(nameof(TaskItem.Description))!
            .GetCustomAttribute<MaxLengthAttribute>()!;
        Assert.Equal(entity.FindProperty(nameof(TaskItem.Title))!.GetMaxLength(), title.MaximumLength);
        Assert.Equal(entity.FindProperty(nameof(TaskItem.Description))!.GetMaxLength(), description.Length);
        Assert.False(context.Database.HasPendingModelChanges());
    }
}
