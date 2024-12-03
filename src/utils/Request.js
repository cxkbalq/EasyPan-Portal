import axios from 'axios'

import { ElLoading } from 'element-plus'
import router from '@/router'

import Message from '../utils/Message'
import VueCookies from "vue-cookies";

const contentTypeForm = 'application/x-www-form-urlencoded;charset=UTF-8'
const contentTypeJson = 'application/json'
//arraybuffer	ArrayBuffer对象
//blob	Blob对象
//document	Documnet对象
//json	JavaScript object, parsed from a JSON string returned by the server
//text	DOMString
const responseTypeJson = "json"

let loading = null;
const instance = axios.create({
    baseURL: '/api',
    timeout: 20 * 1000,
});
//请求前拦截器
instance.interceptors.request.use(
    (config) => {
        const jwtToken = VueCookies.get("userInfo");
        // 在这里可以动态设置请求头部
        if(jwtToken){
            config.headers['jwtToken'] = jwtToken.jwt;
        }
        if (config.showLoading) {
            loading = ElLoading.service({
                lock: true,
                text: '加载中......',
                background: 'rgba(0, 0, 0, 0.7)',
            });
        }
        return config;
    },
    (error) => {
        if (config.showLoading && loading) {
            loading.close();
        }
        Message.error("请求发送失败");
        return Promise.reject("请求发送失败");
    }
);
//请求后拦截器
instance.interceptors.response.use(
    (response) => {
        const { showLoading, errorCallback, showError = true, responseType } = response.config;
        if (showLoading && loading) {
            loading.close()
        }
        const responseData = response.data;
        if (responseType == "arraybuffer" || responseType == "blob") {
            return responseData;
        }
        //正常请求
        if (responseData.code == 200) {
            return responseData;
        } else if (responseData.code == 901) {
             if(isMobileDevice){
                 //登录超时
                 router.push("/phone/login?redirectUrl=" + encodeURI(router.currentRoute.value.path));
             }else {
                 //登录超时
                 router.push("/login?redirectUrl=" + encodeURI(router.currentRoute.value.path));
             }

            return Promise.reject({ showError: false, msg: "登录超时" });
        } else {
            //其他错误
            if (errorCallback) {
                errorCallback(responseData.info);
            }
            return Promise.reject({ showError: showError, msg: responseData.info });
        }
    },
    (error) => {
        if (error.config.showLoading && loading) {
            loading.close();
        }
        return Promise.reject({ showError: true, msg: "网络异常" })
    }
);
const isMobileDevice = () => {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};
const request = (config) => {
    const { url, params, dataType, showLoading = true, responseType = responseTypeJson } = config;
    let contentType = contentTypeForm;
    let formData = new FormData();// 创建form对象
    for (let key in params) {
        formData.append(key, params[key] == undefined ? "" : params[key]);
    }
    if (dataType != null && dataType == 'json') {
        contentType = contentTypeJson;
    }
    let headers = {
        'Content-Type': contentType,
        'X-Requested-With': 'XMLHttpRequest',
    }

    return instance.post(url, formData, {
        onUploadProgress: (event) => {
            if (config.uploadProgressCallback) {
                config.uploadProgressCallback(event);
            }
        },
        responseType: responseType,
        headers: headers,
        showLoading: showLoading,
        errorCallback: config.errorCallback,
        showError: config.showError
    }).catch(error => {
        console.log(error);
        if (error.showError) {
            Message.error(error.msg);
        }
        return null;
    });
};

export default request;