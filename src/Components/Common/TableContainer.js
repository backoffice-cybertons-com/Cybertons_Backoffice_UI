import React, { Fragment, useEffect, useMemo, useState } from "react";
import { CardBody, Col, Row, Input } from "reactstrap";
import { useSelector } from "react-redux";
import DataTable, { createTheme } from "react-data-table-component";

import {
  ProductsGlobalFilter,
  CustomersGlobalFilter,
  OrderGlobalFilter,
  ContactsGlobalFilter,
  CompaniesGlobalFilter,
  LeadsGlobalFilter,
  CryptoOrdersGlobalFilter,
  InvoiceListGlobalSearch,
  TicketsListGlobalFilter,
  NFTRankingGlobalFilter,
  TaskListGlobalFilter,
} from "../../Components/Common/GlobalSearchFilter";

createTheme("solarized", {
  text: {
    primary: "#ced4da",
    secondary: "#adb5bd",
  },
  background: {
    default: "transparent",
  },
  context: {
    background: "#cb4b16",
    text: "#FFFFFF",
  },
  divider: {
    default: "#32383e",
  },
  action: {
    button: "rgba(255, 255, 255, 0.7)",
    hover: "rgba(255, 255, 255, 0.08)",
    disabled: "rgba(255, 255, 255, 0.3)",
  },
});

const DEFAULT_PAGE_SIZE_OPTIONS = [100, 500, 1000];

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 300,
  ...props
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => onChange(value), debounce);
    return () => clearTimeout(timeout);
  }, [debounce, onChange, value]);

  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      bsSize="sm"
    />
  );
};

const TableContainer = ({
  columns = [],
  data = [],
  isGlobalFilter,
  isProductsFilter,
  isCustomerFilter,
  isOrderFilter,
  isContactsFilter,
  isCompaniesFilter,
  isLeadsFilter,
  isCryptoOrdersFilter,
  isInvoiceListFilter,
  isTicketsListFilter,
  isNFTRankingFilter,
  isTaskListFilter,
  customPageSize = 100,
  pageSizeOptions,
  showAllPageOption = true,
  SearchPlaceholder,
  onVisibleDataChange,
}) => {
  const layoutModeType = useSelector((state) => state?.Layout?.layoutModeType);
  const isDarkMode = layoutModeType === "dark";

  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [sortState, setSortState] = useState({ accessor: null, direction: null }); // direction: 'asc' | 'desc' | null

  const getAccessor = (col) => col.accessorKey || col.accessor || col.id || col.header;

  const getRawValue = (row, col) => {
    if (typeof col.accessorFn === "function") return col.accessorFn(row);
    if (col.accessorKey) return row?.[col.accessorKey];
    if (col.accessor) return row?.[col.accessor];
    return undefined;
  };

  const buildCellContext = (row, col) => ({
    row: { original: row },
    getValue: () => getRawValue(row, col),
  });

  const normalizeForSearch = (value, col) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "yes" : "no";
    if (value instanceof Date) {
      const d = value;
      const txt = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      return txt.toLowerCase();
    }
    const raw = String(value);

    // Improve Date column filter matching against displayed format like "13 Apr 2026"
    const isDateLikeCol = /date/i.test(String(col?.header || "")) || /date/i.test(String(col?.accessorKey || col?.accessor || ""));
    if (isDateLikeCol) {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        const txt = parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        return txt.toLowerCase();
      }
    }
    return raw.toLowerCase();
  };

  const normalizedSearch = globalFilter.trim().toLowerCase();
  const filteredData = useMemo(() => {
    const base = Array.isArray(data) ? data : [];
    return base.filter((row) => {
      if (normalizedSearch) {
        const hasGlobalMatch = columns.some((col) => {
          const val = getRawValue(row, col);
          return normalizeForSearch(val, col).includes(normalizedSearch);
        });
        if (!hasGlobalMatch) return false;
      }

      for (const [accessor, filterVal] of Object.entries(columnFilters)) {
        if (!String(filterVal ?? "").trim()) continue;
        const col = columns.find((c) => String(getAccessor(c)) === String(accessor));
        const fv = String(filterVal ?? "").toLowerCase();
        if (col?.filterFn && typeof col.filterFn === "function") {
          const rowObj = {
            original: row,
            getValue: (columnId) => {
              const c = columns.find((cc) => String(getAccessor(cc)) === String(columnId));
              return c ? getRawValue(row, c) : row?.[columnId];
            }
          };
          const passed = col.filterFn(rowObj, accessor, fv);
          if (!passed) return false;
          continue;
        }
        const raw = col ? getRawValue(row, col) : row?.[accessor];
        if (!normalizeForSearch(raw, col).includes(fv)) {
          return false;
        }
      }
      return true;
    });
  }, [data, columns, normalizedSearch, columnFilters]);

  const sortedData = useMemo(() => {
    const { accessor, direction } = sortState;
    if (!accessor || !direction) return filteredData;
    const col = columns.find((c) => String(getAccessor(c)) === String(accessor));
    if (!col) return filteredData;

    const dir = direction === "asc" ? 1 : -1;
    const arr = [...filteredData];
    arr.sort((a, b) => {
      const av = getRawValue(a, col);
      const bv = getRawValue(b, col);
      const an = Number(av);
      const bn = Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn) && String(av).trim() !== "" && String(bv).trim() !== "") {
        return (an - bn) * dir;
      }
      return String(av ?? "").localeCompare(String(bv ?? ""), undefined, { sensitivity: "base", numeric: true }) * dir;
    });
    return arr;
  }, [filteredData, sortState, columns]);

  const rdtColumns = useMemo(() => {
    return columns.map((col) => {
      const accessor = String(getAccessor(col));
      const canFilter = col.enableColumnFilter !== false && !!(col.accessorKey || col.accessor || col.accessorFn);
      const canSort = col.enableSorting !== false && !!(col.accessorKey || col.accessor || col.accessorFn);
      const isRight = !!col.right;
      const isActionLike = !canFilter && !canSort && !col.accessorKey && !col.accessor && !col.accessorFn;

      return {
        name: (
          <div className={`d-flex flex-column ${isRight ? "w-100 text-end align-items-end" : ""}`}>
            <div className={`d-flex align-items-center gap-1 ${isRight ? "justify-content-end w-100" : ""}`}>
              <span>{typeof col.header === "string" ? col.header : col.header || accessor}</span>
              {canSort ? (
                <button
                  type="button"
                  className="btn btn-link p-0 text-muted"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSortState((prev) => {
                      if (prev.accessor !== accessor) return { accessor, direction: "asc" };
                      if (prev.direction === "asc") return { accessor, direction: "desc" };
                      if (prev.direction === "desc") return { accessor: null, direction: null };
                      return { accessor, direction: "asc" };
                    });
                  }}
                  title="Sort"
                >
                  <i
                    className={
                      sortState.accessor !== accessor
                        ? "ri-expand-up-down-line"
                        : sortState.direction === "asc"
                          ? "ri-arrow-up-s-line"
                          : "ri-arrow-down-s-line"
                    }
                  />
                </button>
              ) : null}
            </div>
            {canFilter ? (
              <DebouncedInput
                className={`mt-1 ${isRight ? "text-end" : ""}`}
                value={columnFilters[accessor] || ""}
                onChange={(value) =>
                  setColumnFilters((prev) => ({ ...prev, [accessor]: value }))
                }
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : null}
          </div>
        ),
        selector: (row) => getRawValue(row, col),
        sortable: false,
        wrap: true,
        width: col.width || (isActionLike ? "90px" : undefined),
        minWidth: col.minWidth,
        maxWidth: col.maxWidth,
        grow: typeof col.grow === "number" ? col.grow : (isActionLike ? 0 : 1),
        cell: (row) => {
          const rendered = (() => {
          if (typeof col.cell === "function") {
            return col.cell(buildCellContext(row, col));
          }
          const raw = getRawValue(row, col);
          return raw == null ? "" : String(raw);
          })();
          return isRight ? <div className="w-100 text-end">{rendered}</div> : rendered;
        },
      };
    });
  }, [columns, columnFilters, sortState]);

  const customStyles = useMemo(
    () => ({
      headRow: {
        style: {
          backgroundColor: isDarkMode ? "#212529" : "#f3f6f9",
          borderTopStyle: "solid",
          borderTopWidth: "1px",
          borderTopColor: isDarkMode ? "#32383e" : "#e9ebec",
        },
      },
      headCells: {
        style: {
          paddingTop: "8px",
          paddingBottom: "12px",
          color: isDarkMode ? "#ced4da" : "#495057",
          fontWeight: "600",
          verticalAlign: "top",
        },
      },
      rows: {
        style: {
          backgroundColor: isDarkMode ? "#212529" : "#ffffff",
          color: isDarkMode ? "#ced4da" : "#495057",
          "&:not(:last-of-type)": {
            borderBottomStyle: "solid",
            borderBottomWidth: "1px",
            borderBottomColor: isDarkMode ? "#32383e" : "#e9ebec",
          },
        },
        highlightOnHoverStyle: {
          backgroundColor: isDarkMode ? "#2a2f34" : "#f3f6f9",
        },
      },
      pagination: {
        style: {
          backgroundColor: isDarkMode ? "#212529" : "#ffffff",
          color: isDarkMode ? "#ced4da" : "#495057",
        },
      },
    }),
    [isDarkMode]
  );

  const rowsPerPageOptions =
    pageSizeOptions && pageSizeOptions.length
      ? pageSizeOptions
      : DEFAULT_PAGE_SIZE_OPTIONS;

  useEffect(() => {
    if (typeof onVisibleDataChange === "function") {
      onVisibleDataChange(sortedData);
    }
  }, [sortedData, onVisibleDataChange]);

  return (
    <Fragment>
      {isGlobalFilter && (
        <Row className="mb-3">
          <CardBody className="border border-dashed border-end-0 border-start-0">
            <form>
              <Row>
                <Col sm={5}>
                  <div
                    className={
                      isProductsFilter || isContactsFilter || isCompaniesFilter || isNFTRankingFilter
                        ? "search-box me-2 mb-2 d-inline-block"
                        : "search-box me-2 mb-2 d-inline-block col-12"
                    }
                  >
                    <DebouncedInput
                      value={globalFilter}
                      onChange={setGlobalFilter}
                      placeholder={SearchPlaceholder}
                      className="form-control search"
                    />
                    <i className="bx bx-search-alt search-icon"></i>
                  </div>
                </Col>
                {isProductsFilter && <ProductsGlobalFilter />}
                {isCustomerFilter && <CustomersGlobalFilter />}
                {isOrderFilter && <OrderGlobalFilter />}
                {isContactsFilter && <ContactsGlobalFilter />}
                {isCompaniesFilter && <CompaniesGlobalFilter />}
                {isLeadsFilter && <LeadsGlobalFilter />}
                {isCryptoOrdersFilter && <CryptoOrdersGlobalFilter />}
                {isInvoiceListFilter && <InvoiceListGlobalSearch />}
                {isTicketsListFilter && <TicketsListGlobalFilter />}
                {isNFTRankingFilter && <NFTRankingGlobalFilter />}
                {isTaskListFilter && <TaskListGlobalFilter />}
              </Row>
            </form>
          </CardBody>
        </Row>
      )}

      <div className="table-responsive">
        <DataTable
          columns={rdtColumns}
          data={sortedData}
          pagination
          paginationPerPage={customPageSize || 100}
          paginationRowsPerPageOptions={rowsPerPageOptions}
          paginationComponentOptions={{
            selectAllRowsItem: showAllPageOption,
            selectAllRowsItemText: "All",
            rangeSeparatorText: "of",
            rowsPerPageText: "Rows per page",
          }}
          customStyles={customStyles}
          theme={isDarkMode ? "solarized" : "default"}
          highlightOnHover
          striped
          dense
          persistTableHead
          noDataComponent={
            <div className={`py-4 text-center ${isDarkMode ? "text-light" : ""}`}>
              <h5 className="mt-2">Sorry! No Result Found</h5>
            </div>
          }
        />
      </div>
    </Fragment>
  );
};

export default TableContainer;
