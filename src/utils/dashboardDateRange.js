const formatLocalYMD = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const getDashboardDateRange = (filterType, customFromDate, customToDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterType === 'CUSTOM' && customFromDate && customToDate) {
        return { fromDate: customFromDate, toDate: customToDate };
    }

    switch ((filterType || 'YESTERDAY').toUpperCase()) {
        case 'TODAY':
            return { fromDate: formatLocalYMD(today), toDate: formatLocalYMD(today) };
        case 'YESTERDAY': {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const ymd = formatLocalYMD(yesterday);
            return { fromDate: ymd, toDate: ymd };
        }
        case 'THIS_WEEK': {
            const day = today.getDay();
            const diff = day === 0 ? 6 : day - 1;
            const monday = new Date(today);
            monday.setDate(today.getDate() - diff);
            return { fromDate: formatLocalYMD(monday), toDate: formatLocalYMD(today) };
        }
        case 'THIS_MONTH': {
            const first = new Date(today.getFullYear(), today.getMonth(), 1);
            return { fromDate: formatLocalYMD(first), toDate: formatLocalYMD(today) };
        }
        case 'PREV_MONTH': {
            const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const last = new Date(today.getFullYear(), today.getMonth(), 0);
            return { fromDate: formatLocalYMD(first), toDate: formatLocalYMD(last) };
        }
        case 'THIS_YEAR': {
            const first = new Date(today.getFullYear(), 0, 1);
            return { fromDate: formatLocalYMD(first), toDate: formatLocalYMD(today) };
        }
        default: {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const ymd = formatLocalYMD(yesterday);
            return { fromDate: ymd, toDate: ymd };
        }
    }
};

export default getDashboardDateRange;
