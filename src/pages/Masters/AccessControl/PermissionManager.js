import React, { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    CardBody,
    CardHeader,
    Table,
    Input,
    Label,
    Button,
    UncontrolledTooltip
} from 'reactstrap';
import Select from 'react-select';
import BreadCrumb from '../../../Components/Common/BreadCrumb';
import { APIClient } from '../../../helpers/api_helper';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PermissionManager = () => {
    document.title = "Role Permissions | SoftBook";
    const api = new APIClient();

    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch roles on load
    useEffect(() => {
        fetchRoles();
        fetchModules();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await api.get('/api/role');
            const roleOptions = response.map(r => ({
                value: r.roleId || r.RoleId,
                label: r.roleName || r.RoleName
            }));
            setRoles(roleOptions);
        } catch (error) {
            toast.error("Failed to load roles");
        }
    };

    const fetchModules = async () => {
        try {
            const response = await api.get('/api/permission/modules');
            // Initialize permissions state
            const initialModules = response.map(m => ({
                ...m,
                canView: false,
                canAdd: false,
                canEdit: false,
                canDelete: false
            }));
            setModules(initialModules);
        } catch (error) {
            toast.error("Failed to load modules");
        }
    };

    const handleRoleChange = async (selectedOption) => {
        setSelectedRole(selectedOption);
        if (selectedOption) {
            setLoading(true);
            try {
                const response = await api.get(`/api/permission/role/${selectedOption.value}`);
                // Map existing permissions to the modules list
                const updatedModules = modules.map(m => {
                    const existing = response.find(p => p.tabId === m.tabId);
                    return {
                        ...m,
                        canView: existing ? existing.canView : false,
                        canAdd: existing ? existing.canAdd : false,
                        canEdit: existing ? existing.canEdit : false,
                        canDelete: existing ? existing.canDelete : false
                    };
                });
                setModules(updatedModules);
            } catch (error) {
                toast.error("Failed to load permissions for this role");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCheckboxChange = (tabId, field) => {
        setModules(prev => prev.map(m => {
            if (m.tabId === tabId) {
                return { ...m, [field]: !m[field] };
            }
            return m;
        }));
    };

    const handleColumnAll = (field, checked) => {
        setModules(prev => prev.map(m => ({ ...m, [field]: checked })));
    };

    const handleRowAll = (tabId, checked) => {
        setModules(prev => prev.map(m => {
            if (m.tabId === tabId) {
                return {
                    ...m,
                    canView: checked,
                    canAdd: checked,
                    canEdit: checked,
                    canDelete: checked
                };
            }
            return m;
        }));
    };

    const handleSave = async () => {
        if (!selectedRole) {
            toast.warning("Please select a role first");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                roleId: selectedRole.value,
                permissions: modules.map(m => ({
                    tabId: m.tabId || m.TabId,
                    canView: !!(m.canView || m.CanView),
                    canAdd: !!(m.canAdd || m.CanAdd),
                    canEdit: !!(m.canEdit || m.CanEdit),
                    canDelete: !!(m.canDelete || m.CanDelete)
                }))
            };

            await api.post('/api/permission/save', payload);
            toast.success("Permissions updated successfully!");
        } catch (error) {
            toast.error("Failed to save permissions");
        } finally {
            setSaving(false);
        }
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <ToastContainer closeButton={false} limit={1} />
                <Container fluid>
                    <BreadCrumb title="Access Control" pageTitle="Masters" />

                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="align-items-center d-flex">
                                    <h4 className="card-title mb-0 flex-grow-1">Manage Role Permissions</h4>
                                </CardHeader>
                                <CardBody>
                                    <div className="mb-4" style={{ maxWidth: '400px' }}>
                                        <Label className="form-label">Under User Role</Label>
                                        <div className="d-flex gap-2">
                                            <div className="flex-grow-1">
                                                <Select
                                                    value={selectedRole}
                                                    onChange={handleRoleChange}
                                                    options={roles}
                                                    placeholder="Select Role..."
                                                />
                                            </div>
                                            <Button color="primary" onClick={handleSave} disabled={saving || !selectedRole}>
                                                {saving ? "Saving..." : "Submit"}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="table-responsive">
                                        <Table className="table-centered table-nowrap mb-0 mt-4 align-middle border">
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="text-center" style={{ width: '50px' }}>#</th>
                                                    <th>Module / Screen Name</th>
                                                    <th className="text-center">Select All</th>
                                                    <th className="text-center">
                                                        <Label className="mb-0 cursor-pointer" for="all-view">View</Label>
                                                        <div className="mt-1">
                                                            <Input type="checkbox" id="all-view" onChange={(e) => handleColumnAll('canView', e.target.checked)} />
                                                        </div>
                                                    </th>
                                                    <th className="text-center">
                                                        <Label className="mb-0 cursor-pointer" for="all-add">Add</Label>
                                                        <div className="mt-1">
                                                            <Input type="checkbox" id="all-add" onChange={(e) => handleColumnAll('canAdd', e.target.checked)} />
                                                        </div>
                                                    </th>
                                                    <th className="text-center">
                                                        <Label className="mb-0 cursor-pointer" for="all-edit">Edit</Label>
                                                        <div className="mt-1">
                                                            <Input type="checkbox" id="all-edit" onChange={(e) => handleColumnAll('canEdit', e.target.checked)} />
                                                        </div>
                                                    </th>
                                                    <th className="text-center">
                                                        <Label className="mb-0 cursor-pointer" for="all-delete">Delete</Label>
                                                        <div className="mt-1">
                                                            <Input type="checkbox" id="all-delete" onChange={(e) => handleColumnAll('canDelete', e.target.checked)} />
                                                        </div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan="7" className="text-center py-4">Loading permissions...</td>
                                                    </tr>
                                                ) : modules.length > 0 ? (
                                                    modules.map((m, index) => (
                                                        <tr key={m.tabId}>
                                                            <td className="text-center text-muted">{index + 1}</td>
                                                            <td className="fw-medium">{m.tabName}</td>
                                                            <td className="text-center">
                                                                <Input 
                                                                    type="checkbox" 
                                                                    checked={m.canView && m.canAdd && m.canEdit && m.canDelete}
                                                                    onChange={(e) => handleRowAll(m.tabId, e.target.checked)}
                                                                />
                                                            </td>
                                                            <td className="text-center">
                                                                <Input 
                                                                    type="checkbox" 
                                                                    checked={m.canView} 
                                                                    onChange={() => handleCheckboxChange(m.tabId, 'canView')}
                                                                />
                                                            </td>
                                                            <td className="text-center">
                                                                <Input 
                                                                    type="checkbox" 
                                                                    checked={m.canAdd} 
                                                                    onChange={() => handleCheckboxChange(m.tabId, 'canAdd')}
                                                                />
                                                            </td>
                                                            <td className="text-center">
                                                                <Input 
                                                                    type="checkbox" 
                                                                    checked={m.canEdit} 
                                                                    onChange={() => handleCheckboxChange(m.tabId, 'canEdit')}
                                                                />
                                                            </td>
                                                            <td className="text-center">
                                                                <Input 
                                                                    type="checkbox" 
                                                                    checked={m.canDelete} 
                                                                    onChange={() => handleCheckboxChange(m.tabId, 'canDelete')}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="7" className="text-center py-4">No modules found</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default PermissionManager;
