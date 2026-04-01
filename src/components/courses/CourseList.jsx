import React from 'react';
import CourseCard from './CourseCard';

const CourseList = ({ courses, filter }) => {
    const filtered = courses.filter(c => filter === 'all' || c.type === filter);
    return (
        <div>
            {filtered.map((c, idx) => <CourseCard key={idx} course={c} />)}
        </div>
    );
};

export default CourseList;
