import axios from "axios";

const api = axios.create({
  baseURL: "/api", // via vite proxy em dev
  timeout: 30000,
});

// interceptors para erros (opcional)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // pode centralizar mensagens
    return Promise.reject(err);
  }
);

export default api;
