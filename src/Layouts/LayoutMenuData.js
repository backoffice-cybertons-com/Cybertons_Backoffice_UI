import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { jwtDecode } from "jwt-decode";
import secureStorage from "../utils/secureStorage";
import { authService } from "../services/api/authService";
import { setPermissions } from "../slices/authSlice";

const useNavData = () => {
  const history = useNavigate();
  const dispatch = useDispatch();
  // Get auth state from Redux store
  const { user: reduxUser, token: reduxToken } = useSelector(state => state.auth || {});

  // Use a single state object to track open/close status of menus by ID
  const [menuStates, setMenuStates] = useState({});
  const [iscurrentState, setIscurrentState] = useState("Dashboard");
  const [menuItems, setMenuItems] = useState([]);

  // Get User ID from multiple sources
  const getUserId = () => {
    // 1. Try localStorage first
    const authUser = localStorage.getItem("authUser");
    if (authUser) {
      try {
        const parsed = JSON.parse(authUser);
        const userObj = parsed.user || parsed.User || parsed;
        const userId = userObj.id || userObj.Id || userObj.ID;
        console.log(`[Sidebar Diagnostic] Found userId ${userId} in localStorage authUser`);
        if (userId) return userId;
      } catch (e) {
        console.warn("LayoutMenuData: Failed to parse localStorage authUser", e);
      }
    } else {
      console.log("[Sidebar Diagnostic] No authUser found in localStorage");
    }

    // 2. Try Redux store
    if (reduxUser) {
      const userId = reduxUser.NameIdentifier || reduxUser.sub || reduxUser.id || reduxUser.Id;
      console.log(`[Sidebar Diagnostic] Found userId ${userId} in Redux store`);
      if (userId) return userId;
    }

    // 3. Try decoding JWT token
    const token = reduxToken || secureStorage.getSecure('authToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const userId = decoded.NameIdentifier || decoded.sub || decoded.id || decoded.Id;
        if (userId) return userId;
      } catch (e) {
        console.warn("LayoutMenuData: Failed to decode JWT token", e);
      }
    }

    return null;
  };

  const toggleMenu = (id, e) => {
    if (e) e.preventDefault();
    setMenuStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    setIscurrentState(id);
  };

  // Normalize icon path to CSS class name with Mapping
  const normalizeIcon = (iconPath, tabName) => {
    if (!iconPath || iconPath.trim() === "") {
      return 'ri-record-circle-line'; // Default
    }

    // Direct mapping for common FA icons in DB to Remix Icons (Velzon default)
    const faToRiMap = {
      'fa-file-contract': 'ri-file-paper-2-line',
      'fa-file-invoice': 'ri-file-list-3-line',
      'fa-rotate': 'ri-refresh-line',
      'fa-arrow-up-right-dots': 'ri-arrow-up-circle-line',
      'fa-file-circle-check': 'ri-checkbox-circle-line',
      'fa-diagram-project': 'ri-projector-line',
      'fa-table-cells': 'ri-layout-grid-line',
      'fa-receipt': 'ri-receipt-line',
      'fa-book': 'ri-book-read-line',
      'fa-layer-group': 'ri-stack-line',
      'fa-money-bill-transfer': 'ri-exchange-dollar-line',
      'fa-list': 'ri-list-check-2',
      'fa-piggy-bank': 'ri-hand-coin-line',
      'fa-lock': 'ri-lock-2-line',
      'fa-cogs': 'ri-settings-4-line',
      'fa-arrows-rotate': 'ri-refresh-line',
      'fa-file-signature': 'ri-file-edit-line',
      'fa-user-plus': 'ri-user-add-line',
      'fa-money-check-dollar': 'ri-bank-card-line',
      'fa-circle-exclamation': 'ri-error-warning-line',
      'fa-chart-pie': 'ri-pie-chart-line',
      'fa-file-csv': 'ri-file-excel-2-line',
      'fa-calculator': 'ri-calculator-line',
      'fa-house': 'ri-home-4-line',
      'fa-users': 'ri-group-line',
      'fa-warehouse': 'ri-building-4-line',
      'fa-cart-shopping': 'ri-shopping-cart-2-line',
      'fa-bag-shopping': 'ri-shopping-bag-3-line',
      'fa-clock': 'ri-time-line',
      'fa-solid': '' // ignore
    };

    // Check if it's a FontAwesome class and map it
    if (iconPath.includes('fa-')) {
      const parts = iconPath.split(' ');
      for (let part of parts) {
        if (part.startsWith('fa-') && !part.includes('solid') && !part.includes('regular')) {
          // Strip 'fa-' prefix to check map loosely if needed, or check map directly
          const mapped = faToRiMap[part];
          if (mapped) return mapped;

          // Fallback heuristics
          if (part.includes('file')) return 'ri-file-list-line';
          if (part.includes('user')) return 'ri-user-line';
          if (part.includes('money') || part.includes('dollar')) return 'ri-money-dollar-circle-line';
          if (part.includes('chart')) return 'ri-pie-chart-line';
          if (part.includes('setting') || part.includes('cog')) return 'ri-settings-3-line';
        }
      }
      // If FA icon but not in map, return generic
      return 'ri-record-circle-line';
    }

    // If iconPath is already a CSS class (starts with 'ri-' or 'mdi-'), use it directly
    if (iconPath.startsWith('ri-') || iconPath.startsWith('mdi-')) {
      return iconPath;
    }

    return 'ri-record-circle-line';
  };

  // Transform flat API data to recursive menu structure
  const buildMenuTree = (flatItems, targetParentId = null) => {
    // Helper to get property in any case
    const getVal = (obj, key) => obj[key] !== undefined ? obj[key] : obj[key.charAt(0).toUpperCase() + key.slice(1)];

    // Normalize Target ID
    const normalizedTargetId = targetParentId ? targetParentId.toString() : null;

    // Tabs to hide completely from the UI
    const hiddenTabs = [
      // Sales
      "quotes", "quates", "quote", "retainer invoices", "retainer invoice", "sales orders", "sales order", "delivery challans", "delivery challan", "payments received", "payment received", "credit notes", "credit note", "e-way bills", "e-way bill",
      // Purchases
      "recurring expense", "recurring expenses", "recurring bills", "recurring bill", "payment made", "payments made", "vendor credits", "vendor credit", "purchase orders", "purchase order"
    ];

    const items = flatItems.filter(item => {
      const itemParentId = getVal(item, "parentId");
      const normalizedItemParentId = itemParentId ? itemParentId.toString() : null;

      const tabName = getVal(item, "tabName");
      if (tabName && hiddenTabs.includes(tabName.toLowerCase().trim())) {
        return false;
      }

      // Check match
      return normalizedItemParentId === normalizedTargetId;
    }).sort((a, b) => {
      if (normalizedTargetId !== null) return 0; // Only sort root items

      const getTabName = (item) => getVal(item, "tabName") || "";
      const aName = getTabName(a);
      const bName = getTabName(b);
      
      const aIsDash = aName === "Dashboard" || aName === "Home" || aName === "Overview";
      const aIsKpi = aName === "KPI Dashboard" || aName === "Dashboard KPI";
      
      const bIsDash = bName === "Dashboard" || bName === "Home" || bName === "Overview";
      const bIsKpi = bName === "KPI Dashboard" || bName === "Dashboard KPI";

      const weightA = aIsDash ? 1 : (aIsKpi ? 2 : 3);
      const weightB = bIsDash ? 1 : (bIsKpi ? 2 : 3);
      
      return weightA - weightB;
    });

    if (!items.length) return undefined;

    return items.map(item => {
      const tabId = getVal(item, "tabId");
      const tabName = getVal(item, "tabName");
      const tabUrl = getVal(item, "tabUrl");
      const iconPath = getVal(item, "iconPath");
      const normalizedIcon = normalizeIcon(iconPath, tabName);

      // Recursively find children
      // We pass the current tabId as the new targetParentId
      const childrenOrUndefined = buildMenuTree(flatItems, tabId);
      const hasChildren = childrenOrUndefined && childrenOrUndefined.length > 0;

      if (hasChildren) {
        console.log(`LayoutMenuData: Found children for Parent '${tabName}' (ID: ${tabId})`);
      } else {
        // Debug: Check if there SHOULD be children
        const potentialChildren = flatItems.filter(i => {
          const pId = getVal(i, "parentId");
          return pId && pId.toString() === tabId.toString();
        });
        if (potentialChildren.length > 0) {
          console.warn(`LayoutMenuData: WARN - Parent '${tabName}' (ID: ${tabId}) has ${potentialChildren.length} potential children in raw data, but buildMenuTree did not return them. Recursion issue?`);
        }
      }

      let subItems = undefined;
      let childItems = undefined;

      if (hasChildren) {
        if (targetParentId) {
          // If we are already inside a parent (Level 2+), children go to 'childItems'
          // This matches Velzon's VerticalLayout expectation for nested levels
          childItems = childrenOrUndefined;
        } else {
          // Top level parent, children go to 'subItems'
          subItems = childrenOrUndefined;
        }
      }

      let finalLink = hasChildren ? "/#" : (tabUrl || "/#");

      if (tabName === "Customers" || tabName === "Customer") {
        finalLink = "/customer?type=Customer";
      } else if (tabName === "Vendors" || tabName === "Vendor") {
        finalLink = "/vendor?type=Vendor";
      } else if (tabName === "Traders" || tabName === "Trader") {
        finalLink = "/party?type=Trader";
      } else if (tabName === "Products" || tabName === "Product") {
        finalLink = "/apps-product-master";
      } else if (tabName === "Sales Order" || tabName === "Sales Orders") {
        finalLink = "/sales-order";
      } else if (tabName === "Invoices" || tabName === "Invoice") {
        finalLink = "/sales-order"; // Map Invoices to sales functionality
      } else if (tabName === "Bills" || tabName === "Bill") {
        finalLink = "/purchase-transaction/list"; // Map Bills to purchase functionality
      } else if (tabName === "Ledger Report" || tabName === "Ledger Statement") {
        finalLink = "/reports/ledger";
      } else if (tabName === "Sale Purchase Register Itemwise") {
        finalLink = "/reports/sale-purchase-register-itemwise";
      } else if (tabName === "Sale Purchase Register Datewise") {
        finalLink = "/reports/sale-purchase-register-datewise";
      } else if (tabName === "Sale Purchase Register Partywise") {
        finalLink = "/reports/sale-purchase-register-partywise";
      } else if (tabName === "Stock Summary") {
        finalLink = "/reports/stock-summary";
      } else if (tabName === "GST REPORT FOR CA" || tabName === "GST Report for CA") {
        finalLink = "/reports/gst-report-ca";
      // Developed by Hetak on 11-05-2026
      } else if (tabName === "Stock Ledger Datewise" || tabName === "Stock Ledger") {
        finalLink = "/reports/stock-ledger-datewise";
      // Code developed by Hetak Modi 290526
      } else if (tabName === "Day Book") {
        finalLink = "/reports/day-book";
      } else if (tabName === "Cash Book") {
        finalLink = "/reports/cash-book";
      } else if (tabName === "Bank Book") {
        finalLink = "/reports/bank-book";
      } else if (tabName === "Trial Balance") {
        finalLink = "/reports/TrialBalanceReport";
      } else if (tabName === "Expense" || tabName === "Expenses") {
        // The new independent Expense component
        finalLink = "/purchases/expense";
      } else if (tabName === "Pay/Rec" || tabName === "Payment & Receipt") {
        // The old Payment & Receipt component
        finalLink = "/payment-receipt/list";
      } else if (tabName === "Home" || tabName === "Dashboard" || tabName === "Overview") {
        finalLink = "/dashboard";
      } else if (tabName === "KPI Dashboard") {
        finalLink = "/dashboard/kpi";
      }

      const mappedItem = {
        id: tabId.toString(),
        label: tabName,
        icon: normalizedIcon,
        link: finalLink,
        click: hasChildren ? (e) => toggleMenu(tabId.toString(), e) : undefined,
        stateVariables: !!menuStates[tabId.toString()],
        subItems: subItems,
        childItems: childItems,
        isChildItem: hasChildren && !!targetParentId,  // true only if nested AND has own children
        parentId: targetParentId ? targetParentId.toString() : undefined
      };


      return mappedItem;
    });
  };

  useEffect(() => {
    const userId = getUserId();
    console.log(`[Sidebar Diagnostic] Effect triggered. userId: ${userId}, hasReduxToken: ${!!reduxToken}`);
    if (userId) {
      const companyId = secureStorage.getPlain('companyId') || 'Not Set';
      console.log(`[Sidebar Diagnostic] Fetching permissions for UserId: ${userId}, CompanyId: ${companyId}`);
      console.log(`[Sidebar Diagnostic] API Base URL: ${process.env.REACT_APP_API_URL || 'https://localhost:7067'}`);

      authService.getSidebarPermissions(userId).then(response => {
        const data = response.data ? response.data : response;
        console.log("[Sidebar Diagnostic] Received Data:", data);

        if (Array.isArray(data)) {
          // Sync permissions to Redux for use in other components (e.g., GenericMasterList)
          dispatch(setPermissions(data));

          // Force KPI Dashboard to be a top-level item to prevent the main Dashboard from becoming a non-clickable folder
          const modifiedData = data.map(item => {
            const tabName = item.tabName || item.TabName;
            if (tabName === "KPI Dashboard" || tabName === "Dashboard KPI") {
              return { ...item, parentId: null, ParentId: null };
            }
            return item;
          });

          // Diagnostics: Check for orphans
          modifiedData.forEach(item => {
            const pid = item.parentId || item.ParentId;
            if (pid) {
              const parentExists = modifiedData.some(p => {
                const pid_matches = (p.tabId || p.TabId).toString() === pid.toString();
                return pid_matches;
              });
              if (!parentExists) {
                console.warn(`LayoutMenuData: ORPHAN DETECTED - Item '${item.tabName || item.TabName}' has parentId ${pid} but that parent is not in the list!`);
              }
            }
          });

          const tree = buildMenuTree(modifiedData, null);
          
          const finalMenu = [
            { label: "Menu", isHeader: true },
            ...(tree || []),
          ];

          setMenuItems(finalMenu);
        }
      }).catch(err => {
        console.error("LayoutMenuData: Failed to fetch sidebar permissions", err);
        setMenuItems([{ label: "Menu", isHeader: true }]);
      });
    }

  }, [menuStates, reduxUser, reduxToken]);

  return menuItems;
};

export default useNavData;
