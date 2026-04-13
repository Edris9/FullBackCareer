using KarriarAPI.Data;
using KarriarAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using UglyToad.PdfPig;

namespace KarriarAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CertificateController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;
        private readonly HttpClient _http;
        private readonly UserManager<ApplicationUser> _userManager;

        public CertificateController(AppDbContext db, IConfiguration config, IHttpClientFactory httpFactory, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _config = config;
            _http = httpFactory.CreateClient();
            _userManager = userManager;
        }

        [HttpGet("xp")]
        public async Task<IActionResult> GetXp()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var user = await _userManager.FindByIdAsync(userId);
            return Ok(new { xp = user?.Xp ?? 0 });
        }

        [HttpPost("upload")]
        public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] string? gaps)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

            if (file == null) return BadRequest(new { error = "Ingen fil uppladdad" });

            var gapList = string.IsNullOrEmpty(gaps)
                ? new List<GapItemResult>()
                : JsonSerializer.Deserialize<List<GapItemResult>>(gaps, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

            var certText = await ExtractText(file);
            var result = await AnalyzeCertificate(certText, file.FileName, gapList);

            var user = await _userManager.FindByIdAsync(userId);
            if (user != null)
            {
                user.Xp += result.XpEarned;
                await _userManager.UpdateAsync(user);
            }

            var cert = new Certificate
            {
                UserId = userId,
                Filename = file.FileName,
                CertifiedSkill = result.CertifiedSkill,
                Issuer = result.Issuer,
                MatchedGap = result.MatchedGap,
                XpEarned = result.XpEarned,
            };

            _db.Certificates.Add(cert);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                result.CertifiedSkill,
                result.Issuer,
                result.MatchedGap,
                result.XpEarned,
                result.Message,
                totalXp = user?.Xp ?? 0,
            });
        }

        private async Task<string> ExtractText(IFormFile file)
        {
            using var stream = file.OpenReadStream();
            using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
            var content = await reader.ReadToEndAsync();
            var sb = new StringBuilder();
            foreach (var c in content)
                if (c >= 32 && c < 127 || c == '\n' || c > 127) sb.Append(c);
            return sb.ToString();
        }

        private async Task<CertificateResult> AnalyzeCertificate(string certText, string filename, List<GapItemResult> gaps)
        {
            var apiKey = _config["Groq:ApiKey"];
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            var gapsText = gaps.Any()
                ? string.Join("\n", gaps.Select(g => $"- {g.Skill} (prioritet: {g.Priority})"))
                : "Inga gap identifierade";

            // Build messages as C# objects (avoid JS template literal syntax)
            var systemContent = "Du är en expert på att analysera certifikat och kompetensbevis.\n" +
                                "Din uppgift är att:\n" +
                                "1.Identifiera vilken kompetens certifikatet bevisar\n" +
                                "2.Jämföra med kandidatens identifierade kompetensgap\n" +
                                "3.Beräkna hur mycket XP kandidaten ska få\n\n" +
                                "XP - system:\n" +
                                "-Gap med prioritet \"hög\" som täcks: 100 XP\n" +
                                "- Gap med prioritet \"medel\" som täcks: 60 XP\n" +
                                "- Gap med prioritet \"låg\" som täcks: 30 XP\n" +
                                "- Certifikat som inte täcker något gap: 10 XP(för initiativet)\n\n" +
                                "Svara ALLTID i exakt detta JSON-format:\n" +
                                "{\n" +
                                "  \"certifiedSkill\": \"Namn på kompetensen certifikatet bevisar\",\n" +
                                "  \"issuer\": \"Utfärdare (t.ex. Google, AWS, Microsoft)\",\n" +
                                "  \"matchedGap\": \"Namn på det gap som täcks, eller null om inget gap täcks\",\n" +
                                "  \"gapPriority\": \"hög/medel/låg eller null\",\n" +
                                "  \"xpEarned\": 100,\n" +
                                "  \"message\": \"Grattis! Du har täckt ett kritiskt kompetensgap inom Docker och tjänat 100 XP!\"\n" +
                                "}";

            var userContent = new StringBuilder();
            userContent.AppendLine("Analysera detta certifikat och se om det täcker något av kandidatens kompetensgap.");
            userContent.AppendLine();
            userContent.AppendLine("CERTIFIKAT - INNEHÅLL:");
            userContent.AppendLine("═══════════════════════");
            userContent.AppendLine(!string.IsNullOrWhiteSpace(certText) ? certText : $"Kunde inte läsa certifikatet — bedöm baserat på filnamn: {filename}");
            userContent.AppendLine("═══════════════════════");
            userContent.AppendLine();
            userContent.AppendLine("KANDIDATENS KOMPETENSGAP:");
            userContent.AppendLine(gaps.Any()
                ? string.Join("\n", gaps.Select(g => $"- {g.Skill} (prioritet: {g.Priority})"))
                : "Inga gap identifierade ännu");
            userContent.AppendLine();
            userContent.AppendLine("Bestäm vilken XP kandidaten ska få och skriv ett uppmuntrande meddelande.");

            var messages = new[]
            {
                new { role = "system", content = systemContent },
                new { role = "user", content = userContent.ToString() }
            };

            var prompt = new
            {
                model = "llama-3.3-70b-versatile",
                messages = messages,
                response_format = new { type = "json_object" },
                temperature = 0.2
            };

            var requestJson = JsonSerializer.Serialize(prompt);
            var response = await _http.PostAsync(
                "https://api.groq.com/openai/v1/chat/completions",
                new StringContent(requestJson, Encoding.UTF8, "application/json")
            );

            var json = await response.Content.ReadAsStringAsync();

            // Assumes GroqResponse type exists elsewhere in the project
            var result = JsonSerializer.Deserialize<GroqResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            var content = result?.Choices?.FirstOrDefault()?.Message?.Content ?? "{}";

            try
            {
                return JsonSerializer.Deserialize<CertificateResult>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                    ?? new CertificateResult { XpEarned = 10, Message = "Certifikat mottaget! +10 XP" };
            }
            catch
            {
                return new CertificateResult { XpEarned = 10, Message = "Certifikat mottaget! +10 XP" };
            }
        }
    }

    public class CertificateResult
    {
        public string CertifiedSkill { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public string? MatchedGap { get; set; }
        public string? GapPriority { get; set; }
        public int XpEarned { get; set; } = 10;
        public string Message { get; set; } = string.Empty;
    }
}