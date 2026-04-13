using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;

namespace KarriarAPI.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string Name { get; set; } = string.Empty;
        public int Xp { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<CvAnalysis> CvAnalyses { get; set; } = new List<CvAnalysis>();
        public ICollection<Certificate> Certificates { get; set; } = new List<Certificate>();
    }
}