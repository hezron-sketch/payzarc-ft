import axios from "axios";
import { SPRINGBOOT_URL, TRANSACTIONS_URL, CONTACTS_URL } from "./constants";

const getTunnelHeaders = () => ({
  "Bypass-Tunnel-Reminder": "true",
});

const instanceConfig = {
  validateStatus: (status) => status >= 200 && status < 300,
  timeout: 15000,
};

const DEV_BYPASS_AUTH = process.env.REACT_APP_BYPASS_AUTH === "true";

const setupSessionInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
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
          window.location.href = "/login";
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

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    return config;
  });
  setupSessionInterceptor(instance);
};

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

addInterceptors(springApi);
addInterceptors(transactionsApi);
addInterceptors(contactsApi);

export const djangoApis = { system1: transactionsApi, system2: contactsApi };

export default springApi;
