import axios from "axios";
import { SPRINGBOOT_URL, TRANSACTIONS_URL, CONTACTS_URL } from "./constants";

const getTunnelHeaders = () => ({
  "Bypass-Tunnel-Reminder": "true",
});

// Enforce status validation: Only 2xx codes will resolve the promise.
// Anything else (4xx, 5xx, 511) will throw an error, stopping the jump.
const instanceConfig = {
  validateStatus: (status) => status >= 200 && status < 300,
  // withCredentials: true,
  timeout: 15000, // Added timeout to prevent hanging on network blocks
};

const DEV_BYPASS_AUTH = process.env.REACT_APP_BYPASS_AUTH === "true";

// No /api/refresh endpoint exists on any backend (mock or real) yet, so a 401
// just ends the session — nothing to silently retry.
const setupSessionInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && !DEV_BYPASS_AUTH) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.location.href = "/components/member/login";
      }
      return Promise.reject(error);
    },
  );
};

const addInterceptors = (instance) => {
  instance.interceptors.request.use((config) => {
    config.headers = { ...config.headers, ...getTunnelHeaders() };
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  });
  setupSessionInterceptor(instance);
};

// Create instances
export const springApi = axios.create({
  baseURL: SPRINGBOOT_URL,
  ...instanceConfig,
});
export const transactionsApi = axios.create({
  baseURL: TRANSACTIONS_URL,
  ...instanceConfig,
});
export const contactsApi = axios.create({
  baseURL: CONTACTS_URL,
  ...instanceConfig,
});

// Apply interceptors
addInterceptors(springApi);
addInterceptors(transactionsApi);
addInterceptors(contactsApi);

export const djangoApis = { system1: transactionsApi, system2: contactsApi };

export default springApi;
