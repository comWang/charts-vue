import axios from 'axios';
import { elegantPromise } from './common';

const instance = axios.create({
  baseURL: process.env.VUE_APP_BASEURL,
  timeout: 5000
});

instance.interceptors.response.use(function (response) {
  // 对响应数据做点什么
  return response.data;
}, function (error) {
  // 对响应错误做点什么
  return Promise.reject(error);
});

function get(url, params, config) {
  return elegantPromise(instance.get(url, {
    params,
    ...config,
  }));
}

function post(...rest) {
  return elegantPromise(instance.post(rest));
}

function put(...rest) {
  return elegantPromise(instance.put(rest));
}

function del(...rest) {
  return elegantPromise(instance.delete(rest));
}

export { get, post, put, del };
export default instance;