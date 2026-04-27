import React from 'react';
import { Button } from 'reactstrap';
import { exportToExcelFrontend } from '../../utils/export/excelExport';
import { toast } from 'react-toastify';

/**
 * Reusable Excel export button.
 *
 * Props:
 * - data: filtered row array (required)
 * - columns: [{ label, accessor }, ...] or compatible objects (required)
 * - fileName: base file name without extension
 * - sheetName: optional sheet name
 * - size, color, className: forwarded to Reactstrap Button
 * - children: custom button label (defaults to "Export")
 */
const ExportButton = ({
    data,
    columns,
    fileName = 'export',
    sheetName,
    size = 'sm',
    color = 'outline-success',
    className = '',
    disabled,
    children,
    iconOnly = false,
    headerRows = [],
    footerRows = []
}) => {
    const handleExport = async () => {
        try {
            let exportData = data;
            if (typeof data === 'function') {
                exportData = await data();
            }

            if (!exportData || exportData.length === 0) {
                // If we have header/footer data, we might still want to export even empty table
                if (headerRows.length === 0 && footerRows.length === 0) {
                    toast.warn("No data found to export");
                    return;
                }
                exportData = [];
            }

            exportToExcelFrontend({
                data: exportData,
                columns,
                fileName,
                sheetName,
                headerRows,
                footerRows
            });
        } catch (err) {
            console.error('[ExportButton] Failed to export Excel:', err);
            toast.error("Failed to export Excel file");
        }
    };

    const isDisabled = disabled || !data || (Array.isArray(data) && data.length === 0);

    const resolvedColor = iconOnly ? 'link' : color;
    const label = children || 'Export';
    const iconStyles = iconOnly
        ? { fontSize: '2.4rem', height: '40px', width: '40px', padding: 0 }
        : {};

    return (
        <Button
            size={size}
            color={resolvedColor}
            className={`${className} ${iconOnly ? 'border-0 shadow-none text-success d-inline-flex align-items-center justify-content-center' : ''}`}
            onClick={handleExport}
            disabled={isDisabled}
            style={iconStyles}
        >
            <i className="ri-file-excel-2-fill align-bottom" />
            {!iconOnly && <span className="ms-1">{label}</span>}
        </Button>
    );
};

export default ExportButton;