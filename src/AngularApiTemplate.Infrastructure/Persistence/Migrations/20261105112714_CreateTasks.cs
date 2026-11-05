#nullable disable

namespace AngularApiTemplate.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class CreateTasks : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Tasks",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                IsCompleted = table.Column<bool>(type: "bit", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Tasks", x => x.Id);
            });
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "Tasks");
    }
}
