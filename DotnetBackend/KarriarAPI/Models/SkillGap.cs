using System;
using System.Collections.Generic;

namespace KarriarAPI.Models
{
    public class SkillGap
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser User { get; set; } = null!;
        public string JobTitle { get; set; } = string.Empty;
        public int MatchScore { get; set; }
        public List<string> CandidateSkills { get; set; } = new();
        public List<string> RequiredSkills { get; set; } = new();
        public List<GapItem> Gaps { get; set; } = new();
        public string? Summary { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class GapItem
    {
        public string Skill { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}