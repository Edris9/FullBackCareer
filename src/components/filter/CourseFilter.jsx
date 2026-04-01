import React from 'react';

const CourseFilter = ({ filter, setFilter }) => {
    return (
        <div>
            <button onClick={() => setFilter('all')}>All</button>
            <button onClick={() => setFilter('free')}>Free</button>
            <button onClick={() => setFilter('paid')}>Paid</button>
        </div>
    );
};

export default CourseFilter;
