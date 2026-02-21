import i18n from "../i18n";

/**
 * Global translation function that can be used outside of React components.
 * @param {string} key - The key to translate.
 * @returns {string} - The translated string.
 */
export const t = (key) => {
    return i18n.t(key);
};

/**
 * Translates an array of table column objects.
 * Assumes column objects have a 'header' property that should be translated.
 * @param {Array} columns - The columns array.
 * @returns {Array} - The translated columns array.
 */
export const translateColumns = (columns) => {
    return columns.map(column => {
        if (typeof column.header === 'string') {
            return {
                ...column,
                header: i18n.t(column.header)
            };
        }
        return column;
    });
};

/**
 * Returns the current active language.
 */
export const getCurrentLanguage = () => {
    return i18n.language;
};

/**
 * Changes the current language globally.
 * @param {string} lng - Language code (e.g., 'en', 'ch').
 */
export const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("I18N_LANGUAGE", lng);
};

export default {
    t,
    translateColumns,
    getCurrentLanguage,
    changeLanguage
};
