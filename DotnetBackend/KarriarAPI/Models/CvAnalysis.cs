using System;
using System.Collections.Generic;

namespace KarriarAPI.Models
{
    public class CvAnalysis
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser User { get; set; } = null!;
        public string Filename { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
        public int Score { get; set; }
        public int AtsScore { get; set; }
        public List<string> Strengths { get; set; } = new();
        public List<string> Improvements { get; set; } = new();
        public List<string> Keywords { get; set; } = new();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}