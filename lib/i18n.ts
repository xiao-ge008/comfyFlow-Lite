import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入翻译文件
import zhCommon from '../locales/zh/common.json';
import enCommon from '../locales/en/common.json';
import jaCommon from '../locales/ja/common.json';

const resources = {
  zh: {
    common: zhCommon,
  },
  en: {
    common: enCommon,
  },
  ja: {
    common: jaCommon,
  },
};

// 检查是否在浏览器环境中
const isBrowser = typeof window !== 'undefined';

const i18nInstance = i18n
  .use(initReactI18next);

// 只在浏览器环境中使用语言检测器
if (isBrowser) {
  i18nInstance.use(LanguageDetector);
}

i18nInstance.init({
  resources,
  fallbackLng: 'en',
  defaultNS: 'common',
  lng: 'en', // 始终从英语开始，避免SSR不匹配
  
  // 语言检测配置 - 只在浏览器中使用
  detection: isBrowser ? {
    order: ['localStorage', 'navigator', 'htmlTag'],
    lookupLocalStorage: 'i18nextLng',
    caches: ['localStorage'],
  } : undefined,

  interpolation: {
    escapeValue: false, // React已经默认转义
  },

  // 开发模式下的调试
  debug: false, // 关闭调试以减少SSR时的日志
  
  // SSR相关配置
  react: {
    useSuspense: false, // 关闭Suspense以避免SSR问题
  },
});

// 在浏览器环境中，初始化后立即进行语言检测和设置
if (isBrowser) {
  // 从localStorage获取用户之前选择的语言
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (savedLanguage && ['zh', 'en', 'ja'].includes(savedLanguage)) {
    i18nInstance.changeLanguage(savedLanguage);
  } else {
    // 如果没有保存的语言，使用浏览器语言检测
    const browserLanguage = navigator.language.toLowerCase();
    let detectedLanguage = 'en'; // 默认英语
    
    if (browserLanguage.startsWith('zh')) {
      detectedLanguage = 'zh';
    } else if (browserLanguage.startsWith('ja')) {
      detectedLanguage = 'ja';
    }
    
    i18nInstance.changeLanguage(detectedLanguage);
  }
}

export default i18nInstance;
