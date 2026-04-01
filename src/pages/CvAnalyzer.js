import { useState } from "react";
import { analyzeCV } from "../services/api";

function CvAnalyzer() {
  const [cvText, setCvText] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    try {
      const data = await analyzeCV(cvText);
      setResult(data);
    } catch (err) {
      alert("Du är inte inloggad eller backend körs inte");
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>CV Analyzer</h2>
      <textarea
        rows="10"
        cols="60"
        placeholder="Klistra in ditt CV här..."
        value={cvText}
        onChange={(e) => setCvText(e.target.value)}
      />
      <br /><br />
      <button onClick={handleSubmit}>Analysera</button>

      {result && (
        <div style={{ marginTop: "20px" }}>
          <h3>Score: {result.score}</h3>
          <h4>Strengths:</h4>
          <ul>{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>

          <h4>Improvements:</h4>
          <ul>{result.improvements.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export default CvAnalyzer;
