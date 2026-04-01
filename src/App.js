import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import CvAnalyzer from "./pages/CvAnalyzer";
import CoverLetter from "./pages/CoverLetter";

function App() {
  return (
    <Router>
      <div style={{ padding: "20px" }}>
        <nav>
          <Link to="/">CV Analyzer</Link> |{" "}
          <Link to="/cover-letter">Cover Letter</Link>
        </nav>

        <Routes>
          <Route path="/" element={<CvAnalyzer />} />
          <Route path="/cover-letter" element={<CoverLetter />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
