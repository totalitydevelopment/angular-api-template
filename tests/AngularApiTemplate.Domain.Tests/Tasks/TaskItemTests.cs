namespace AngularApiTemplate.Domain.Tests.Tasks;

public sealed class TaskItemTests
{
    [Fact]
    public void Factory_trims_title_generates_version_seven_id_and_defaults_to_incomplete()
    {
        var item = TaskItem.Create("  Write tests  ", null);
        Assert.Equal("Write tests", item.Title);
        Assert.Equal('7', item.Id.ToString()[14]);
        Assert.Null(item.Description);
        Assert.False(item.IsCompleted);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Factory_rejects_missing_or_blank_titles(string? title)
    {
        Assert.Throws<ArgumentException>(() => TaskItem.Create(title!, null));
    }

    [Fact]
    public void Field_limits_apply_after_trimming_and_invalid_replace_does_not_mutate_state()
    {
        var item = TaskItem.Create(" " + new string('t', 200) + " ", new string('d', 2000));
        Assert.Equal(200, item.Title.Length);
        Assert.Throws<ArgumentException>(() => item.Replace(new string('t', 201), null, true));
        Assert.Equal(200, item.Title.Length);
        Assert.Equal(2000, item.Description!.Length);
        Assert.False(item.IsCompleted);
        Assert.Throws<ArgumentException>(() => item.Replace("Valid", new string('d', 2001), true));
        Assert.Equal(200, item.Title.Length);
    }

    [Fact]
    public void Replace_replaces_all_editable_fields_and_preserves_id()
    {
        var item = TaskItem.Create("Original", "Description");
        var id = item.Id;
        item.Replace(" Updated ", null, true);
        Assert.Equal(id, item.Id);
        Assert.Equal("Updated", item.Title);
        Assert.Null(item.Description);
        Assert.True(item.IsCompleted);
    }
}
