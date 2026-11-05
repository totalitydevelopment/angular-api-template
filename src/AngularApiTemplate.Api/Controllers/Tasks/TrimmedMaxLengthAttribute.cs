namespace AngularApiTemplate.Api.Controllers.Tasks;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class TrimmedMaxLengthAttribute(int maximumLength) : ValidationAttribute
{
    public int MaximumLength { get; } = maximumLength;

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is string text && text.Trim().Length > MaximumLength)
        {
            var memberNames = validationContext.MemberName is { } name ? new[] { name } : null;
            return new ValidationResult(
                $"The field {validationContext.DisplayName} must not exceed {MaximumLength} characters after trimming.",
                memberNames);
        }

        return ValidationResult.Success;
    }
}
