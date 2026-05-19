/**
 * Formats a number to exactly two decimal places.
 * If the input is not a valid number, it returns "0.00".
 * 
 * @param {number|string} value - The value to format.
 * @returns {string} - The formatted value as a string.
 */
export const formatToTwoDecimals = (value) => {
    if (value === null || value === undefined || value === "") return "0.00";
    const num = parseFloat(value);
    return isNaN(num) ? "0.00" : num.toFixed(2);
};

export const formatToFourDecimals = (value) => {
    if (value === null || value === undefined || value === "") return "0.0000";
    const num = parseFloat(value);
    return isNaN(num) ? "0.0000" : num.toFixed(4);
};

/**
 * Parses a string to a float with 2 decimal precision.
 * @param {string} value 
 * @returns {number}
 */
export const parseDecimal = (value) => {
    return parseFloat(parseFloat(value || 0).toFixed(2));
};

export const parseQuantity = (value) => {
    return parseFloat(parseFloat(value || 0).toFixed(4));
};
