import React, { useState, useEffect} from 'react';
import { api } from '../api';
import CouponManagementPage from './CouponManagementPage';
import ReportDashboard from './ReportDashboard';
import SystemLogPanel from './SystemLogPanel';

export default function AdminPortal({ user, addToast }) {
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'vendors', 'products', 'categories', 'staff', 'customers'
  const [loading, setLoading] = useState(false);

  // Statistics
  const [stats, setStats] = useState(null);

  // Vendors List & Approval
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [vendorFilter, setVendorFilter] = useState(''); // Status filter

  // Products Approval List
  const [pendingProducts, setPendingProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Categories
  const [categories, setCategories] = useState([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catActive, setCatActive] = useState(true);

  // Staff Account Provisioning
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState('WAREHOUSE_STAFF');

  // Customer List
  const [customers, setCustomers] = useState([]);

  // Warehouses
  const [warehouseCode, setWarehouseCode] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseAddress, setWarehouseAddress] = useState('');
  const [warehouseCity, setWarehouseCity] = useState('');
  const [warehouseState, setWarehouseState] = useState('');
  const [warehouseZip, setWarehouseZip] = useState('');
  const [warehouseCountry, setWarehouseCountry] = useState('');
  const [warehouseCapacity, setWarehouseCapacity] = useState('100');
  const [warehouseStatus, setWarehouseStatus] = useState('ACTIVE');
  const [warehouses, setWarehouses] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);

  // Commission Rates
  const [commissionRates, setCommissionRates] = useState([]);
  const [rateCategory, setRateCategory] = useState('');
  const [rateValue, setRateValue] = useState('');

  useEffect(() => {
    loadTabContent();
  }, [activeTab, vendorFilter]);

  const loadTabContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        const statsResponse = await api.admin.getStats();
        // Notice response might be wrapped in ApiResponse
        setStats(statsResponse.data || statsResponse);
      } else if (activeTab === 'vendors') {
        const vendorsResponse = await api.admin.listVendors(vendorFilter);
        // Notice: pageable response returns content inside .content
        const list = vendorsResponse.data?.content || vendorsResponse.content || vendorsResponse.data || vendorsResponse || [];
        setVendors(list);
      } else if (activeTab === 'products') {
        const productsResponse = await api.admin.listPendingProducts();
        setPendingProducts(productsResponse.data || productsResponse || []);
      } else if (activeTab === 'categories') {
        const categoriesResponse = await api.admin.listCategories();
        setCategories(categoriesResponse.data || categoriesResponse || []);
      } else if (activeTab === 'customers') {
        const customersResponse = await api.admin.listCustomers();
        setCustomers(customersResponse.data || customersResponse || []);
      } else if (activeTab === 'warehouses') {
        const warehousesResponse = await api.admin.listWarehouses();
        setWarehouses(warehousesResponse.data || warehousesResponse || []);
      } else if (activeTab === 'orders') {
        const ordersRes = await api.orders.adminGetOrders();
        setAdminOrders(ordersRes.data || ordersRes || []);
      } else if (activeTab === 'commissionRates') {
        const ratesRes = await api.categories.getCommissionRates();
        const categoriesRes = await api.admin.listCategories();
        setCommissionRates(ratesRes.data || ratesRes || []);
        setCategories(categoriesRes.data || categoriesRes || []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Vendor Action Handler
  const handleVendorReview = async (vendorId, action) => {
    try {
      let response;
      if (action === 'approve') {
        response = await api.admin.approveVendor(vendorId, reviewRemarks);
        addToast('Vendor profile approved and activated!', 'success');
      } else if (action === 'reject') {
        response = await api.admin.rejectVendor(vendorId, reviewRemarks);
        addToast('Vendor profile rejected.', 'warning');
      } else if (action === 'suspend') {
        response = await api.admin.suspendVendor(vendorId, reviewRemarks);
        addToast('Vendor merchant account suspended.', 'error');
      }

      setReviewRemarks('');
      setSelectedVendor(null);
      loadTabContent();
    } catch (err) {
      addToast(err.message || 'Action failed', 'error');
    }
  };

  const handleProductReview = async (productId, action) => {
    try {
      if (action === 'approve') {
        await api.admin.approveProduct(productId, reviewRemarks);
        addToast('Product approved and live in catalog!', 'success');
      } else {
        await api.admin.rejectProduct(productId, reviewRemarks);
        addToast('Product rejected.', 'warning');
      }
      setReviewRemarks('');
      setSelectedProduct(null);
      loadTabContent();
    } catch (err) {
      addToast(err.message || 'Action failed', 'error');
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE': return <span className="badge badge-active">Active</span>;
      case 'PENDING': return <span className="badge badge-pending">Pending Approval</span>;
      case 'REJECTED': return <span className="badge badge-rejected">Rejected</span>;
      case 'SUSPENDED': return <span className="badge badge-suspended">Suspended</span>;
      default: return <span className="badge badge-pending">{status}</span>;
    }
  };

  const viewVendorDetails = async (vendor) => {
    setSelectedVendor(vendor);
    try {
      const historyResponse = await api.admin.getVendorApprovalHistory(vendor.vendorId);
      setApprovalHistory(historyResponse.data || historyResponse || []);
    } catch (err) {
      console.error('Failed to load approval log history', err);
    }
  };

  // Category CRUD
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!catName) return;
    try {
      const payload = {
        categoryName: catName,
        description: catDesc,
        active: catActive,
      };

      if (editingCategory) {
        await api.admin.updateCategory(editingCategory.id, payload);
        addToast('Category updated successfully!', 'success');
      } else {
        await api.admin.createCategory(payload);
        addToast('New category taxonomy created!', 'success');
      }

      setCatName('');
      setCatDesc('');
      setCatActive(true);
      setEditingCategory(null);
      setShowCategoryForm(false);
      loadTabContent();
    } catch (err) {
      addToast(err.message || 'Failed to submit category', 'error');
    }
  };

  const startEditCategory = (cat) => {
    setEditingCategory(cat);
    setCatName(cat.categoryName || '');
    setCatDesc(cat.description || '');
    setCatActive(cat.active !== false);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Are you sure you want to delete this category? Products in this category may lose their reference.')) return;
    try {
      await api.admin.deleteCategory(id);
      addToast('Category deleted successfully.', 'success');
      loadTabContent();
    } catch (err) {
      addToast(err.message || 'Failed to delete category', 'error');
    }
  };

  const handleWarehouseCreate = async (e) => {
    e.preventDefault();
    if (!warehouseCode || !warehouseName || !warehouseAddress || !warehouseCity || !warehouseState || !warehouseZip || !warehouseCountry || !warehouseCapacity) {
      addToast('Please complete all warehouse fields.', 'error');
      return;
    }

    try {
      await api.admin.createWarehouse({
        code: warehouseCode,
        name: warehouseName,
        address: warehouseAddress,
        city: warehouseCity,
        state: warehouseState,
        zipCode: warehouseZip,
        country: warehouseCountry,
        capacity: Number(warehouseCapacity),
        status: warehouseStatus,
      });
      addToast(`Warehouse ${warehouseName} created successfully.`, 'success');
      setWarehouseCode('');
      setWarehouseName('');
      setWarehouseAddress('');
      setWarehouseCity('');
      setWarehouseState('');
      setWarehouseZip('');
      setWarehouseCountry('');
      setWarehouseCapacity('100');
      setWarehouseStatus('ACTIVE');
      loadTabContent();
    } catch (err) {
      addToast(err.message || 'Warehouse creation failed', 'error');
    }
  };

  // Staff Provisions
  const handleStaffProvision = async (e) => {
    e.preventDefault();
    if (!staffName || !staffEmail || !staffPassword) {
      addToast('All fields except phone are required for staff provisioning', 'error');
      return;
    }
    try {
      await api.admin.createStaffAccount({
        name: staffName,
        email: staffEmail,
        password: staffPassword,
        role: staffRole,
        phone: staffPhone ? parseInt(staffPhone.replace(/\D/g, '')) : null
      });
      addToast(`Staff account for ${staffName} provisioned successfully!`, 'success');
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      setStaffPhone('');
    } catch (err) {
      addToast(err.message || 'Provisioning failed', 'error');
    }
  };

  const handleCommissionRateCreate = async (e) => {
    e.preventDefault();
    if (!rateCategory || !rateValue) {
      addToast('Please select a category and specify a rate.', 'error');
      return;
    }
    try {
      await api.categories.createCommissionRate({
        categoryId: rateCategory,
        commissionRate: Number(rateValue),
        effectiveFrom: new Date().toISOString(),
      });
      addToast('Category commission rate registered successfully!', 'success');
      setRateCategory('');
      setRateValue('');
      loadTabContent();
    } catch (err) {
      addToast(err.message || 'Failed to save commission rate', 'error');
    }
  };

  const handleToggleRateStatus = async (rateId) => {
    try {
      await api.categories.toggleCommissionRateStatus(rateId);
      addToast('Commission rate status updated.', 'success');
      loadTabContent();
    } catch (err) {
      addToast(err.message || 'Status toggle failed', 'error');
    }
  };

  return (
    <div className="dashboard-container">
      {/* Admin Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-title">ShopStack Admin</div>
        <button className={`sidebar-link ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          📊 Summary Overview
        </button>
        <button className={`sidebar-link ${activeTab === 'vendors' ? 'active' : ''}`} onClick={() => setActiveTab('vendors')}>
          🤝 Onboarding Requests
        </button>
        <button className={`sidebar-link ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
          📦 Product Verifications
        </button>
        <button className={`sidebar-link ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
          📂 Category Taxonomy
        </button>
        <button className={`sidebar-link ${activeTab === 'commissionRates' ? 'active' : ''}`} onClick={() => setActiveTab('commissionRates')}>
          💰 Category Commissions
        </button>
        <button className={`sidebar-link ${activeTab === 'coupons' ? 'active' : ''}`} onClick={() => setActiveTab('coupons')}>
          🎟️ Coupon Management
        </button>
<button className={`sidebar-link ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
  📊 Reports
</button>
<button className={`sidebar-link ${activeTab === 'systemLogs' ? 'active' : ''}`} onClick={() => setActiveTab('systemLogs')}>
  🗒️ System Logs
</button>
        <button className={`sidebar-link ${activeTab === 'warehouses' ? 'active' : ''}`} onClick={() => setActiveTab('warehouses')}>
          🏭 Warehouse Management
        </button>
        <button className={`sidebar-link ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          📋 Order & Refund Control
        </button>
        <button className={`sidebar-link ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
          🛡️ Provision Accounts
        </button>
        <button className={`sidebar-link ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
          👥 Customer Directory
        </button>
      </div>

      {/* Main Workspace Area */}
      <div className="main-content" style={{ textAlign: 'left' }}>
        
        {activeTab === 'coupons' && (
          <CouponManagementPage addToast={addToast} />
        )}
        
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div className="spinner" style={{ width: '30px', height: '30px' }}></div>
          </div>
        )}

        {activeTab === 'stats' && stats && (
          /* DASHBOARD STATISTICS OVERVIEW */
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '2rem' }}>Admin Dashboard</h2>
            
            <div className="stats-grid">
              <div className="glass-card stat-card">
                <span className="stat-num">{stats.totalProducts || 0}</span>
                <span style={{ color: 'var(--text-secondary)' }}>Total Products</span>
              </div>
              <div className="glass-card stat-card">
                <span className="stat-num">{stats.pendingProducts || 0}</span>
                <span style={{ color: 'var(--text-secondary)' }}>Pending Product Reviews</span>
              </div>
              <div className="glass-card stat-card">
                <span className="stat-num">{stats.totalVendors || 0}</span>
                <span style={{ color: 'var(--text-secondary)' }}>Total Registered Vendors</span>
              </div>
              <div className="glass-card stat-card">
                <span className="stat-num">{stats.pendingVendors || 0}</span>
                <span style={{ color: 'var(--text-secondary)' }}>Pending Vendor Approvals</span>
              </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="glass-card stat-card">
                <span className="stat-num" style={{ fontSize: '1.75rem' }}>{stats.totalCategories || 0}</span>
                <span style={{ color: 'var(--text-secondary)' }}>Active Category Taxonomies</span>
              </div>
              <div className="glass-card stat-card">
                <span className="stat-num" style={{ fontSize: '1.75rem' }}>{stats.totalCustomers || 0}</span>
                <span style={{ color: 'var(--text-secondary)' }}>Registered Customer Profiles</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vendors' && (
          /* VENDOR DIRECTORY & ONBOARDING ACTIONS */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Merchant Registrations</h3>
              <select className="form-input" style={{ width: '180px', padding: '0.4rem' }} value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Approval</option>
                <option value="ACTIVE">Active Merchants</option>
                <option value="SUSPENDED">Suspended Merchants</option>
                <option value="REJECTED">Rejected Applications</option>
              </select>
            </div>

            {vendors.length === 0 ? (
              <div className="glass-card" style={{ padding: '3rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                No merchants found matching your filter.
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map(ven => (
                      <tr key={ven.vendorId}>
                        <td>
                          <strong>{ven.businessName}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ven.businessType}</div>
                        </td>
                        <td>{ven.businessEmail}</td>
                        <td>{ven.businessPhone}</td>
                        <td>
                          {ven.status === 'ACTIVE' && <span className="badge badge-active">Active</span>}
                          {ven.status === 'PENDING' && <span className="badge badge-pending">Pending</span>}
                          {ven.status === 'REJECTED' && <span className="badge badge-rejected">Rejected</span>}
                          {ven.status === 'SUSPENDED' && <span className="badge badge-suspended">Suspended</span>}
                        </td>
                        <td>
                          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => viewVendorDetails(ven)}>
                            Review Application
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          /* PRODUCT VERIFICATIONS */
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.5rem' }}>Product Approval Queue</h3>
            
            {pendingProducts.length === 0 ? (
              <div className="glass-card" style={{ padding: '4rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Great! The product moderation queue is empty.
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Product Info</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Merchant ID</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingProducts.map(prod => (
                      <tr key={prod.id}>
                        <td>
                          <strong>{prod.productName}</strong>
                          {prod.brand && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{prod.brand}</div>}
                        </td>
                        <td>{prod.categoryName || 'General'}</td>
                        <td>₹{prod.price}</td>
                        <td>Merchant #{prod.vendorId}</td>
                        <td>
                          <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setSelectedProduct(prod)}>
                            Review & Moderate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          /* CATEGORY taxonomy */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Category Taxonomy</h3>
              <button className="btn btn-primary" onClick={() => { setCatName(''); setCatDesc(''); setCatActive(true); setCatActive(true); setEditingCategory(null); setShowCategoryForm(true); }}>
                + Create Category
              </button>
            </div>

            {showCategoryForm && (
              <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '480px' }}>
                  <button className="modal-close" onClick={() => setShowCategoryForm(false)}>×</button>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.5rem' }}>
                    {editingCategory ? 'Edit Category Taxonomy' : 'Create Category Taxonomy'}
                  </h3>
                  <form onSubmit={handleCategorySubmit}>
                    <div className="form-group">
                      <label className="form-label">Category Name *</label>
                      <input type="text" className="form-input" placeholder="Electronics" value={catName} onChange={(e) => setCatName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea className="form-input" placeholder="Enter sub-classification details..." value={catDesc} onChange={(e) => setCatDesc(e.target.value)} rows="3"></textarea>
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        id="category-active"
                        type="checkbox"
                        checked={catActive}
                        onChange={(e) => setCatActive(e.target.checked)}
                      />
                      <label htmlFor="category-active" className="form-label" style={{ margin: 0 }}>
                        Active category
                      </label>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                      {editingCategory ? 'Update Category' : 'Save Category'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id}>
                      <td><strong>{cat.categoryName}</strong></td>
                      <td>{cat.description || 'No description provided'}</td>
                      <td>
                        {cat.active !== false ? (
                          <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>Active</span>
                        ) : (
                          <span className="badge badge-suspended" style={{ fontSize: '0.65rem' }}>Inactive</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => startEditCategory(cat)}>
                            Edit
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleDeleteCategory(cat.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          /* PROVISIONING STAFF ACCOUNTS */
          <div style={{ maxWidth: '500px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.5rem' }}>Provision Privileged Staff Account</h3>
            
            <div className="glass-card">
              <form onSubmit={handleStaffProvision}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="form-input" placeholder="Staff Member Name" value={staffName} onChange={(e) => setStaffName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" className="form-input" placeholder="staff@shopstack.com" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Password *</label>
                  <input type="password" className="form-input" placeholder="Must be at least 8 chars" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} required minLength={8} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" className="form-input" placeholder="10 Digit Number" value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Authorized Access Role *</label>
                  <select className="form-input" value={staffRole} onChange={(e) => setStaffRole(e.target.value)} required>
                    <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  Register Staff Credential
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'warehouses' && (
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1rem' }}>Warehouse Creation</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.2rem' }}>Create fulfillment hubs that warehouse staff can manage from their portal.</p>

            <form className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gap: '0.8rem' }} onSubmit={handleWarehouseCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
                <input className="form-input" placeholder="Warehouse Code" value={warehouseCode} onChange={(e) => setWarehouseCode(e.target.value)} />
                <input className="form-input" placeholder="Warehouse Name" value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} />
                <input className="form-input" placeholder="Address" value={warehouseAddress} onChange={(e) => setWarehouseAddress(e.target.value)} />
                <input className="form-input" placeholder="City" value={warehouseCity} onChange={(e) => setWarehouseCity(e.target.value)} />
                <input className="form-input" placeholder="State" value={warehouseState} onChange={(e) => setWarehouseState(e.target.value)} />
                <input className="form-input" placeholder="ZIP" value={warehouseZip} onChange={(e) => setWarehouseZip(e.target.value)} />
                <input className="form-input" placeholder="Country" value={warehouseCountry} onChange={(e) => setWarehouseCountry(e.target.value)} />
                <input className="form-input" type="number" min="1" placeholder="Capacity" value={warehouseCapacity} onChange={(e) => setWarehouseCapacity(e.target.value)} />
                <select className="form-input" value={warehouseStatus} onChange={(e) => setWarehouseStatus(e.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit">Create Warehouse</button>
            </form>

            <h4 style={{ marginBottom: '0.8rem' }}>Existing Warehouses</h4>
            {warehouses.length === 0 ? (
              <div className="glass-card" style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>No warehouses created yet.</div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>City</th>
                      <th>Capacity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouses.map((warehouse) => (
                      <tr key={warehouse.id}>
                        <td>{warehouse.code}</td>
                        <td>{warehouse.name}</td>
                        <td>{warehouse.city}</td>
                        <td>{warehouse.capacity}</td>
                        <td>{warehouse.status || 'ACTIVE'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'customers' && (
          /* CUSTOMERS DIRECTORY */
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.5rem' }}>Customers Base</h3>
            
            {customers.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No registered customers profile available.</p>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Email Address</th>
                      <th>Phone Number</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(c => (
  <tr key={c.id}>
    <td><strong>{c.fullName}</strong></td>
    <td>{c.email}</td>
    <td>{c.phoneNumber || 'Not provided'}</td>
    <td>
  <span
    style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 700,
      backgroundColor: c.active
        ? 'rgba(16, 185, 129, 0.18)'
        : 'rgba(239, 68, 68, 0.18)',
      color: c.active ? '#10b981' : '#ef4444',
      border: `1px solid ${
        c.active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
      }`
    }}
  >
    {c.active ? 'ACTIVE' : 'SUSPENDED'}
  </span>
</td>
  </tr>
))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Render Orders Control Tab */}
        {activeTab === 'orders' && (
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.5rem' }}>Enterprise Order Control Dashboard</h3>
            
            <div style={{ maxWidth: '800px' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--primary)' }}>Active System Orders ({adminOrders.length})</h4>
              <div style={{ maxHeight: '600px', overflowY: 'auto', display: 'grid', gap: '1rem' }}>
                {adminOrders.map(o => (
                  <div key={o.id} className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <strong style={{ fontSize: '1.1rem' }}>Order #{o.id.substring(0, 8)}...</strong>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem' }}>{o.status}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <p>Total Amount: ₹{o.totalAmount || o.total}</p>
                      <p>Customer: {o.user?.fullName || 'Guest'} ({o.user?.email || 'N/A'})</p>
                      <p>Date: {new Date(o.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {adminOrders.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No orders in the system.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Render Reports Tab */}
        {activeTab === 'reports' && (
          <ReportDashboard addToast={addToast} />
        )}

        {activeTab === 'commissionRates' && (
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.5rem' }}>Category Commission Rate Overrides</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem', alignItems: 'start' }}>
              {/* Form to add rate override */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h4 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--primary)' }}>Add Category Commission Override</h4>
                <form onSubmit={handleCommissionRateCreate}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Category *</label>
                    <select
                      className="form-input"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}
                      value={rateCategory}
                      onChange={(e) => setRateCategory(e.target.value)}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.categoryName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Commission Override Rate (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="form-input"
                      placeholder="e.g. 8.5"
                      value={rateValue}
                      onChange={(e) => setRateValue(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                    Save Override Rate
                  </button>
                </form>
              </div>

              {/* Table of active and historical rates */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Registered Commission Overrides</h4>
                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Override Rate</th>
                        <th>Status</th>
                        <th>Effective From</th>
                        <th>Effective To</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissionRates.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.categoryName}</strong></td>
                          <td style={{ fontWeight: 600 }}>{r.commissionRate}%</td>
                          <td>
                            <span className="badge" style={{
                              background: r.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: r.active ? '#10b981' : '#ef4444'
                            }}>
                              {r.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{r.effectiveFrom ? new Date(r.effectiveFrom).toLocaleDateString() : 'N/A'}</td>
                          <td>{r.effectiveTo ? new Date(r.effectiveTo).toLocaleDateString() : 'Present'}</td>
                          <td>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                              onClick={() => handleToggleRateStatus(r.id)}
                            >
                              Toggle Status
                            </button>
                          </td>
                        </tr>
                      ))}
                      {commissionRates.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            No category overrides configured.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Render System Logs Tab */}
        {activeTab === 'systemLogs' && (
          <SystemLogPanel addToast={addToast} />
        )}
        {/* MODAL: VENDOR DETAILED APPROVAL */}
        {selectedVendor && (
          <div className="modal-overlay" onClick={() => setSelectedVendor(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
              <button className="modal-close" onClick={() => setSelectedVendor(null)}>×</button>
              
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '0.25rem' }}>{selectedVendor.businessName}</h2>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <span className="badge badge-pending">{selectedVendor.businessType}</span>
                {renderStatusBadge(selectedVendor.status)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem', fontWeight: 600 }}>Compliance Credentials</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>BUSINESS EMAIL</strong>
                      <p>{selectedVendor.businessEmail}</p>
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>BUSINESS PHONE</strong>
                      <p>{selectedVendor.businessPhone}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>GSTIN</strong>
                        <p>{selectedVendor.gstNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PAN</strong>
                        <p>{selectedVendor.panNumber || 'N/A'}</p>
                      </div>
                    </div>
                    {selectedVendor.description && (
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>DESCRIPTION</strong>
                        <p>{selectedVendor.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem', fontWeight: 600 }}>Bank & Address</h4>
                  {/* Bank Details */}
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SETTLEMENT A/C</strong>
                  {selectedVendor.bankDetails && selectedVendor.bankDetails.length > 0 ? (
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', marginTop: '0.2rem', marginBottom: '0.75rem' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedVendor.bankDetails[0].bankName}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>A/C: {selectedVendor.bankDetails[0].accountNumber}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>IFSC: {selectedVendor.bankDetails[0].ifscOrSwiftCode}</p>
                    </div>
                  ) : (
                    <p style={{ fontStyle: 'italic', fontSize: '0.8rem', marginBottom: '0.75rem' }}>No bank registered</p>
                  )}

                  {/* Address */}
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>MERCHANT LOCATION</strong>
                  {selectedVendor.addresses && selectedVendor.addresses.length > 0 ? (
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', marginTop: '0.2rem' }}>
                      <p style={{ fontSize: '0.85rem' }}>{selectedVendor.addresses[0].addressLine1}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedVendor.addresses[0].city}, {selectedVendor.addresses[0].state}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedVendor.addresses[0].postalCode}, {selectedVendor.addresses[0].country}</p>
                    </div>
                  ) : (
                    <p style={{ fontStyle: 'italic', fontSize: '0.8rem' }}>No address registered</p>
                  )}
                </div>
              </div>

              {/* Vendor compliance docs */}
              {selectedVendor.documents && selectedVendor.documents.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 600 }}>Compliance Documents</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {selectedVendor.documents.map((doc, idx) => (
                      <div key={idx} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{(doc.documentType || '').replace('_', ' ')}</span>
                        <a href={doc.documentUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                          View Document ↗
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review remarks & actions */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Moderator Action Form</h4>
                <div className="form-group">
                  <label className="form-label">Review Remarks / Rejection Reason</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter approval details or audit comments..." 
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleVendorReview(selectedVendor.vendorId, 'approve')}>
                    Approve & Active Merchant
                  </button>
                  <button className="btn btn-secondary" style={{ flex: 1, color: 'var(--warning)', borderColor: 'var(--warning)' }} onClick={() => handleVendorReview(selectedVendor.vendorId, 'reject')}>
                    Reject Application
                  </button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleVendorReview(selectedVendor.vendorId, 'suspend')}>
                    Suspend Merchant Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: PRODUCT DETAILS MODERATION */}
        {selectedProduct && (
          <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>×</button>
              
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '0.5rem' }}>{selectedProduct.productName}</h2>
              <span className="badge badge-pending" style={{ marginBottom: '1.5rem' }}>Pending Moderation</span>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>SPECIFICATION DESCRIPTION</h4>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{selectedProduct.description || 'No description supplied'}</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MSRP PRICE</span>
                    <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--secondary)' }}>₹{selectedProduct.price}</p>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>STOCK COUNT</span>
                    <p style={{ fontWeight: 600 }}>₹{selectedProduct.stockQuantity} units available</p>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SUB-CLASSIFICATION</span>
                    <p style={{ fontWeight: 600 }}>{selectedProduct.categoryName || 'General'}</p>
                  </div>
                </div>
              </div>

              {/* Review remarks & actions */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Review Remarks / Audit Notes</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter audit logs..." 
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleProductReview(selectedProduct.id, 'approve')}>
                    Approve Product
                  </button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleProductReview(selectedProduct.id, 'reject')}>
                    Reject Listing
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
