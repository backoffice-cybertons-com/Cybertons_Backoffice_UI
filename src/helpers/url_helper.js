//REGISTER
export const POST_FAKE_REGISTER = "/auth/signup";

//LOGIN
export const POST_FAKE_LOGIN = "/auth/signin";
export const POST_FAKE_JWT_LOGIN = "/post-jwt-login";
export const POST_FAKE_PASSWORD_FORGET = "/auth/forgot-password";
export const POST_FAKE_JWT_PASSWORD_FORGET = "/jwt-forget-pwd";
export const SOCIAL_LOGIN = "/social-login";
export const POST_LOGOUT = "/user/logout";

//PROFILE
export const POST_EDIT_JWT_PROFILE = "/post-jwt-profile";
export const POST_EDIT_PROFILE = "/user";
export const GET_SIDEBAR_PERMISSIONS = "/user"; // + /{id}/permissions

// Calendar
export const GET_EVENTS = "/events";
export const GET_CATEGORIES = "/categories";
export const GET_UPCOMMINGEVENT = "/upcommingevents";
export const ADD_NEW_EVENT = "/add/event";
export const UPDATE_EVENT = "/update/event";
export const DELETE_EVENT = "/delete/event";

// Chat
export const GET_DIRECT_CONTACT = "/chat";
export const GET_MESSAGES = "/messages";
export const ADD_MESSAGE = "add/message";
export const GET_CHANNELS = "/channels";
export const DELETE_MESSAGE = "delete/message";

//Mailbox
export const GET_MAIL_DETAILS = "/mail";
export const DELETE_MAIL = "/delete/mail";

// Ecommerce
// Product
export const GET_PRODUCTS = "/apps/product";
export const DELETE_PRODUCT = "/apps/product";
export const ADD_NEW_PRODUCT = "/apps/product";
export const UPDATE_PRODUCT = "/apps/product";

// Orders
export const GET_ORDERS = "/apps/order";
export const ADD_NEW_ORDER = "/apps/order";
export const UPDATE_ORDER = "/apps/order";
export const DELETE_ORDER = "/apps/order";

// Customers
export const GET_CUSTOMERS = "/apps/customer";
export const ADD_NEW_CUSTOMER = "/apps/customer";
export const UPDATE_CUSTOMER = "/apps/customer";
export const DELETE_CUSTOMER = "/apps/customer";

// Sellers
export const GET_SELLERS = "/sellers";

// Project list
export const GET_PROJECT_LIST = "/project/list";

// Task
export const GET_TASK_LIST = "/apps/task";
export const ADD_NEW_TASK = "/apps/task";
export const UPDATE_TASK = "/apps/task";
export const DELETE_TASK = "/apps/task";

// CRM
// Conatct
export const GET_CONTACTS = "/apps/contact";
export const ADD_NEW_CONTACT = "/apps/contact";
export const UPDATE_CONTACT = "/apps/contact";
export const DELETE_CONTACT = "/apps/contact";

// Companies
export const GET_COMPANIES = "/apps/company";
export const ADD_NEW_COMPANIES = "/apps/company";
export const UPDATE_COMPANIES = "/apps/company";
export const DELETE_COMPANIES = "/apps/company";

// Lead
export const GET_LEADS = "/apps/lead";
export const ADD_NEW_LEAD = "/apps/lead";
export const UPDATE_LEAD = "/apps/lead";
export const DELETE_LEAD = "/apps/lead";

// Deals
export const GET_DEALS = "/deals";

// Crypto
export const GET_TRANSACTION_LIST = "/transaction-list";
export const GET_ORDRER_LIST = "/order-list";

// Invoice
export const GET_INVOICES = "/apps/invoice";
export const ADD_NEW_INVOICE = "/apps/invoice";
export const UPDATE_INVOICE = "/apps/invoice";
export const DELETE_INVOICE = "/apps/invoice";

// Purchase Transaction
export const GET_PURCHASE_TRANSACTIONS = "/api/purchaseTransaction";
export const ADD_NEW_PURCHASE_TRANSACTION = "/api/purchaseTransaction/composite";
export const UPDATE_PURCHASE_TRANSACTION = "/api/purchaseTransaction/composite";
export const DELETE_PURCHASE_TRANSACTION = "/api/purchaseTransaction";
export const GET_PURCHASE_TRANSACTION_DETAILS = "/api/purchaseTransaction";
// Parties & Products for Purchase
export const GET_VENDORS = "/api/party/type/Vendor,Trader";
export const GET_PARTY_CUSTOMERS = "/api/party/type/Customer,Trader";
export const GET_PARTIES = "/api/party";
export const GET_PARTY_DETAILS = "/api/party/composite";
export const UPLOAD_PARTY_PROFILE = "/api/party/upload-profile";
export const GET_PRODUCTS_DETAILS = "/api/product/details";
export const GET_TRANSPORTERS = "/api/transporter";
export const GET_UNITS = "/api/unit";

// Sales Transaction
export const GET_SALES_TRANSACTIONS = "/api/salesTransaction";
export const ADD_NEW_SALES_TRANSACTION = "/api/salesTransaction/composite";
export const UPDATE_SALES_TRANSACTION = "/api/salesTransaction/composite";
export const DELETE_SALES_TRANSACTION = "/api/salesTransaction";
export const GET_SALES_TRANSACTION_DETAILS = "/api/salesTransaction";
export const GET_PARTY_OUTSTANDING = "/api/salesTransaction/outstanding";

// Payment & Receipt
export const GET_PAYMENT_RECEIPTS = "/api/paymentReceipt/list";
export const ADD_NEW_PAYMENT_RECEIPT = "/api/paymentReceipt/composite";
export const UPDATE_PAYMENT_RECEIPT = "/api/paymentReceipt/composite";
export const DELETE_PAYMENT_RECEIPT = "/api/paymentReceipt";
export const GET_PAYMENT_RECEIPT_DETAILS = "/api/paymentReceipt";
export const GET_PENDING_INVOICES = "/api/paymentReceipt/pending";

// Journal
export const GET_DIRECT_JOURNALS = "/api/journal/direct";
export const ADD_NEW_DIRECT_JOURNAL = "/api/journal/direct";
export const UPDATE_DIRECT_JOURNAL = "/api/journal/direct";
export const DELETE_DIRECT_JOURNAL = "/api/journal/direct";

// Bank & Company
export const GET_BANKS = "/api/Bank";
export const GET_ACCOUNTS = "/api/master/account";

export const GET_COMPANY_MASTER = "/api/Company";
export const GET_COMPANY_PROFILE = "/api/CompanyProfile";
export const UPDATE_COMPANY_PROFILE = "/api/CompanyProfile";
export const UPLOAD_COMPANY_LOGO = "/api/CompanyProfile/upload-logo";

// Delivery Challan
export const GET_DELIVERY_CHALLANS = "/api/deliveryChallan";
export const GET_DELIVERY_CHALLANS_DETAILED = "/api/deliveryChallan/detailed";
export const ADD_NEW_DELIVERY_CHALLAN = "/api/deliveryChallan/composite";
export const UPDATE_DELIVERY_CHALLAN = "/api/deliveryChallan/composite";
export const DELETE_DELIVERY_CHALLAN = "/api/deliveryChallan";
export const GET_DELIVERY_CHALLAN_DETAILS = "/api/deliveryChallan";
export const GET_CUSTOMERS_SALE = "/api/party/type/Customer";
export const GET_TAX_GROUPS = "/api/taxgroup";
export const GET_VEHICLES = "/api/vehicle";

// Reports
export const GET_LEDGER_REPORT = "/api/report/ledger";

export const GET_GSTR3B = "/api/report/GSTR-3B-Report";

export const GET_PAYRECRPT_REPORT = "/api/report/payeble-receivable";
export const GET_SALE_PUR_COMPAR_DATEWISE = "/api/report/sale-purchase-datewise-comparison";

export const GET_TRIAL_BALANCE = "/api/Report/trial-balance";

export const GET_SALE_PUR_INVWISE = "/api/report/sale-pur-invwise";
export const GET_SALE_PURCHASE_REGISTER_ITEMWISE = "/api/report/sale-purchase-register-itemwise";
export const GET_SALE_PURCHASE_REGISTER_DATEWISE = "/api/report/sale-purchase-register-datewise";
export const GET_SALE_PURCHASE_REGISTER_PARTYWISE = "/api/report/sale-purchase-register-partywise";
export const GET_SALE_PURCHASE_REGISTER_MONTHWISE = "/api/report/sale-purchase-register-monthwise";

// TicketsList
export const GET_TICKETS_LIST = "/apps/ticket";
export const ADD_NEW_TICKET = "/apps/ticket";
export const UPDATE_TICKET = "/apps/ticket";
export const DELETE_TICKET = "/apps/ticket";

// kanban
export const GET_TASKS = "/apps/tasks";
export const ADD_TASKS = "/add/tasks";
export const UPDATE_TASKS = "/update/tasks";
export const DELETE_TASKS = "/delete/tasks";

// Dashboard
export const POST_DASHBOARD_DATA = "/api/dashboard";

// Dashboard Analytics

// Sessions by Countries
export const GET_ALL_DATA = "/all-data";
export const GET_HALFYEARLY_DATA = "/halfyearly-data";
export const GET_MONTHLY_DATA = "/monthly-data";

// Audiences Metrics
export const GET_ALLAUDIENCESMETRICS_DATA = "/allAudiencesMetrics-data";
export const GET_MONTHLYAUDIENCESMETRICS_DATA = "/monthlyAudiencesMetrics-data";
export const GET_HALFYEARLYAUDIENCESMETRICS_DATA = "/halfyearlyAudiencesMetrics-data";
export const GET_YEARLYAUDIENCESMETRICS_DATA = "/yearlyAudiencesMetrics-data";

// Users by Device
export const GET_TODAYDEVICE_DATA = "/todayDevice-data";
export const GET_LASTWEEKDEVICE_DATA = "/lastWeekDevice-data";
export const GET_LASTMONTHDEVICE_DATA = "/lastMonthDevice-data";
export const GET_CURRENTYEARDEVICE_DATA = "/currentYearDevice-data";

// Audiences Sessions by Country
export const GET_TODAYSESSION_DATA = "/todaySession-data";
export const GET_LASTWEEKSESSION_DATA = "/lastWeekSession-data";
export const GET_LASTMONTHSESSION_DATA = "/lastMonthSession-data";
export const GET_CURRENTYEARSESSION_DATA = "/currentYearSession-data";

// Dashboard CRM

// Balance Overview
export const GET_TODAYBALANCE_DATA = "/todayBalance-data";
export const GET_LASTWEEKBALANCE_DATA = "/lastWeekBalance-data";
export const GET_LASTMONTHBALANCE_DATA = "/lastMonthBalance-data";
export const GET_CURRENTYEARBALANCE_DATA = "/currentYearBalance-data";

// Deal type
export const GET_TODAYDEAL_DATA = "/todayDeal-data";
export const GET_WEEKLYDEAL_DATA = "/weeklyDeal-data";
export const GET_MONTHLYDEAL_DATA = "/monthlyDeal-data";
export const GET_YEARLYDEAL_DATA = "/yearlyDeal-data";

// Sales Forecast

export const GET_OCTSALES_DATA = "/octSales-data";
export const GET_NOVSALES_DATA = "/novSales-data";
export const GET_DECSALES_DATA = "/decSales-data";
export const GET_JANSALES_DATA = "/janSales-data";

// Dashboard Ecommerce
// Revenue
export const GET_ALLREVENUE_DATA = "/allRevenue-data";
export const GET_MONTHREVENUE_DATA = "/monthRevenue-data";
export const GET_HALFYEARREVENUE_DATA = "/halfYearRevenue-data";
export const GET_YEARREVENUE_DATA = "/yearRevenue-data";

// Dashboard Crypto
// Portfolio
export const GET_BTCPORTFOLIO_DATA = "/btcPortfolio-data";
export const GET_USDPORTFOLIO_DATA = "/usdPortfolio-data";
export const GET_EUROPORTFOLIO_DATA = "/euroPortfolio-data";

// Market Graph
export const GET_ALLMARKETDATA_DATA = "/allMarket-data";
export const GET_YEARMARKET_DATA = "/yearMarket-data";
export const GET_MONTHMARKET_DATA = "/monthMarket-data";
export const GET_WEEKMARKET_DATA = "/weekMarket-data";
export const GET_HOURMARKET_DATA = "/hourMarket-data";

// Dashboard Crypto
// Project Overview
export const GET_ALLPROJECT_DATA = "/allProject-data";
export const GET_MONTHPROJECT_DATA = "/monthProject-data";
export const GET_HALFYEARPROJECT_DATA = "/halfYearProject-data";
export const GET_YEARPROJECT_DATA = "/yearProject-data";

// Project Status
export const GET_ALLPROJECTSTATUS_DATA = "/allProjectStatus-data";
export const GET_WEEKPROJECTSTATUS_DATA = "/weekProjectStatus-data";
export const GET_MONTHPROJECTSTATUS_DATA = "/monthProjectStatus-data";
export const GET_QUARTERPROJECTSTATUS_DATA = "/quarterProjectStatus-data";

// Dashboard NFT
// Marketplace
export const GET_ALLMARKETPLACE_DATA = "/allMarketplace-data";
export const GET_MONTHMARKETPLACE_DATA = "/monthMarketplace-data";
export const GET_HALFYEARMARKETPLACE_DATA = "/halfYearMarketplace-data";
export const GET_YEARMARKETPLACE_DATA = "/yearMarketplace-data";

// Project
export const ADD_NEW_PROJECT = "/add/project";
export const UPDATE_PROJECT = "/update/project";
export const DELETE_PROJECT = "/delete/project";

// Pages > Team
export const GET_TEAMDATA = "/teamData";
export const DELETE_TEAMDATA = "/delete/teamData";
export const ADD_NEW_TEAMDATA = "/add/teamData";
export const UPDATE_TEAMDATA = "/update/teamData";

// File Manager
// Folder
export const GET_FOLDERS = "/folder";
export const DELETE_FOLDER = "/delete/folder";
export const ADD_NEW_FOLDER = "/add/folder";
export const UPDATE_FOLDER = "/update/folder";

// File
export const GET_FILES = "/file";
export const DELETE_FILE = "/delete/file";
export const ADD_NEW_FILE = "/add/file";
export const UPDATE_FILE = "/update/file";

// To do
export const GET_TODOS = "/todo";
export const DELETE_TODO = "/delete/todo";
export const ADD_NEW_TODO = "/add/todo";
export const UPDATE_TODO = "/update/todo";

// To do Project
export const GET_PROJECTS = "/projects";
export const ADD_NEW_TODO_PROJECT = "/add/project";

//JOB APPLICATION
export const GET_APPLICATION_LIST = "/application-list";

//JOB APPLICATION
export const GET_API_KEY = "/api-key";
