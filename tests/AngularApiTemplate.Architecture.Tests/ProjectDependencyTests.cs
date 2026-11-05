namespace AngularApiTemplate.Architecture.Tests;

public sealed class ProjectDependencyTests
{
    [Theory]
    [InlineData("Domain", new string[] { })]
    [InlineData("Application", new[] { "Domain" })]
    [InlineData("Infrastructure", new[] { "Application", "Domain" })]
    [InlineData("Api", new[] { "Application", "Infrastructure" })]
    [InlineData("Functions", new[] { "Application", "Infrastructure" })]
    public void Production_projects_have_only_the_agreed_direct_dependencies(
        string layer, string[] dependencies)
    {
        var project = ReadProject(layer);
        var projectDirectory = Path.Combine(FindRoot(), "src", $"AngularApiTemplate.{layer}");
        var expected = dependencies.Select(dependency => Path.GetFullPath(Path.Combine(
            FindRoot(), "src", $"AngularApiTemplate.{dependency}",
            $"AngularApiTemplate.{dependency}.csproj"))).Order().ToArray();
        var actual = project.Descendants("ProjectReference")
            .Select(reference => Path.GetFullPath(Path.Combine(projectDirectory,
                reference.Attribute("Include")!.Value))).Order().ToArray();
        Assert.Equal(expected, actual);
    }

    [Theory]
    [InlineData("Domain")]
    [InlineData("Application")]
    public void Inner_layers_have_no_outer_framework_dependencies(string layer)
    {
        var project = ReadProject(layer);
        Assert.Empty(project.Descendants("FrameworkReference"));
        var allowed = layer == "Domain" ? [] : new[]
        {
            "Microsoft.Extensions.DependencyInjection.Abstractions",
            "Microsoft.EntityFrameworkCore"
        };
        Assert.All(project.Descendants("PackageReference"), reference =>
            Assert.Contains(reference.Attribute("Include")!.Value, allowed));
    }

    [Theory]
    [InlineData("Domain")]
    [InlineData("Application")]
    [InlineData("Infrastructure")]
    [InlineData("Api")]
    [InlineData("Functions")]
    public void Production_projects_do_not_add_forbidden_framework_packages(string layer)
    {
        string[] forbiddenPrefixes =
        [
            "AutoMapper", "Mapster", "MediatR", "Ardalis.Specification", "FirebaseAdmin",
            "Microsoft.EntityFrameworkCore.InMemory"
        ];
        Assert.All(ReadProject(layer).Descendants("PackageReference"), reference =>
        {
            var name = reference.Attribute("Include")!.Value;
            Assert.DoesNotContain(forbiddenPrefixes,
                prefix => name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));
        });
    }

    [Fact]
    public void Explicit_imports_are_centralized_and_http_contracts_are_classes()
    {
        foreach (var tree in new[] { "src", "tests" })
        {
            foreach (var file in Directory.EnumerateFiles(Path.Combine(FindRoot(), tree), "*.cs", SearchOption.AllDirectories))
            {
                var parts = Path.GetRelativePath(FindRoot(), file).Split(Path.DirectorySeparatorChar);
                if (parts.Contains("obj") || parts.Contains("bin"))
                {
                    continue;
                }

                var source = File.ReadAllText(file);
                var imports = Regex.Matches(source,
                    @"^\s*(?:global\s+)?using\s+(?:static\s+)?(?:[\w.]+\s*=\s*)?[\w.:<>]+\s*;", RegexOptions.Multiline);
                Assert.True(imports.Count == 0 || Path.GetFileName(file) == "GlobalUsings.cs",
                    $"Move namespace imports from {file} to its project's GlobalUsings.cs.");
                if (Path.GetFileName(file) == "GlobalUsings.cs")
                {
                    Assert.All(imports.Cast<Match>(), match => Assert.StartsWith("global using ", match.Value.Trim()));
                }

                if (parts.Contains("AngularApiTemplate.Api") &&
                    (file.EndsWith("Request.cs", StringComparison.Ordinal) || file.EndsWith("Response.cs", StringComparison.Ordinal)))
                {
                    Assert.DoesNotMatch(@"\brecord\s+", source);
                    Assert.Matches(@"\bclass\s+", source);
                }
            }
        }
    }

    private static XDocument ReadProject(string layer) => XDocument.Load(Path.Combine(
        FindRoot(), "src", $"AngularApiTemplate.{layer}", $"AngularApiTemplate.{layer}.csproj"));

    private static string FindRoot()
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory);
            directory is not null; directory = directory.Parent)
        {
            if (File.Exists(Path.Combine(directory.FullName, "AngularApiTemplate.slnx")))
            {
                return directory.FullName;
            }
        }

        throw new InvalidOperationException("Solution root not found.");
    }
}
