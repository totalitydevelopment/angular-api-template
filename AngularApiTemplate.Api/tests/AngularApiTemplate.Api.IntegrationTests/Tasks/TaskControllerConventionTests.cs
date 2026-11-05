namespace AngularApiTemplate.Api.IntegrationTests.Tasks;

public sealed class TaskControllerConventionTests
{
    [Theory]
    [InlineData(typeof(Api.Controllers.Tasks.ListTasks), "GET")]
    [InlineData(typeof(Api.Controllers.Tasks.GetTask), "GET")]
    [InlineData(typeof(Api.Controllers.Tasks.CreateTask), "POST")]
    [InlineData(typeof(Api.Controllers.Tasks.ReplaceTask), "PUT")]
    [InlineData(typeof(Api.Controllers.Tasks.DeleteTask), "DELETE")]
    public void Controllers_have_one_explicit_action_and_only_an_application_service_dependency(Type controller, string verb)
    {
        Assert.True(typeof(ControllerBase).IsAssignableFrom(controller));
        Assert.NotNull(controller.GetCustomAttribute<ApiControllerAttribute>());
        Assert.Null(controller.GetCustomAttribute<AllowAnonymousAttribute>());
        Assert.Equal("Customer", controller.GetCustomAttribute<AuthorizeAttribute>()?.Policy);
        Assert.Equal("tasks", controller.GetCustomAttribute<RouteAttribute>()!.Template);
        var constructor = Assert.Single(controller.GetConstructors());
        Assert.Equal(typeof(ITaskService), Assert.Single(constructor.GetParameters()).ParameterType);
        var action = Assert.Single(controller.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly));
        Assert.Equal(controller.Name + "Async", action.Name);
        var responses = action.GetCustomAttributes<ProducesResponseTypeAttribute>().ToArray();
        var success = verb == "POST" ? 201 : verb == "DELETE" ? 204 : 200;
        Assert.Contains(responses, response => response.StatusCode == success);
        if (controller.Name != "ListTasks")
        {
            Assert.Contains(responses, response => response.StatusCode == 400);
        }
        if (verb is "PUT" or "DELETE" || controller.Name == "GetTask")
        {
            Assert.Contains(responses, response => response.StatusCode == 404);
        }
        var attribute = Assert.Single(action.GetCustomAttributes<HttpMethodAttribute>());
        Assert.Equal(verb, Assert.Single(attribute.HttpMethods));
        Assert.Contains(action.GetParameters(), parameter => parameter.ParameterType == typeof(CancellationToken));
    }
}
