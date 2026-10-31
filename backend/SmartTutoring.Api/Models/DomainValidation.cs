using System.Text.RegularExpressions;

namespace SmartTutoring.Api.Models;

public static partial class DomainValidation
{
    [GeneratedRegex(@"^[\p{L}]+(?:[ '\-][\p{L}]+)*$", RegexOptions.CultureInvariant)]
    private static partial Regex PersonNameRegex();

    [GeneratedRegex(@"^ST-\d{4}$", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase)]
    private static partial Regex CarnetRegex();

    [GeneratedRegex(@"^\d{4}-?\d{4}$", RegexOptions.CultureInvariant)]
    private static partial Regex PhoneRegex();

    [GeneratedRegex(@"^(?=.*\p{L})[\p{L}\p{N} .+#()/\-]{2,120}$", RegexOptions.CultureInvariant)]
    private static partial Regex SubjectNameRegex();

    public static bool IsPersonName(string value) =>
        !string.IsNullOrWhiteSpace(value) && PersonNameRegex().IsMatch(value.Trim());

    public static bool IsCarnet(string value) =>
        !string.IsNullOrWhiteSpace(value) && CarnetRegex().IsMatch(value.Trim());

    public static bool IsPhone(string? value) =>
        string.IsNullOrWhiteSpace(value) || PhoneRegex().IsMatch(value.Trim());

    public static bool IsSubjectName(string value) =>
        !string.IsNullOrWhiteSpace(value) && SubjectNameRegex().IsMatch(value.Trim());
}