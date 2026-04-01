import React, { useState } from 'react';
import CvUploader from '../components/cv/CvUploader';
import CvFeedback from '../components/feedback/CvFeedback';
import SkillGap from '../components/skillgap/SkillGap';
import CourseList from '../components/courses/CourseList';
import CourseFilter from '../components/filter/CourseFilter';

const sampleCourses = [
    { title: 'React Basics', description: 'Learn React from scratch', type: 'free' },
    { title: 'Advanced JavaScript', description: 'Deep dive into JS', type: 'paid' },
    { title: 'Career AI 101', description: 'Intro to career AI', type: 'free' },
    { title: 'Professional CV Writing', description: 'Improve your CV', type: 'paid' }
];

const Dashboard = () => {
    const [cvText, setCvText] = useState('');
    const [filter, setFilter] = useState('all');

    return (
        <div>
            <h1>Dashboard</h1>
            <CvUploader />
            <textarea 
                placeholder='Paste your CV text here...' 
                value={cvText} 
                onChange={e => setCvText(e.target.value)} 
                style={{ width: '100%', minHeight: '100px', marginTop: '10px' }}
            />
            <CvFeedback cvText={cvText} />
            <SkillGap />
            <CourseFilter filter={filter} setFilter={setFilter} />
            <CourseList courses={sampleCourses} filter={filter} />
        </div>
    );
};

export default Dashboard;
