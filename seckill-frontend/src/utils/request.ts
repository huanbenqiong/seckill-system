import axios from 'axios';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
});

// 请求拦截器
request.interceptors.request.use((config) => {
  // 从 localStorage 获取 token
  const token = localStorage.getItem('token');
  const tokenType = localStorage.getItem('tokenType') || 'Bearer';
  
  if (token) {
    // 添加到 Authorization Header
    config.headers['Authorization'] = `${tokenType} ${token}`;
    console.log('请求添加 Token:', `${tokenType} ${token.substring(0, 20)}...`);
  }
  
  // 同时添加 X-User-Id 方便后端直接获取
  const userId = localStorage.getItem('userId');
  if (userId) {
    config.headers['X-User-Id'] = userId;
    console.log('请求添加 X-User-Id:', userId);
  }
  
  console.log('请求配置:', config.method?.toUpperCase(), config.url);
  return config;
}, (error) => {
  console.error('请求拦截器错误:', error);
  return Promise.reject(error);
});

// 响应拦截器
request.interceptors.response.use((response) => {
  console.log('响应成功:', response.config.url, response.status, response.data);
  return response.data;
}, (error) => {
  console.error('响应错误:', error.config?.url, error.response?.status, error.response?.data);
  
  // 如果是 401 未授权，清除登录状态
  if (error.response?.status === 401) {
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('tokenType');
    
    console.log('收到 401 响应，清除登录状态');
    
    // 可以跳转到登录页
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }
  
  return Promise.reject(error);
});

export default request;
