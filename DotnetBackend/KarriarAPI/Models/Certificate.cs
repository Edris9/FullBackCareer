using System;

namespace KarriarAPI.Models
{
    public class Certificate
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser User { get; set; } = null!;
        public string Filename { get; set; } = string.Empty;
        public string CertifiedSkill { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public string? MatchedGap { get; set; }
        public int XpEarned { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}