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
}) => {
    const handleExport = () => {
        try {
            exportToExcelFrontend({
                data: data || [],
                columns,
                fileName,
                sheetName
            });
        } catch (err) {
            console.error('[ExportButton] Failed to export Excel:', err);
            toast.error("Failed to export Excel file");
        }
    };

    const isDisabled = disabled || !data || data.length === 0 || !columns || columns.length === 0;

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