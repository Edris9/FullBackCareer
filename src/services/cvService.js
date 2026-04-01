import axios from 'axios';

// Exempel på service-funktion
const API_URL = 'https://api.example.com/cv';

export const getCvData = async () => {
    try {
        const response = await axios.get(API_URL);
        return response.data;
    } catch (error) {
        console.error('Error fetching CV data:', error);
        throw error;
    }
};
