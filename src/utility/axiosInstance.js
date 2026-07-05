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

const setupRefreshInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 Unauthorized
      // if (error.response?.status === 401 && !originalRequest._retry) {
      //   originalRequest._retry = true;
      //   try {
      //     const refreshResponse = await springApi.post("/api/refresh");
      //     const newAccessToken = refreshResponse.data.accessToken;
      //     localStorage.setItem("accessToken", newAccessToken);
      //     originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      //     return instance(originalRequest);
      //   } catch (refreshError) {
      //     localStorage.clear();if (error.response?.status === 401 && !originalRequest._retry) {
      //   originalRequest._retry = true;
      //   try {
      //     const refreshResponse = await springApi.post("/api/refresh");
      //     const newAccessToken = refreshResponse.data.accessToken;
      //     localStorage.setItem("accessToken", newAccessToken);
      //     originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      //     return instance(originalRequest);
      //   } catch (refreshError) {
      //     localStorage.clear();
      //     window.location.href = "/components/member/login";
      //     return Promise.reject(refreshError);
      //   }
      // }
      //     window.location.href = "/components/member/login";
      //     return Promise.reject(refreshError);
      //   }
      // }

      // For any other error (including 511 Network Auth Required),
      // this returns a rejected promise.
      return Promise.reject(error);
    },
  );
};

// const addInterceptors = (instance) => {
//   instance.interceptors.request.use((config) => {
//     config.headers = { ...config.headers, ...getTunnelHeaders() };
//     const accessToken = localStorage.getItem("accessToken");
//     if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
//     return config;
//   });
//   setupRefreshInterceptor(instance);
// };

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
// addInterceptors(springApi);
// addInterceptors(transactionsApi);
// addInterceptors(contactsApi);

export const djangoApis = { system1: transactionsApi, system2: contactsApi };

export default springApi;
