namespace AngularApiTemplate.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<Tasks.ITaskService, Tasks.TaskService>();
        return services;
    }
}
