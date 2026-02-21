import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import secureStorage from "../utils/secureStorage";
import { authService } from "../services/api/authService";

const Navdata = () => {
  const history = useNavigate();
  // Get auth state from Redux store
  const { user: reduxUser, token: reduxToken } = useSelector(state => state.auth || {});

  // Use a single state object to track open/close status of menus by ID
  const [menuStates, setMenuStates] = useState({});
  const [iscurrentState, setIscurrentState] = useState("Dashboard");
  const [menuItems, setMenuItems] = useState([]);

  // Get User ID from multiple sources
  const getUserId = () => {
    // 1. Try sessionStorage first
    const authUser = sessionStorage.getItem("authUser");
    if (authUser) {
      try {
        const parsed = JSON.parse(authUser);
        const userObj = parsed.user || parsed.User || parsed;
        const userId = userObj.id || userObj.Id || userObj.ID;
        if (userId) return userId;
      } catch (e) {
        console.warn("LayoutMenuData: Failed to parse sessionStorage authUser", e);
      }
    }

    // 2. Try Redux store
    if (reduxUser) {
      const userId = reduxUser.NameIdentifier || reduxUser.sub || reduxUser.id || reduxUser.Id;
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

    const items = flatItems.filter(item => {
      const itemParentId = getVal(item, "parentId");
      const normalizedItemParentId = itemParentId ? itemParentId.toString() : null;

      // Check match
      return normalizedItemParentId === normalizedTargetId;
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

      const mappedItem = {
        id: tabId.toString(),
        label: tabName,
        icon: normalizedIcon,
        link: hasChildren ? "/#" : (tabUrl || "/#"),
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
    if (userId) {
      const companyId = secureStorage.getPlain('companyId') || 'Not Set';
      console.log(`[Sidebar Diagnostic] Fetching permissions for UserId: ${userId}, CompanyId: ${companyId}`);
      console.log(`[Sidebar Diagnostic] API Base URL: ${process.env.REACT_APP_API_URL || 'https://localhost:7067'}`);

      authService.getSidebarPermissions(userId).then(response => {
        const data = response.data ? response.data : response;
        console.log("[Sidebar Diagnostic] Received Data:", data);

        if (Array.isArray(data)) {
          // Diagnostics: Check for orphans
          data.forEach(item => {
            const pid = item.parentId || item.ParentId;
            if (pid) {
              const parentExists = data.some(p => {
                const pid_matches = (p.tabId || p.TabId).toString() === pid.toString();
                return pid_matches;
              });
              if (!parentExists) {
                console.warn(`LayoutMenuData: ORPHAN DETECTED - Item '${item.tabName || item.TabName}' has parentId ${pid} but that parent is not in the list!`);
              }
            }
          });

          const tree = buildMenuTree(data, null); // Start with null for root
          console.log("LayoutMenuData: Built Tree:", tree);

          const finalMenu = [
            { label: "Menu", isHeader: true },
            ...(tree || [])
          ];

          setMenuItems(finalMenu);
        }
      }).catch(err => {
        console.error("LayoutMenuData: Failed to fetch sidebar permissions", err);
        setMenuItems([{ label: "Menu", isHeader: true }]);
      });
    }

  }, [menuStates, reduxUser, reduxToken]);

  return <React.Fragment>{menuItems}</React.Fragment>;
};

export default Navdata;
