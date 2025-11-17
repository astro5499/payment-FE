import i18n from "./i18n";

/**
 * Hàm load file JSON tương ứng với ngôn ngữ
 *
 * @param {string} lang - vi | en | ht
 */
export async function loadLanguage(lang) {
    try {
        // load JSON trong thư mục locales
        const translations = await import(`./locales/${lang}.json`);

        // add vào i18n runtime
        i18n.addResourceBundle(
            lang,
            "translation",
            translations.default,
            true,
            true
        );

        // change language
        i18n.changeLanguage(lang);
    } catch (error) {
        const translations = await import(`./locales/en.json`);

        // add vào i18n runtime
        i18n.addResourceBundle(
            lang,
            "translation",
            translations.default,
            true,
            true
        );

        // change language
        i18n.changeLanguage(lang);
    }
}
