/**
 * Shared defaults for react-data-table-component master lists.
 * Uses RDT's paginationComponentOptions.selectAllRowsItem for a labeled "All" row.
 */
export const SOFTBOOK_RDT_ROWS_PER_PAGE_OPTIONS = [100, 500, 1000];

export const SOFTBOOK_RDT_PAGINATION_COMPONENT_OPTIONS = {
  selectAllRowsItem: true,
  selectAllRowsItemText: 'All',
  rangeSeparatorText: 'of',
  rowsPerPageText: 'Rows per page',
};
