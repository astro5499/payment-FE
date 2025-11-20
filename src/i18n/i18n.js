import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
    lng: "vi",               // default ngôn ngữ ban đầu
    fallbackLng: "vi",       // fallback nếu lang không tồn tại
    resources: {},           // để trống — sẽ load động
    interpolation: {
        escapeValue: false
    }
});

export default i18n;
