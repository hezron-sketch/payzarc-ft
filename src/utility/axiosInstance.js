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

const setupSessionInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      // Only an *expired session* should try a refresh / force a reload to
      // the login page — a 401 with no token on hand just means "this login
      // attempt was rejected", and the login page is already open, so
      // redirecting there would reload it and blow away the in-page error
      // popup before it ever renders.
      const originalRequest = error.config;
      const hadToken = !!localStorage.getItem("accessToken");

      if (
        error.response?.status === 401 &&
        !DEV_BYPASS_AUTH &&
        hadToken &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;
        try {
          const refreshResponse = await springApi.post("/api/refresh");
          const newAccessToken = refreshResponse.data.accessToken;
          localStorage.setItem("accessToken", newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          window.location.href = "/components/member/login";
          return Promise.reject(refreshError);
        }
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

    // FormData (e.g. face-verification image uploads) needs the browser to
    // generate its own multipart boundary — a hardcoded Content-Type blocks that.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

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
