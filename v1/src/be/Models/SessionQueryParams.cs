namespace HOPTranscribe.Models;

public class SessionQueryParams : PaginationParams
{
    public string? UserName { get; set; }
    public SessionStatus? Status { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? SearchTerm { get; set; } // Search in title
    public string? SortBy { get; set; } = "StartedAt"; // StartedAt, Title, Duration
    public bool SortDescending { get; set; } = true;
}
