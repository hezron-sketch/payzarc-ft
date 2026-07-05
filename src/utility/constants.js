// export const API_URL='https://springboot.loca.lt';

/**
 * Application Constants
 * These constants pull from the .env file.
 * Ensure your .env is in the root directory and you have restarted the React server.
 */

// Core Services
export const SPRINGBOOT_URL = process.env.REACT_APP_API_URL;
export const STAFF_API_URL = process.env.REACT_APP_STAFF_API_URL;

// Django Microservices
export const CONTACTS_URL = process.env.REACT_APP_DJANGO_CONTACTS_URL;
export const TRANSACTIONS_URL = process.env.REACT_APP_DJANGO_TX_URL;

// Optional: Global Timeout Configuration (if you want a centralized timeout)
export const API_TIMEOUT = 15000;


// Add this line to your existing constants.js
export const API_URL = process.env.REACT_APP_API_URL;

// Keep your existing exports
// export const SPRINGBOOT_URL = process.env.REACT_APP_API_URL;
// export const CONTACTS_URL = process.env.REACT_APP_DJANGO_CONTACTS_URL;
// export const TRANSACTIONS_URL = process.env.REACT_APP_DJANGO_TX_URL;
// export const STAFF_API_URL = process.env.REACT_APP_STAFF_API_URL;
// export const API_TIMEOUT = 15000;



