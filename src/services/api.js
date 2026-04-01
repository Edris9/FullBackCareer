const BASE_URL = "http://localhost:3000";

export const analyzeCV = async (cvText) => {
  const res = await fetch(`${BASE_URL}/api/analyze-cv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ cvText }),
  });

  if (!res.ok) {
    throw new Error("Unauthorized or server error");
  }

  return res.json();
};

export const generateCoverLetter = async (data) => {
  const res = await fetch(`${BASE_URL}/api/cover-letter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Unauthorized or server error");
  }

  return res.json();
};