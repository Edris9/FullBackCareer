using KarriarAPI.Data;
using KarriarAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
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
	public class CvAnalysisController : ControllerBase
	{
		private readonly AppDbContext _db;
		private readonly IConfiguration _config;
		private readonly HttpClient _http;

		public CvAnalysisController(AppDbContext db, IConfiguration config, IHttpClientFactory httpFactory)
		{
			_db = db;
			_config = config;
			_http = httpFactory.CreateClient();
		}

		[HttpPost("analyze")]
		public async Task<IActionResult> Analyze([FromForm] IFormFile file, [FromForm] string? jobTitle)
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

			if (file == null || file.Length == 0)
				return BadRequest(new { error = "Ingen fil uppladdad" });

			// Extract text from PDF using pdftotext approach
			var cvText = await ExtractTextFromPdf(file);

			if (string.IsNullOrWhiteSpace(cvText) || cvText.Length < 30)
				return BadRequest(new { error = "Kunde inte läsa PDF-innehållet" });

			// Call Groq API
			var analysis = await AnalyzeWithGroq(cvText, jobTitle ?? "");

			// Save to database
			var cvAnalysis = new CvAnalysis
			{
				UserId = userId,
				Filename = file.FileName,
				JobTitle = jobTitle ?? "",
				Score = analysis.Score,
				AtsScore = analysis.AtsScore,
				Strengths = analysis.Strengths,
				Improvements = analysis.Improvements,
				Keywords = analysis.Keywords,
			};

			_db.CvAnalyses.Add(cvAnalysis);
			await _db.SaveChangesAsync();

			return Ok(new
			{
				analysis.Score,
				analysis.AtsScore,
				analysis.Strengths,
				analysis.Improvements,
				analysis.Keywords,
				cvText = cvText[..Math.Min(cvText.Length, 4000)],
				filename = file.FileName,
				jobTitle = jobTitle ?? "",
				date = DateTime.Now.ToString("yyyy-MM-dd"),
			});
		}

		[HttpGet]
		public async Task<IActionResult> GetAll()
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
			var analyses = await _db.CvAnalyses
				.Where(c => c.UserId == userId)
				.OrderByDescending(c => c.CreatedAt)
				.ToListAsync();
			return Ok(analyses);
		}

		[HttpDelete("{id}")]
		public async Task<IActionResult> Delete(Guid id)
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
			var analysis = await _db.CvAnalyses.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
			if (analysis == null) return NotFound();
			_db.CvAnalyses.Remove(analysis);
			await _db.SaveChangesAsync();
			return Ok();
		}

		private async Task<string> ExtractTextFromPdf(IFormFile file)
		{
			using var stream = file.OpenReadStream();
			var ms = new MemoryStream();
			await stream.CopyToAsync(ms);
			var bytes = ms.ToArray();

			using var document = UglyToad.PdfPig.PdfDocument.Open(bytes);
			var sb = new StringBuilder();
			foreach (var page in document.GetPages())
			{
				sb.AppendLine(page.Text);
			}
			return sb.ToString();
		}

		private async Task<GroqAnalysisResult> AnalyzeWithGroq(string cvText, string jobTitle)
		{
			var apiKey = _config["Groq:ApiKey"];
			_http.DefaultRequestHeaders.Clear();
			_http.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

			var prompt = new
			{
				model = "llama-3.3-70b-versatile",
				messages = new[]
				{
					new
					{
						role = "system",
						content = @"Du är en världsledande HR - expert, rekryteringskonsult och karriärcoach med över 20 års erfarenhet från Fortune 500 - företag och tech-startups.Du har granskat över 50 000 CV: n och vet exakt vad rekryterare och ATS-system letar efter.

						Din uppgift är att ge en djupgående, ärlig och konstruktiv analys av CV:t.Du ska tänka som en rekryterare som har 10 sekunder på sig att bedöma kandidaten.

						══════════════════════════════════════
						POÄNGSÄTTNING — FÖLJ DESSA REGLER EXAKT:
						══════════════════════════════════════
						Overall Score(score):
						-85 - 95: Exceptionellt CV — tydligt, välstrukturerat, stark erfarenhet, perfekt anpassat
						- 75 - 84: Starkt CV — bra erfarenhet men mindre förbättringar behövs
						-65 - 74: Genomsnittligt CV — potential finns men tydliga svagheter
						- 55 - 64: Svagt CV — saknar viktiga delar eller är dåligt strukturerat
						- 50 - 54: Mycket svagt CV — men har åtminstone något innehåll
						- ALDRIG under 50 om CV:t har något läsbart innehåll

						ATS Score(atsScore):
						-Mäter hur väl CV: t klarar automatiserade ATS-system
						- Baseras på: nyckelord, formatering, tydliga sektioner, standardrubriker
						-Kan skilja sig från overall score(ett snyggt CV kan ha låg ATS om det saknar nyckelord)

						══════════════════════════════════════
						ANALYSERA DESSA DIMENSIONER:
						══════════════════════════════════════
						1.Struktur & Layout — Är CV:t lättläst? Tydliga sektioner?
						2.Erfarenhet & Relevans — Matchar erfarenheten sökt tjänst?
						3.Kvantifiering — Finns konkreta siffror och resultat ?
						4.Nyckelord — Rätt branschnyckelord för ATS?
						5.Utbildning — Relevant och tydligt presenterad?
						6.Tekniska kompetenser — Uppdaterade och relevanta verktyg?
						7.Personlig profilering — Tydlig yrkesidentitet?

						Svara ALLTID i exakt detta JSON-format utan extra text:
									{
										""score"": 74,
						  ""atsScore"": 70,
						  ""strengths"": [
							""Konkret styrka med förklaring varför det är bra"",
							""Konkret styrka med förklaring"",
							""Konkret styrka med förklaring"",
							""Konkret styrka med förklaring""
						  ],
						  ""improvements"": [
							""Specifikt förbättringsförslag med konkret åtgärd"",
							""Specifikt förbättringsförslag med konkret åtgärd"",
							""Specifikt förbättringsförslag med konkret åtgärd"",
							""Specifikt förbättringsförslag med konkret åtgärd""
						  ],
						  ""keywords"": [""nyckelord1"", ""nyckelord2"", ""nyckelord3"", ""nyckelord4"", ""nyckelord5"", ""nyckelord6"", ""nyckelord7"", ""nyckelord8""]
						}"
					},
					new
					{
						role = "user",
						content =
							"Analysera detta CV noggrant" +
							(string.IsNullOrWhiteSpace(jobTitle) ? "" : $" för tjänsten \"{jobTitle}\"") +
							@".

						Tänk steg för steg:
						1. Läs igenom hela CV:t
						2. Identifiera kandidatens starka sidor
						3. Hitta konkreta förbättringsområden
						4. Extrahera viktiga nyckelord för ATS
						5. Sätt en rättvis, motiverad score

						CV-innehåll:
						═══════════════════════
						" + cvText + @"
						═══════════════════════

						Ge en professionell, ärlig och konstruktiv analys. Var specifik — undvik generella råd."
					}
				},
				response_format = new { type = "json_object" },
				temperature = 0.2,
				max_tokens = 1500,
			};

			var response = await _http.PostAsync(
				"https://api.groq.com/openai/v1/chat/completions",
				new StringContent(JsonSerializer.Serialize(prompt), Encoding.UTF8, "application/json")
			);

			var json = await response.Content.ReadAsStringAsync();
			var result = JsonSerializer.Deserialize<GroqResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
			var content = result?.Choices?[0]?.Message?.Content ?? "{}";
			var analysis = JsonSerializer.Deserialize<GroqAnalysisResult>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
				?? new GroqAnalysisResult();

			if (analysis.Score < 50) analysis.Score = 50;
			if (analysis.Score > 95) analysis.Score = 95;
			if (analysis.AtsScore == 0) analysis.AtsScore = (int)(analysis.Score * 0.92);
			if (analysis.AtsScore < 50) analysis.AtsScore = 50;

			return analysis;
		}
	}

	public class GroqAnalysisResult
	{
		public int Score { get; set; } = 65;
		public int AtsScore { get; set; } = 60;
		public List<string> Strengths { get; set; } = new();
		public List<string> Improvements { get; set; } = new();
		public List<string> Keywords { get; set; } = new();
	}

	public class GroqResponse
	{
		public List<GroqChoice>? Choices { get; set; }
	}

	public class GroqChoice
	{
		public GroqMessage? Message { get; set; }
	}

	public class GroqMessage
	{
		public string? Content { get; set; }
	}
}