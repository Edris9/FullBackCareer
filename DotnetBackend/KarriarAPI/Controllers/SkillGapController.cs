using KarriarAPI.Data;
using KarriarAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace KarriarAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SkillGapController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;
        private readonly HttpClient _http;

        private readonly IHttpClientFactory _httpFactory;

        public SkillGapController(AppDbContext db, IConfiguration config, IHttpClientFactory httpFactory)
        {
            _db = db;
            _config = config;
            _httpFactory = httpFactory;
        }

        [HttpPost("analyze")]
        public async Task<IActionResult> Analyze([FromBody] SkillGapRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            if (string.IsNullOrWhiteSpace(request.CvText) || string.IsNullOrWhiteSpace(request.JobTitle))
                return BadRequest(new { error = "CV-text och jobbtitel krävs." });
            var analysis = await AnalyzeWithGroq(request.CvText, request.JobTitle);
            return Ok(analysis);
        }

        [HttpGet("youtube")]
        public async Task<IActionResult> GetYouTube([FromQuery] string skill)
        {
            var apiKey = _config["YouTube:ApiKey"];
            var query = Uri.EscapeDataString($"{skill} tutorial");
            var url = $"https://www.googleapis.com/youtube/v3/search?part=snippet&q={query}&type=video&maxResults=3&key={apiKey}";

            var response = await _http.GetAsync(url);
            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<JsonElement>(json);

            var videos = data.GetProperty("items").EnumerateArray().Select(item => new
            {
                id = item.GetProperty("id").GetProperty("videoId").GetString(),
                title = item.GetProperty("snippet").GetProperty("title").GetString(),
                channel = item.GetProperty("snippet").GetProperty("channelTitle").GetString(),
                thumbnail = item.GetProperty("snippet").GetProperty("thumbnails").GetProperty("medium").GetProperty("url").GetString(),
                url = $"https://www.youtube.com/watch?v={item.GetProperty("id").GetProperty("videoId").GetString()}",
            }).ToList();

            return Ok(new { videos });
        }

        [HttpGet("coursera")]
        public async Task<IActionResult> GetCoursera([FromQuery] string skill)
        {
            var apiKey = _config["Groq:ApiKey"];
            var http = _httpFactory.CreateClient();
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            var prompt = new
            {
                model = "llama-3.3-70b-versatile",
                messages = new[]
                {
                    new {
                        role = "system",
                        content = @"Du är en världsledande expert på onlineutbildning med djup och aktuell kännedom om Courseras hela kursutbud år 2024-2025.

Du känner till hundratals kurser från Google, Meta, IBM, Stanford, Duke, DeepLearning.AI, University of Michigan och andra toppinstitutioner.

ABSOLUTA KRAV:
- Returnera ENDAST kurser som faktiskt existerar på Coursera just nu
- URL-format MÅSTE vara: https://www.coursera.org/learn/[exakt-kursslug]
- Välj kurser med rating 4.5+ och minst 10 000 recensioner
- Prioritera kurser från erkända institutioner (Google, IBM, Stanford, Meta, DeepLearning.AI)
- Inkludera en blandning: en för nybörjare, en medelnivå, en avancerad
- Priser i SEK: Gratis att följa / ~349 kr/månad för certifikat

Svara ALLTID i exakt detta JSON-format utan extra text:
{
  ""courses"": [
    {
      ""title"": ""Exakt kursnamn som det står på Coursera"",
      ""provider"": ""Google / IBM / Stanford / etc"",
      ""price"": ""Gratis att följa / ~349 kr/månad för certifikat"",
      ""level"": ""Nybörjare / Medelnivå / Avancerad"",
      ""duration"": ""X veckor / X månader"",
      ""rating"": ""4.8"",
      ""url"": ""https://www.coursera.org/learn/exact-slug"",
      ""description"": ""Konkret beskrivning av vad kursen lär ut och varför den är relevant""
    }
  ]
}"
                    },
                    new {
                        role = "user",
                        content = $@"Hitta de 3 absolut bästa och mest relevanta Coursera-kurserna för att lära sig ""{skill}"".

Tänk steg för steg:
1. Vilka är de mest populära och välbetygsatta kurserna för {skill} på Coursera?
2. Vilka institutioner erbjuder de bästa kurserna inom detta område?
3. Välj en kurs per nivå (nybörjare, medel, avancerad) om möjligt

Returnera exakt 3 kurser med riktiga Coursera-URL:er."
                    }
                },
                response_format = new { type = "json_object" },
                temperature = 0.1,
                max_tokens = 1000,
            };

            var response = await http.PostAsync(
                "https://api.groq.com/openai/v1/chat/completions",
                new StringContent(JsonSerializer.Serialize(prompt), Encoding.UTF8, "application/json")
            );

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<GroqResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            var content = result?.Choices?[0]?.Message?.Content ?? "{}";
            return Ok(JsonSerializer.Deserialize<JsonElement>(content));
        }

        [HttpGet("udemy")]
        public async Task<IActionResult> GetUdemy([FromQuery] string skill)
        {
            var apiKey = _config["Groq:ApiKey"];
            var http = _httpFactory.CreateClient();
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            var prompt = new
            {
                model = "llama-3.3-70b-versatile",
                messages = new[]
                {
                    new {
                        role = "system",
                        content = @"Du är en världsledande expert på Udemy med djup och aktuell kännedom om plattformens hela kursutbud år 2024-2025.

Du känner till tusentals kurser och deras exakta URL:er, instruktörer, betyg och innehåll.

ABSOLUTA KRAV:
- Returnera ENDAST kurser som faktiskt existerar på Udemy just nu
- URL-format MÅSTE vara: https://www.udemy.com/course/[exakt-kursslug]/
- Välj kurser med rating 4.5+ och minst 10 000 recensioner
- Prioritera välkända instruktörer (Jose Portilla, Andrei Neagoie, Brad Traversy, Angela Yu, Stephen Grider, etc.)
- Priser: ordinarie 999-1299 kr, reapris 89-189 kr (Udemy har alltid rea)
- Kurserna ska vara uppdaterade 2023-2024

Svara ALLTID i exakt detta JSON-format utan extra text:
{
  ""courses"": [
    {
      ""title"": ""Exakt kursnamn som det står på Udemy"",
      ""instructor"": ""Instruktörens fullständiga namn"",
      ""price"": ""129 kr"",
      ""originalPrice"": ""1 099 kr"",
      ""level"": ""Nybörjare / Alla nivåer / Avancerad"",
      ""duration"": ""X timmar"",
      ""rating"": ""4.7"",
      ""reviews"": 45230,
      ""url"": ""https://www.udemy.com/course/exact-course-slug/"",
      ""headline"": ""Kort och träffsäker beskrivning av kursens innehåll""
    }
  ]
}"
                    },
                    new {
                        role = "user",
                        content = $@"Hitta de 3 absolut bästa och mest sålda Udemy-kurserna för att lära sig ""{skill}"".

Tänk steg för steg:
1. Vilka är de mest populära kurserna för {skill} på Udemy med flest recensioner?
2. Vilka välkända instruktörer undervisar inom detta område?
3. Välj kurser med högt antal recensioner (10 000+) och rating 4.5+

Returnera exakt 3 kurser med riktiga Udemy-URL:er och realistiska priser i SEK."
                    }
                },
                response_format = new { type = "json_object" },
                temperature = 0.1,
                max_tokens = 1000,
            };

            var response = await http.PostAsync(
                "https://api.groq.com/openai/v1/chat/completions",
                new StringContent(JsonSerializer.Serialize(prompt), Encoding.UTF8, "application/json")
            );

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<GroqResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            var content = result?.Choices?[0]?.Message?.Content ?? "{}";
            return Ok(JsonSerializer.Deserialize<JsonElement>(content));
        }

        private async Task<SkillGapAnalysisResult> AnalyzeWithGroq(string cvText, string jobTitle)
        {
            var apiKey = _config["Groq:ApiKey"];
            var http = _httpFactory.CreateClient();
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            var prompt = new
            {
                model = "llama-3.3-70b-versatile",
                messages = new[]
                {
                    new {
                        role = "system",
                        content = @"Du är en världsledande karriärcoach, teknisk rekryterare och kompetensanalytiker med 20+ års erfarenhet från Fortune 500-företag och tech-startups. Du har djup expertis inom vad olika roller faktiskt kräver på arbetsmarknaden 2024-2025.

══════════════════════════════════════
ANALYSPROCESS — FÖLJ EXAKT:
══════════════════════════════════════

STEG 1 — KARTLÄGG JOBBKRAV:
Identifiera vad tjänsten kräver baserat på branschstandard 2024-2025:
- Tekniska kärnkompetenser (programmeringsspråk, frameworks, verktyg, plattformar)
- Mjuka kompetenser (ledarskap, kommunikation, problemlösning, agilt arbetssätt)
- Erfarenhetsnivå och domänkunskap
- Certifieringar och utbildningskrav

STEG 2 — KARTLÄGG KANDIDATEN:
Analysera CV:t noggrant och identifiera:
- Explicit nämnda tekniska kompetenser
- Implicita kompetenser baserade på arbetslivserfarenhet och projekt
- Transfererbara kompetenser från angränsande områden
- Utbildningsbakgrund och certifieringar

STEG 3 — IDENTIFIERA GAP:
Jämför kraven mot kandidatens profil och klassificera:
- KRITISKA gap (hög): Blockerande — arbetsgivare kräver detta utan undantag
- VIKTIGA gap (medel): Reducerande — ökar anställningsbarheten avsevärt
- MERITERANDE gap (låg): Förstärkande — nice-to-have men inte avgörande

STEG 4 — BERÄKNA MATCHSCORE:
85-100: Utmärkt match — uppfyller nästan alla krav, stark kandidat
70-84: Bra match — uppfyller majoriteten av kraven
55-69: Godkänd match — uppfyller grundkraven men har tydliga gap
40-54: Svag match — för många kritiska gap för rollen
Under 40: Fel profil — bör söka mer lämpade roller

══════════════════════════════════════
PRIORITERINGSREGLER:
══════════════════════════════════════
""hög"": Kompetens som 90%+ av arbetsgivare kräver för denna roll
""medel"": Kompetens som 50-90% av arbetsgivare efterfrågar
""låg"": Kompetens som är meriterande men sällan ett hårt krav

Svara ALLTID i exakt detta JSON-format utan extra text eller förklaringar:
{
  ""requiredSkills"": [""5-8 konkreta kompetenser som tjänsten kräver""],
  ""candidateSkills"": [""4-8 kompetenser kandidaten faktiskt har baserat på CV:t""],
  ""gaps"": [
    {
      ""skill"": ""Exakt kompetensnamn (t.ex. 'Kubernetes', 'React', 'Machine Learning')"",
      ""priority"": ""hög"",
      ""description"": ""Specifik och handlingsorienterad förklaring: varför detta krävs för rollen och vad kandidaten konkret kan göra för att fylla gapet""
    }
  ],
  ""matchScore"": 72,
  ""summary"": ""En professionell och konkret mening som sammanfattar kandidatens lämplighet och viktigaste styrkor/svagheter för just denna roll""
}"
                    },
                    new {
                        role = "user",
                        content = $@"Gör en djupgående och precis kompetensgapanalys.

TJÄNST: {jobTitle}
KONTEXT: Analysera vad en {jobTitle}-roll typiskt kräver på den svenska/nordiska arbetsmarknaden 2024-2025.

CV-INNEHÅLL:
═══════════════════════════════════
{cvText[..Math.Min(cvText.Length, 4000)]}
═══════════════════════════════════

Tänk steg för steg:
1. Vad kräver en {jobTitle} hos ett modernt tech-företag idag?
2. Vilka kompetenser har denna kandidat explicit och implicit?
3. Vilka är de viktigaste gapen som faktiskt påverkar anställningsbarheten?
4. Hur väl matchar kandidaten rollen totalt sett?

Identifiera 3-6 konkreta, relevanta kompetensgap. Var specifik — undvik generella råd."
                    }
                },
                response_format = new { type = "json_object" },
                temperature = 0.15,
                max_tokens = 1500,
            };

            var response = await http.PostAsync(
                "https://api.groq.com/openai/v1/chat/completions",
                new StringContent(JsonSerializer.Serialize(prompt), Encoding.UTF8, "application/json")
            );

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<GroqResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            var content = result?.Choices?[0]?.Message?.Content ?? "{}";
            return JsonSerializer.Deserialize<SkillGapAnalysisResult>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? new SkillGapAnalysisResult();
        }
    }

    public class SkillGapRequest
    {
        public string CvText { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
    }

    public class SkillGapAnalysisResult
    {
        public List<string> RequiredSkills { get; set; } = new();
        public List<string> CandidateSkills { get; set; } = new();
        public List<GapItemResult> Gaps { get; set; } = new();
        public int MatchScore { get; set; } = 50;
        public string? Summary { get; set; }
    }

    public class GapItemResult
    {
        public string Skill { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}