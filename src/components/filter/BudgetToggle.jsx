import React from 'react';

const BudgetToggle = ({ isPaid, setIsPaid }) => {
    return (
        <label>
            Paid Only
            <input 
                type='checkbox' 
                checked={isPaid} 
                onChange={() => setIsPaid(!isPaid)} 
            />
        </label>
    );
};

export default BudgetToggle;
