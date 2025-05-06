import axios from "axios";

// تكوين الإعدادات الافتراضية لـ axios
axios.defaults.baseURL = "http://localhost:3000";
axios.defaults.withCredentials = true; // هام: للسماح بإرسال الكوكيز مع كل طلب
axios.defaults.headers.common["Content-Type"] = "application/json";

// طباعة كل طلب للتصحيح
axios.interceptors.request.use(
  (config) => {
    console.log(
      `API Request: ${config.method.toUpperCase()} ${config.url}`,
      config.data || {}
    );
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// إضافة interceptor للاستجابات
axios.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status}`, response.data);
    return response;
  },
  (error) => {
    console.error(
      "API Error:",
      error.response?.status,
      error.response?.data || error.message
    );
    if (error.response && error.response.status === 401) {
      console.log("Unauthorized access detected");
      // يمكنك إضافة منطق للتعامل مع الخطأ 401 هنا
    }
    return Promise.reject(error);
  }
);

export default axios;
