import React from 'react';

const CvFeedback = ({ cvText }) => {
    // Enkel simulering av feedback
    const feedback = [];
    if(!cvText || cvText.length < 50) feedback.push('CV is too short');
    if(cvText && !cvText.includes('Experience')) feedback.push('Consider adding Experience section');
    if(cvText && !cvText.includes('Skills')) feedback.push('Consider adding Skills section');

    return (
        <div>
            <h3>CV Feedback</h3>
            {feedback.length === 0 ? <p>Looks good!</p> : <ul>{feedback.map((f,i) => <li key={i}>{f}</li>)}</ul>}
        </div>
    );
};

export default CvFeedback;
