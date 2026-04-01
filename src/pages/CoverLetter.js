import { useState } from "react";
import { generateCoverLetter } from "../services/api";

function CoverLetter() {
  const [form, setForm] = useState({
    cvText: "",
    jobTitle: "",
    company: "",
    jobDescription: ""
  });

  const [letter, setLetter] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const data = await generateCoverLetter(form);
      setLetter(data.letter);
    } catch (err) {
      alert("Du är inte inloggad eller backend körs inte");
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Cover Letter Generator</h2>

      <input name="jobTitle" placeholder="Job Title" onChange={handleChange} /><br /><br />
      <input name="company" placeholder="Company" onChange={handleChange} /><br /><br />
      <textarea name="jobDescription" placeholder="Job Description" rows="5" onChange={handleChange}></textarea><br /><br />
      <textarea name="cvText" placeholder="Your CV" rows="5" onChange={handleChange}></textarea><br /><br />

      <button onClick={handleSubmit}>Generate</button>

      {letter && (
        <div style={{ marginTop: "20px" }}>
          <h3>Generated Letter:</h3>
          <p>{letter}</p>
        </div>
      )}
    </div>
  );
}

export default CoverLetter;
