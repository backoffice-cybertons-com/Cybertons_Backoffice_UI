import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, Col, Spinner, Table } from 'reactstrap';
import { useSelector } from 'react-redux';
import { getSystemLogDatewise } from '../../helpers/fakebackend_helper';
import { isAdminUser } from '../../utils/isAdminUser';
import { getDashboardDateRange } from '../../utils/dashboardDateRange';

const normalizeRow = (row) => ({
    userId: row.userId ?? row.UserId,
    username: row.username ?? row.Username ?? '',
    loginCount: Number(row.loginCount ?? row.LoginCount ?? 0),
    logoutCount: Number(row.logoutCount ?? row.LogoutCount ?? 0),
    addCount: Number(row.addCount ?? row.AddCount ?? 0),
    editCount: Number(row.editCount ?? row.EditCount ?? 0),
    deleteCount: Number(row.deleteCount ?? row.DeleteCount ?? 0),
});

const SystemLogDatewiseCard = ({ filterType, customFromDate, customToDate, periodLabel, loading: parentLoading }) => {
    const { permissions } = useSelector((state) => state.auth || {});
    const isAdmin = useMemo(() => isAdminUser(permissions), [permissions]);

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { fromDate, toDate } = useMemo(
        () => getDashboardDateRange(filterType, customFromDate, customToDate),
        [filterType, customFromDate, customToDate]
    );

    useEffect(() => {
        if (!isAdmin) return;

        let cancelled = false;
        const fetchLog = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await getSystemLogDatewise(fromDate, toDate);
                const data = Array.isArray(response) ? response : (response?.data || []);
                if (!cancelled) {
                    setRows(data.map(normalizeRow));
                }
            } catch (err) {
                if (!cancelled) {
                    console.warn('System log summary failed:', err);
                    setError('Failed to load system log summary.');
                    setRows([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchLog();
        return () => { cancelled = true; };
    }, [isAdmin, fromDate, toDate]);

    if (!isAdmin) {
        return null;
    }

    const showOverlay = parentLoading || loading;

    return (
        <Col xl={8}>
            <Card className="card-height-100">
                <CardBody style={{ position: 'relative' }}>
                    {showOverlay && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 10 }}>
                            <Spinner color="danger" size="sm" />
                        </div>
                    )}
                    <div className="d-flex align-items-center mb-3">
                        <div className="flex-grow-1">
                            <h4 className="card-title mb-1">System Log Datewise</h4>
                            <p className="text-muted mb-0 fs-12">{periodLabel} — Login/Logout + tab_sale_pur Add/Edit/Delete (Admin only)</p>
                        </div>
                        <div className="avatar-sm flex-shrink-0">
                            <span className="avatar-title bg-soft-danger rounded fs-3">
                                <i className="ri-shield-user-line text-danger"></i>
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger py-2 mb-3">{error}</div>
                    )}

                    <div className="table-responsive">
                        <Table className="table-bordered table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>User</th>
                                    <th className="text-center">Login</th>
                                    <th className="text-center">Logout</th>
                                    <th className="text-center">Add</th>
                                    <th className="text-center">Edit</th>
                                    <th className="text-center">Delete</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length > 0 ? rows.map((row) => (
                                    <tr key={row.userId}>
                                        <td className="fw-medium">{row.username || '—'}</td>
                                        <td className="text-center">{row.loginCount}</td>
                                        <td className="text-center">{row.logoutCount}</td>
                                        <td className="text-center text-success">{row.addCount}</td>
                                        <td className="text-center text-primary">{row.editCount}</td>
                                        <td className="text-center text-danger">{row.deleteCount}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="text-center text-muted py-4">
                                            {loading ? 'Loading...' : 'No activity logged for this period.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </CardBody>
            </Card>
        </Col>
    );
};

export default SystemLogDatewiseCard;
