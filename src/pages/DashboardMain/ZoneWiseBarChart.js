import React, { useState, useMemo } from 'react';
import ReactApexChart from "react-apexcharts";
import { Card, CardHeader, Col } from 'reactstrap';
import classNames from "classnames";

const ZoneWiseBarChart = ({ zoneWiseData }) => {
    const [dataType, setDataType] = useState("sales");

    const { data, categories } = useMemo(() => {
        if (!zoneWiseData || !Array.isArray(zoneWiseData) || zoneWiseData.length === 0) {
            return { data: [], categories: [] };
        }

        const sorted = [...zoneWiseData].sort((a, b) =>
            (parseFloat(b[`total_${dataType}`]) || 0) - (parseFloat(a[`total_${dataType}`]) || 0)
        );

        return {
            data: sorted.map(item => parseFloat(item[`total_${dataType}`]) || 0),
            categories: sorted.map(item => item.city || 'Unknown')
        };
    }, [zoneWiseData, dataType]);

    const colorMap = { sales: '#299cdb', purchase: '#f06548', expense: '#45cb85' };
    const chartHeight = Math.max(300, categories.length * 50);

    const series = [{ name: dataType.charAt(0).toUpperCase() + dataType.slice(1), data }];

    const options = {
        chart: {
            type: 'bar',
            toolbar: { show: false },
        },
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 4,
                barHeight: '50%',
                distributed: false,
            }
        },
        colors: [colorMap[dataType]],
        dataLabels: {
            enabled: true,
            textAnchor: 'start',
            offsetX: 5,
            style: {
                fontSize: '11px',
                fontWeight: 400,
                colors: ['#adb5bd']
            },
            formatter: (val) => {
                if (val >= 10000000) return "₹" + (val / 10000000).toFixed(1) + "Cr";
                if (val >= 100000) return "₹" + (val / 100000).toFixed(1) + "L";
                if (val >= 1000) return "₹" + (val / 1000).toFixed(1) + "K";
                return "₹" + val.toFixed(0);
            }
        },
        legend: { show: false },
        grid: {
            show: true,
            borderColor: '#f1f1f1',
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: false } },
            padding: { top: 0, right: 20, bottom: 0, left: 0 }
        },
        xaxis: {
            categories,
            tickAmount: 5,
            labels: {
                show: true,
                style: { fontSize: '11px', colors: '#878a99' },
                formatter: (val) => {
                    const n = parseFloat(val);
                    if (isNaN(n)) return val;
                    if (n >= 10000000) return (n / 10000000).toFixed(1) + "Cr";
                    if (n >= 100000) return (n / 100000).toFixed(1) + "L";
                    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
                    return n === 0 ? "0" : n.toFixed(0);
                }
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                show: true,
                style: { fontSize: '12px', colors: '#878a99' },
            }
        },
        tooltip: {
            y: {
                formatter: (val) => "₹ " + parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })
            }
        }
    };

    return (
        <Col xl={4}>
            <Card className="card-height-100">
                <CardHeader className="align-items-center d-flex">
                    <h4 className="card-title mb-0 flex-grow-1">Zone-wise Statistics</h4>
                    <div className="d-flex gap-1 flex-shrink-0">
                        {['sales', 'purchase', 'expense'].map(type => (
                            <button
                                key={type}
                                type="button"
                                className={classNames("btn btn-sm", {
                                    "btn-soft-secondary": dataType !== type,
                                    "btn-soft-primary active": dataType === type
                                })}
                                onClick={() => setDataType(type)}
                            >
                                {type === 'sales' ? 'Sales' : type === 'purchase' ? 'Pur' : 'Exp'}
                            </button>
                        ))}
                    </div>
                </CardHeader>
                <div
                    className="card-body px-3"
                    style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: '450px' }}
                >
                    <ReactApexChart
                        dir="ltr"
                        options={options}
                        series={series}
                        type="bar"
                        height={chartHeight}
                        className="apex-charts"
                    />
                </div>
            </Card>
        </Col>
    );
};

export default ZoneWiseBarChart;
