namespace AngularApiTemplate.Infrastructure.Persistence.Configurations;

public sealed class TaskItemConfiguration : IEntityTypeConfiguration<TaskItem>
{
    public void Configure(EntityTypeBuilder<TaskItem> builder)
    {
        builder.ToTable("Tasks");
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id).ValueGeneratedNever();
        builder.Property(item => item.Title).IsRequired().HasMaxLength(200);
        builder.Property(item => item.Description).HasMaxLength(2000);
        builder.Property(item => item.IsCompleted).IsRequired();
    }
}
