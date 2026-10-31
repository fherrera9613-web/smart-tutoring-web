using System.Text.RegularExpressions;

namespace SmartTutoring.Api.Models;

public static partial class DomainValidation
{
    [GeneratedRegex(@"^[\p{L}]+(?:[ '\-][\p{L}]+)*$", RegexOptions.CultureInvariant)]
    private static partial Regex PersonNameRegex();

    [GeneratedRegex(@"^(?=.{4,20}$)[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$", RegexOptions.CultureInvariant)]
    private static partial Regex CarnetRegex();

    [GeneratedRegex(@"^(?=.*\p{L})[\p{L}\p{N} .+#()/\-]{2,120}$", RegexOptions.CultureInvariant)]
    private static partial Regex SubjectNameRegex();

    public static bool IsPersonName(string value) =>
        !string.IsNullOrWhiteSpace(value) && PersonNameRegex().IsMatch(value.Trim());

    public static bool IsCarnet(string value) =>
        !string.IsNullOrWhiteSpace(value) && CarnetRegex().IsMatch(value.Trim());

    public static bool IsSubjectName(string value) =>
        !string.IsNullOrWhiteSpace(value) && SubjectNameRegex().IsMatch(value.Trim());
}
