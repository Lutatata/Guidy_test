// API 客户端 - 支持双模式
// 开发模式 (VITE_USE_API=true): 使用 axios 请求后端 API
// 生产模式 (VITE_USE_API=false): 使用 fetch 读取本地 JSON

import axios from 'axios';

const useApi = import.meta.env.VITE_USE_API === 'true';

// 创建统一的 client 对象
let client: unknown;

if (useApi) {
  // ========== API 模式 ==========
  const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 请求拦截器
  axiosClient.interceptors.request.use(
    (config) => {
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  axiosClient.interceptors.response.use(
    (response) => {
      return response.data;
    },
    (error) => {
      console.error('API Error:', error);
      return Promise.reject(error);
    }
  );

  client = axiosClient;
} else {
  // ========== 静态 JSON 模式 ==========
  const staticClient = {
    async get(url: string, config?: unknown): Promise<unknown> {
      const base = import.meta.env.BASE_URL || './';
      // 如果路径以 data/ 开头，直接拼接；否则添加 data/ 前缀
      const dataPath = url.startsWith('data/') ? url : `data/${url}`;
      const fullUrl = `${base}${dataPath}`;
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.statusText}`);
      }
      return response.json();
    },
    post(_url: string, _data?: unknown): Promise<unknown> {
      throw new Error('POST 请求在静态模式下不可用');
    },
    put(_url: string, _data?: unknown): Promise<unknown> {
      throw new Error('PUT 请求在静态模式下不可用');
    },
    delete(_url: string): Promise<unknown> {
      throw new Error('DELETE 请求在静态模式下不可用');
    },
  };

  client = staticClient;
}

export default client as {
  get: (url: string, config?: unknown) => Promise<unknown>;
  post: (url: string, data?: unknown) => Promise<unknown>;
  put: (url: string, data?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
};
