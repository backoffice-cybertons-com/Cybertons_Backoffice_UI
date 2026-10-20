import { toast } from "react-toastify";

export const getPartyLimitValues = (party = {}) => ({
    dailySaleLimit: parseFloat(party.dailySaleLimit ?? party.DailySaleLimit ?? party.daily_sale_limit) || 0,
    creditLimit: parseFloat(party.creditLimit ?? party.CreditLimit ?? party.credit_limit) || 0,
    isActive: party.isActive ?? party.IsActive ?? party.is_active,
});

export const getInvoiceDate = (invDateValue) => {
    const invDateRaw = Array.isArray(invDateValue) ? invDateValue[0] : invDateValue;
    const invDate = invDateRaw ? new Date(invDateRaw) : new Date();
    if (isNaN(invDate.getTime())) return new Date();
    invDate.setHours(0, 0, 0, 0);
    return invDate;
};

export const getTodaysSalesForParty = ({
    allSalesOrders = [],
    partyId,
    invDate,
    excludeSpUniqueCode = 0,
    isSalesRecord = () => true,
}) => {
    const targetDate = getInvoiceDate(invDate);
    return allSalesOrders
        .filter((tx) => {
            if (!isSalesRecord(tx)) return false;
            const pid = tx.partyId ?? tx.PartyId;
            if (String(pid) !== String(partyId)) return false;
            const d = new Date(tx.invDate || tx.InvDate);
            if (isNaN(d.getTime())) return false;
            d.setHours(0, 0, 0, 0);
            if (d.getTime() !== targetDate.getTime()) return false;
            const code = tx.spUniqueCode ?? tx.SpUniqueCode;
            if (excludeSpUniqueCode && String(code) === String(excludeSpUniqueCode)) return false;
            return true;
        })
        .reduce((sum, tx) => sum + (parseFloat(tx.grandTotal ?? tx.GrandTotal) || 0), 0);
};

export const validateCustomerSalesLimits = ({
    party = {},
    partyId,
    grandTotal = 0,
    previousOutstanding = 0,
    invDate,
    allSalesOrders = [],
    excludeSpUniqueCode = 0,
    isSalesRecord = () => true,
}) => {
    const { dailySaleLimit, creditLimit, isActive } = getPartyLimitValues(party);
    const newBillAmount = parseFloat(grandTotal) || 0;
    const outstanding = parseFloat(previousOutstanding) || 0;

    if (isActive === false || isActive === 0 || isActive === "false") {
        return {
            allowed: false,
            type: "inactive",
            message: "Sales order not allowed: This customer is inactive. Please activate the customer in Party Master or choose another customer.",
        };
    }

    if (dailySaleLimit > 0) {
        const todaysSales = getTodaysSalesForParty({
            allSalesOrders,
            partyId,
            invDate,
            excludeSpUniqueCode,
            isSalesRecord,
        });

        if (todaysSales + newBillAmount > dailySaleLimit) {
            return {
                allowed: false,
                type: "daily",
                message:
                    `Sales order not allowed: Daily sale limit exceeded. ` +
                    `Customer daily limit: ${dailySaleLimit.toFixed(2)}, ` +
                    `Today's sales: ${todaysSales.toFixed(2)}, ` +
                    `This order: ${newBillAmount.toFixed(2)}.`,
            };
        }
    }

    if (creditLimit > 0) {
        if (outstanding + newBillAmount > creditLimit) {
            return {
                allowed: false,
                type: "credit",
                message:
                    `Sales order not allowed: Credit limit exceeded. ` +
                    `Customer credit limit: ${creditLimit.toFixed(2)}, ` +
                    `Outstanding: ${outstanding.toFixed(2)}, ` +
                    `This order: ${newBillAmount.toFixed(2)}.`,
            };
        }
    }

    return { allowed: true };
};

export const showSalesLimitBlockedToast = (validationResult) => {
    if (!validationResult || validationResult.allowed) return false;
    toast.error(validationResult.message, { autoClose: 7000 });
    return true;
};

export const extractApiErrorMessage = (error, fallback = "Sales order could not be saved.") => {
    if (typeof error === "string" && error.trim()) return error;
    if (error?.error) return error.error;
    if (error?.Error) return error.Error;
    if (error?.message) return error.message;
    if (error?.response?.data) {
        const data = error.response.data;
        if (typeof data === "string") return data;
        if (data.error) return data.error;
        if (data.Error) return data.Error;
        if (data.message) return data.message;
    }
    return fallback;
};
