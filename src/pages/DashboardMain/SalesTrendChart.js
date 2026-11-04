import React, { useMemo } from 'react';
import ReactApexChart from "react-apexcharts";
import CountUp from "react-countup";
import { Card, CardBody, CardHeader, Col, UncontrolledTooltip } from 'reactstrap';
import getChartColorsArray from "../../Components/Common/ChartsDynamicColor";

const toNumber = (val) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
};

const formatCompactAmount = (num) => {
    const n = toNumber(num);
    const absNum = Math.abs(n);
    if (absNum >= 10000000) return (n / 10000000).toFixed(2) + " Cr";
    if (absNum >= 100000) return (n / 100000).toFixed(2) + " L";
    if (absNum >= 1000) return (n / 1000).toFixed(2) + " K";
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const SalesTrendChart = ({ dataColors, seriesData, kpiTotals, filter, loading }) => {
    const chartColors = getChartColorsArray(dataColors);

    // Group daily data into months for THIS_YEAR to avoid duplicate labels
    const processedData = useMemo(() => {
        if (!seriesData) return [];
        // Only aggregate for THIS_YEAR or when filter is missing (default yearly)
        if (filter !== "THIS_YEAR" && filter !== undefined) return seriesData;

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const grouped = {};

        // Initialize all 12 months with zero values to ensure they always show up
        months.forEach(m => {
            grouped[m] = { label: m, sales: 0, purchase: 0, expense: 0 };
        });

        seriesData.forEach(item => {
            let monthName = "";

            // 1. Search EVERY value in the object for a month name or abbreviation
            for (const key in item) {
                const val = (item[key] || '').toString();
                if (!val) continue;

                // Check for month abbreviation (Jan, Feb...)
                const found = months.find(m => val.toLowerCase().includes(m.toLowerCase()));
                if (found) {
                    monthName = found;
                    break;
                }

                // Check for month number (1-12) - only if key looks like a month field
                if (['month', 'period', 'm'].includes(key.toLowerCase())) {
                    if (!isNaN(val) && Number(val) >= 1 && Number(val) <= 12) {
                        monthName = months[Number(val) - 1];
                        break;
                    }
                }

                // Try date parsing
                const date = new Date(val);
                if (!isNaN(date.getTime()) && val.length > 5) { // length > 5 to avoid parsing simple numbers as years
                    monthName = date.toLocaleString('en-US', { month: 'short' });
                    break;
                }
            }

            if (monthName && grouped[monthName]) {
                grouped[monthName].sales += toNumber(item.sales || item.total_sales || item.Total_Sales);
                grouped[monthName].purchase += toNumber(item.purchase || item.total_purchase || item.Total_Purchase);
                grouped[monthName].expense += toNumber(item.expense || item.total_expense || item.Total_Expense);
            }
        });

        // Always return all 12 months for the yearly view to keep the axis clean
        return months.map(m => grouped[m]);
    }, [seriesData, filter]);

    // Prepare series for ApexCharts with defensive mapping
    const series = [
        {
            name: 'Total Sales',
            data: processedData?.map(item => toNumber(item.sales || item.total_sales)) || []
        },
        {
            name: 'Total Purchase',
            data: processedData?.map(item => toNumber(item.purchase || item.total_purchase)) || []
        },
        {
            name: 'Total Expense',
            data: processedData?.map(item => toNumber(item.expense || item.total_expense)) || []
        }
    ];

    const options = {
        chart: {
            height: 350,
            type: 'area',
            toolbar: {
                show: false,
            },
        },
        colors: chartColors,
        dataLabels: {
            enabled: false,
        },
        stroke: {
            curve: 'smooth',
            width: 2,
        },
        fill: {
            opacity: 0.06,
            colors: chartColors,
            type: 'solid'
        },
        xaxis: {
            type: 'category',
            categories: processedData?.map((item, index) => {
                if (item.period_label) return item.period_label;
                if (item.label && (filter === "THIS_YEAR" || !filter)) return item.label;

                const rawLabel = (item.period || item.date || item.hour || '').toString();

                // If it's a date string, format based on filter
                if (rawLabel.includes('-') || rawLabel.includes('T')) {
                    const date = new Date(rawLabel);
                    if (!isNaN(date.getTime())) {
                        if (filter === "TODAY" || filter === "YESTERDAY") return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                        
                        // Show "DD MMM" for any filter that results in a daily list (This Week, This Month, Prev Month, Custom)
                        if (filter === "THIS_WEEK" || filter === "THIS_MONTH" || filter === "PREV_MONTH" || filter === "CUSTOM") {
                            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        }
                    }
                }

                // If filter is TODAY and rawLabel is an hour number
                if ((filter === "TODAY" || filter === "YESTERDAY") && !isNaN(rawLabel) && rawLabel !== '') {
                    const hour = parseInt(rawLabel);
                    return hour >= 12 ? (hour === 12 ? "12 PM" : (hour - 12) + " PM") : (hour === 0 ? "12 AM" : hour + " AM");
                }

                return rawLabel || (index + 1).toString();
            }) || [],
            axisTicks: {
                show: true,
            },
            axisBorder: {
                show: true,
            },
            labels: {
                show: true,
                rotate: 0,
                rotateAlways: false,
                hideOverlappingLabels: true,
                minHeight: 30,
                style: {
                    colors: '#878a99',
                    fontSize: '12px',
                },
            }
        },
        yaxis: {
            labels: {
                show: true,
                minWidth: 40,
                formatter: function (value) {
                    return formatCompactAmount(value);
                }
            },
            tickAmount: 5,
        },
        tooltip: {
            shared: true,
            intersect: false,
            x: {
                show: true
            },
            y: {
                formatter: function (y) {
                    if (typeof y !== "undefined") {
                        return "₹ " + y.toLocaleString('en-IN', { minimumFractionDigits: 2 });
                    }
                    return y;
                }
            },
        },

        legend: {
            show: true,
            position: 'bottom',
            horizontalAlign: 'center',
            fontWeight: 500,
            offsetX: 0,
            offsetY: 10,
            itemMargin: {
                horizontal: 25,
                vertical: 5
            },
            markers: {
                width: 12,
                height: 12,
                radius: 12,
            }
        },
        markers: {
            size: 0,
        }
    };

    // Header totals match dashboard summary cards (kpi_cards), not a sum of chart buckets
    const totals = useMemo(() => {
        const seriesSales = seriesData?.reduce((acc, curr) => acc + toNumber(curr.sales || curr.total_sales), 0) || 0;
        const seriesPurchase = seriesData?.reduce((acc, curr) => acc + toNumber(curr.purchase || curr.total_purchase), 0) || 0;
        const seriesExpense = seriesData?.reduce((acc, curr) => acc + toNumber(curr.expense || curr.total_expense), 0) || 0;
        return {
            totalSales: kpiTotals?.totalSales != null && kpiTotals.totalSales !== '' ? toNumber(kpiTotals.totalSales) : seriesSales,
            totalPurchase: kpiTotals?.totalPurchase != null && kpiTotals.totalPurchase !== '' ? toNumber(kpiTotals.totalPurchase) : seriesPurchase,
            totalExpense: kpiTotals?.totalExpense != null && kpiTotals.totalExpense !== '' ? toNumber(kpiTotals.totalExpense) : seriesExpense,
        };
    }, [seriesData, kpiTotals]);

    const formatFullCurrency = (val) => {
        return "₹ " + toNumber(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <Col xl={6}>
            <Card className="card-height-100">
                <CardHeader className="align-items-center d-flex">
                    <h4 className="card-title mb-0 flex-grow-1">Financial Overview</h4>
                </CardHeader>
                <CardBody className="px-0">
                    <ul className="list-inline main-chart text-center mb-0">
                        <li className="list-inline-item chart-border-left me-0 border-0">
                            <h4 className="text-primary" id="total-sales-header">₹
                                <CountUp
                                    start={0}
                                    end={totals.totalSales}
                                    duration={3}
                                    formattingFn={formatCompactAmount}
                                />
                                <span className="text-muted d-inline-block fs-13 align-middle ms-2">Sales</span></h4>
                            <UncontrolledTooltip placement="top" target="total-sales-header">
                                {formatFullCurrency(totals.totalSales)}
                            </UncontrolledTooltip>
                        </li>
                        <li className="list-inline-item chart-border-left me-0">
                            <h4 id="total-purchase-header">₹
                                <CountUp
                                    start={0}
                                    end={totals.totalPurchase}
                                    duration={3}
                                    formattingFn={formatCompactAmount}
                                />
                                <span className="text-muted d-inline-block fs-13 align-middle ms-2">Purchase</span></h4>
                            <UncontrolledTooltip placement="top" target="total-purchase-header">
                                {formatFullCurrency(totals.totalPurchase)}
                            </UncontrolledTooltip>
                        </li>
                        <li className="list-inline-item chart-border-left me-0">
                            <h4 id="total-expense-header">₹
                                <CountUp
                                    start={0}
                                    end={totals.totalExpense}
                                    duration={3}
                                    formattingFn={formatCompactAmount}
                                />
                                <span className="text-muted d-inline-block fs-13 align-middle ms-2">Expense</span></h4>
                            <UncontrolledTooltip placement="top" target="total-expense-header">
                                {formatFullCurrency(totals.totalExpense)}
                            </UncontrolledTooltip>
                        </li>
                    </ul>

                    <div id="sales-trend-charts" dir="ltr" style={{ position: 'relative', minHeight: '350px' }}>
                        {loading && (
                            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 10 }}>
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        )}
                        <ReactApexChart
                            key={`sales-trend-${filter}`}
                            options={options}
                            series={series}
                            type="area"
                            height="350"
                            className="apex-charts"
                        />
                    </div>
                </CardBody>
            </Card>
        </Col>
    );
};

export default SalesTrendChart;
