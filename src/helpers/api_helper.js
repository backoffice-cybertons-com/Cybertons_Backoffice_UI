import axios from "axios";
import { api } from "../config";
import secureStorage from "../utils/secureStorage";
import { getSelectedFiscalYearId } from "../utils/fiscalYearStorage";

// default
axios.defaults.baseURL = api.API_URL;
// content type
axios.defaults.headers.post["Content-Type"] = "application/json";

// Request interceptor to add auth token and company ID
axios.interceptors.request.use(
  function (config) {
    const token = secureStorage.getSecure('authToken');
    const companyId = secureStorage.getPlain('companyId');

    if (token) {
      config.headers["Authorization"] = "Bearer " + token;
    }
    
    if (companyId) {
      config.headers["X-Company-Id"] = companyId;
    }

    const fiscalYearId = getSelectedFiscalYearId();
    if (fiscalYearId) {
      config.headers["X-Fiscal-Year-Id"] = fiscalYearId;
    }

    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  function (response) {
    return response.data ? response.data : response;
  },
  function (error) {
    let message = "An error occurred";
    
    if (error.response && error.response.data) {
      const data = error.response.data;
      
      // If the backend returned a plain string (common for Conflict/BadRequest)
      if (typeof data === 'string') {
        message = data;
      } 
      // If it's an object with an 'error' or 'message' property
      else if (data.error) {
        message = data.error;
      } else if (data.Error) {
        message = data.Error;
      } else if (data.message) {
        message = data.message;
      } else if (data.Message) {
        message = data.Message;
      }
      
      // Special handling for specific status codes if no message found
      if (!message || message === "An error occurred") {
        switch (error.response.status) {
          case 409:
            message = "This record cannot be deleted because it is being used by another process or record.";
            break;
          case 401:
            message = "Invalid credentials or session expired";
            break;
          case 404:
            message = "The requested record was not found";
            break;
          case 500:
            message = "Internal Server Error. Please contact support.";
            break;
          default:
            message = error.message || "An unexpected error occurred";
        }
      }
    } else {
      message = error.message || "No responseจาก server";
    }

    return Promise.reject(message);
  }
);
/**
 * Sets the default authorization
 * @param {*} token
 */
const setAuthorization = (token) => {
  axios.defaults.headers.common["Authorization"] = "Bearer " + token;
};

class APIClient {
  /**
   * Fetches data from given url
   */

  //  get = (url, params) => {
  //   return axios.get(url, params);
  // };
  get = (url, params) => {
    let response;

    let paramKeys = [];

    if (params) {
      Object.keys(params).map(key => {
        paramKeys.push(key + '=' + params[key]);
        return paramKeys;
      });

      const queryString = paramKeys && paramKeys.length ? paramKeys.join('&') : "";
      response = axios.get(`${url}?${queryString}`, params);
    } else {
      response = axios.get(`${url}`, params);
    }

    return response;
  };
  /**
   * post given data to url
   */
  post = (url, data, config) => {
    return axios.post(url, data, config);
  };

  create = (url, data, config) => {
    return axios.post(url, data, config);
  };
  /**
   * Updates data
   */
  update = (url, data, config) => {
    return axios.patch(url, data, config);
  };

  put = (url, data, config) => {
    return axios.put(url, data, config);
  };
  /**
   * Delete
   */
  delete = (url, config) => {
    return axios.delete(url, { ...config });
  };
}
const getLoggedinUser = () => {
  const user = localStorage.getItem("authUser");
  if (!user) {
    return null;
  } else {
    return JSON.parse(user);
  }
};

export { APIClient, setAuthorization, getLoggedinUser };
