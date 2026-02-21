export const masterConfig = {
    // 1. Product (Complex, handled by dedicated page usually, but kept here for ref)
    products: {
        pk: "ProductId",
        label: "Product",
        fields: [
            { name: "ProductName", label: "Product Name", type: "text", required: true },
            { name: "ProductType", label: "Type", type: "text" },
            { name: "SellingPrice", label: "Selling Price", type: "number" },
            { name: "CostPrice", label: "Cost Price", type: "number" }
        ]
    },
    // 2. Party (Customer/Vendor)
    customers: {
        pk: "PartyId",
        label: "Party",
        fields: [
            { name: "DisplayName", label: "Display Name", type: "text", required: true },
            { name: "CompanyName", label: "Company Name", type: "text" },
            { name: "Email", label: "Email", type: "email" },
            { name: "PhoneMobile", label: "Mobile", type: "text" },
            { name: "GstNo", label: "GST No", type: "text" }
        ]
    },
    // 3. User
    users: {
        pk: "UserId",
        label: "User",
        fields: [
            { name: "Username", label: "Username", type: "text", required: true },
            { name: "FullName", label: "Full Name", type: "text", required: true },
            { name: "Email", label: "Email", type: "email", required: true },
            { name: "PasswordHash", label: "Password", type: "password", required: true }
        ]
    },
    // 4. Unit -> tab_unit_master (unit_name, uqc)
    units: {
        pk: "UnitId",
        label: "Unit",
        fields: [
            { name: "UnitName", label: "Unit Name", type: "text", required: true },
            { name: "Uqc", label: "UQC", type: "text" }
        ]
    },
    // 5. Tax -> tab_tax_master (tax_name, rate_percent, tax_type)
    taxes: {
        pk: "TaxId",
        label: "Tax",
        fields: [
            { name: "TaxName", label: "Tax Name", type: "text", required: true },
            { name: "RatePercent", label: "Rate (%)", type: "number", required: true },
            { name: "TaxType", label: "Tax Type", type: "text" }
        ]
    },
    // 6. HSN -> tab_hsn_master (hsn_code, description, tax_rate)
    hsn: {
        pk: "HsnId",
        label: "HSN",
        fields: [
            { name: "HsnCode", label: "HSN Code", type: "text", required: true },
            { name: "Description", label: "Description", type: "text" },
             { name: "TaxRate", label: "Tax Rate", type: "number" }
        ]
    },
    // 7. Godown -> tab_godown_master (godown_name, warehouse_id)
    godown: {
        pk: "GodownId",
        label: "Godown",
        fields: [
            { name: "GodownName", label: "Godown Name", type: "text", required: true },
            { name: "WarehouseId", label: "Warehouse ID", type: "number" }
        ]
    },
    // 8. Warehouse -> tab_warehouse_master (warehouse_name, branch_id, address)
    warehouses: {
        pk: "WarehouseId",
        label: "Warehouse",
        fields: [
            { name: "WarehouseName", label: "Warehouse Name", type: "text", required: true },
            { name: "Address", label: "Address", type: "text" },
            { name: "BranchId", label: "Branch ID", type: "number" }
        ]
    },
    // 9. Cost Center -> tab_cost_center_master (cost_center_name, description)
    costCenters: {
        pk: "CostCenterId",
        label: "Cost Center",
        fields: [
            { name: "CostCenterName", label: "Cost Center Name", type: "text", required: true },
            { name: "Description", label: "Description", type: "text" }
        ]
    },
    // 10. Fiscal Year -> tab_fiscal_year_master (start_date, end_date, is_current)
    fiscalYears: {
        pk: "FiscalYearId",
        label: "Fiscal Year",
        fields: [
            { name: "StartDate", label: "Start Date", type: "date", required: true },
            { name: "EndDate", label: "End Date", type: "date", required: true },
            { name: "IsCurrent", label: "Is Current", type: "checkbox" }
        ]
    },
    // 11. Role -> tab_role_master (role_name, is_active)
    roles: {
        pk: "RoleId",
        label: "Role",
        fields: [
            { name: "RoleName", label: "Role Name", type: "text", required: true },
             { name: "IsActive", label: "Is Active", type: "checkbox" }
        ]
    },
    // 12. Salesperson -> tab_salesperson_master (salesperson_name, email)
    salespersons: {
        pk: "SalespersonId",
        label: "Salesperson",
        fields: [
            { name: "SalespersonName", label: "Name", type: "text", required: true },
            { name: "Email", label: "Email", type: "email" }
        ]
    },
    // 13. Tax Group -> tab_tax_group_master (group_name, description, supply_type, cgst_per, sgst_per, igst_per)
    taxGroups: {
        pk: "TaxGroupId",
        label: "Tax Group",
        fields: [
            { name: "GroupName", label: "Group Name", type: "text", required: true },
            { name: "Description", label: "Description", type: "text" },
            { name: "SupplyType", label: "Supply Type", type: "text" },
            { name: "IgstPer", label: "IGST %", type: "number" }
        ]
    },
    // 14. Configure Tax -> tab_tax_group_detail (tax_group_id, tax_id, apply_order)
    configureTax: {
        pk: "TaxGroupDetailId",
        label: "Tax Group Detail",
        fields: [
            { name: "TaxGroupId", label: "Tax Group ID", type: "number", required: true },
            { name: "TaxId", label: "Tax ID", type: "number", required: true },
            { name: "ApplyOrder", label: "Order", type: "number", required: true }
        ]
    },
    // 15. TCS -> tab_tcs_master (tax_name, rate, nature_of_collection)
    tcs: {
        pk: "TcsId",
        label: "TCS",
        fields: [
            { name: "TaxName", label: "TCS Name", type: "text", required: true },
            { name: "Rate", label: "Rate", type: "number", required: true },
            { name: "NatureOfCollection", label: "Nature of Collection", type: "text" }
        ]
    },
    // 16. TDS -> tab_tds_master (tax_name, rate, section)
    tds: {
        pk: "TdsId",
        label: "TDS",
        fields: [
            { name: "TaxName", label: "TDS Name", type: "text", required: true },
            { name: "Rate", label: "Rate", type: "number", required: true },
            { name: "Section", label: "Section", type: "text", required: true }
        ]
    },
    // 17. SAC -> tab_sac_master (sac_code, description, tax_rate)
    sac: {
        pk: "SacId",
        label: "SAC",
        fields: [
            { name: "SacCode", label: "SAC Code", type: "text", required: true },
            { name: "Description", label: "Description", type: "text" },
            { name: "TaxRate", label: "Tax Rate", type: "number" }
        ]
    },
    // 18. Transporter -> tab_transporter_master (transporter_name, gst_number, contact_person, phone, address)
    transporters: {
        pk: "TransporterId",
        label: "Transporter",
        fields: [
            { name: "TransporterName", label: "Name", type: "text", required: true },
            { name: "GstNumber", label: "GSTIN", type: "text" },
            { name: "ContactPerson", label: "Contact Person", type: "text" },
            { name: "Phone", label: "Phone", type: "text" },
            { name: "Address", label: "Address", type: "text" }
        ]
    },
    // 19. Bank -> tab_bank_master (bank_name, branch, account_number, ifsc, micr)
    bank: {
        pk: "BankMasterId",
        label: "Bank",
        fields: [
            { name: "BankName", label: "Bank Name", type: "text", required: true },
            { name: "Branch", label: "Branch", type: "text" },
            { name: "AccountNumber", label: "Account No", type: "text", required: true },
            { name: "Ifsc", label: "IFSC Code", type: "text" },
            { name: "Micr", label: "MICR", type: "text" }
        ]
    },
    // 20. Branch -> tab_branch_master (branch_name, address, city, state, country, phone)
    branch: {
        pk: "BranchId",
        label: "Branch",
        fields: [
            { name: "BranchName", label: "Branch Name", type: "text", required: true },
            { name: "Address", label: "Address", type: "text" },
             { name: "City", label: "City", type: "text" },
             { name: "Phone", label: "Phone", type: "text" }
        ]
    },
    // 21. Currency -> tab_currency_master (currency_name, currency_code, currency_symbol, decimal_places)
    currency: {
        pk: "CurrencyId",
        label: "Currency",
        fields: [
            { name: "CurrencyName", label: "Name", type: "text", required: true },
             { name: "CurrencyCode", label: "Code", type: "text" },
            { name: "CurrencySymbol", label: "Symbol", type: "text" },
             { name: "DecimalPlaces", label: "Decimal Places", type: "number" }
        ]
    },
    // 22. Payment Mode -> tab_payment_mode_master (mode_name, is_default)
    paymentMode: {
        pk: "PaymentModeIdInternal",
        label: "Payment Mode",
        fields: [
            { name: "ModeName", label: "Name", type: "text", required: true },
             { name: "IsDefault", label: "Is Default", type: "checkbox" }
        ]
    },
    // 23. Payment Term -> tab_payment_term_master (term_name, number_of_days)
    paymentTerm: {
        pk: "TermId",
        label: "Payment Term",
        fields: [
            { name: "TermName", label: "Name", type: "text", required: true },
            { name: "NumberOfDays", label: "Days", type: "number", required: true }
        ]
    },
    // 24. Project -> tab_project_master (project_name, start_date, end_date, status, description)
    project: {
        pk: "ProjectId",
        label: "Project",
        fields: [
            { name: "ProjectName", label: "Project Name", type: "text", required: true },
            { name: "Status", label: "Status", type: "text" },
             { name: "StartDate", label: "Start Date", type: "date" },
              { name: "EndDate", label: "End Date", type: "date" },
               { name: "Description", label: "Description", type: "text" }
        ]
    }
};
