import React, { useState, useEffect } from 'react';
import { api } from '../api';
import AvailabilityBadge from './AvailabilityBadge';
import OrderList from './OrderList';
import CouponManagementPage from './CouponManagementPage';
import VendorEarningsAnalytics from './VendorEarningsAnalytics';

export default function VendorPortal({ user, addToast }) {
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Returns states
  const [vendorReturns, setVendorReturns] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'products', 'profile'

  // Onboarding Form States
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [businessType, setBusinessType] = useState('PROPRIETORSHIP');
  const [description, setDescription] = useState('');
  
  // Onboarding Address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Onboarding Bank Details
  const [accName, setAccName] = useState('');
  const [accNum, setAccNum] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifsc, setIfsc] = useState('');

  // Catalog States
  const [myProducts, setMyProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
const [discountDrafts, setDiscountDrafts] = useState({});
  // Stock quick-edit drafts: { [productId]: draftQty }
  const [stockDrafts, setStockDrafts] = useState({});

  // Product Form Fields
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodActive, setProdActive] = useState(true);
  const [prodFeatures, setProdFeatures] = useState('');
  const [prodImage, setProdImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // Profile Documents State
  const [docType, setDocType] = useState('GST_CERTIFICATE');
  const [docUrl, setDocUrl] = useState('');
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    loadVendorProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'returns') {
      loadReturns();
    }
  }, [activeTab]);

  const loadReturns = async () => {
    setReturnsLoading(true);
    try {
      const res = await api.orders.adminGetReturns();
      setVendorReturns(res.data || res || []);
    } catch (err) {
      addToast(err.message || 'Failed to fetch return requests', 'error');
    } finally {
      setReturnsLoading(false);
    }
  };

  const handleUpdateReturnStatus = async (returnId, nextStatus, successMsg) => {
    try {
      await api.orders.adminUpdateReturnStatus(returnId, nextStatus);
      addToast(successMsg, 'success');
      loadReturns();
    } catch (err) {
      addToast(err.message || 'Failed to update return status', 'error');
    }
  };

  const loadVendorProfile = async () => {
    setLoading(true);
    try {
      // Fetch own profile
      const response = await api.vendor.getProfile();
      setVendorProfile(response);
      
      // Load products if active or pending
      if (response && response.vendorId) {
        const prods = await api.products.getMyProducts();
        setMyProducts(prods || []);
      }
      
      // Load categories for catalog management
      const cats = await api.categories.listAll();
      setCategories(cats || []);
      if (cats && cats.length > 0) {
        setProdCategory(cats[0].id);
      }
    } catch (err) {
      console.log('No vendor profile found, user needs to onboard.', err);
      setVendorProfile(null);
    } finally {
      setLoading(false);
    }
  };

 
  const handleOnboarding = async (e) => {
    e.preventDefault();
    if (!businessName || !businessEmail || !businessPhone) {
      addToast('Please fill out the required business details', 'error');
      return;
    }

    setLoading(true);
    try {
      // Build the registration payload
      const onboardingData = {
        userId: user.id,
        businessName,
        businessEmail,
        businessPhone,
        gstNumber,
        panNumber,
        businessType,
        description,
        addresses: [
          {
            addressType: 'SHIPPING',
            addressLine1,
            addressLine2,
            city,
            state: stateName,
            country,
            postalCode,
            isDefault: true
          }
        ],
        bankDetails: [
          {
            accountHolderName: accName,
            accountNumber: accNum,
            bankName,
            ifscOrSwiftCode: ifsc
          }
        ],
        documents: []
      };

      const response = await api.vendor.register(onboardingData);
      addToast('Business profile submitted successfully! Awaiting administrator approval.', 'success');
      setVendorProfile(response);
      loadVendorProfile();
    } catch (err) {
      addToast(err.message || 'Onboarding submission failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodStock || !prodCategory) {
      addToast('Please fill in all required product fields', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('productName', prodName);
      formData.append('brand', prodBrand || '');
      formData.append('description', prodDesc || '');
      formData.append('features', prodFeatures || '');
      formData.append('price', String(parseFloat(prodPrice)));
      formData.append('stockQuantity', String(parseInt(prodStock, 10)));
      formData.append('categoryId', prodCategory);
      formData.append('featured', String(Boolean(prodFeatured)));
      formData.append('active', String(Boolean(prodActive)));

      if (prodImage) {
        formData.append('image', prodImage, prodImage.name || 'product-image');
      }

      let savedProduct;
      if (editingProduct) {
        savedProduct = await api.products.update(editingProduct.id, formData);
        addToast('Product updated successfully!', 'success');
      } else {
        savedProduct = await api.products.create(formData);
        addToast('Product submitted for approval!', 'success');
      }

      const nextProduct = savedProduct || {};
      const normalized = {
        ...nextProduct,
        id: nextProduct.id || editingProduct?.id,
        imageUrl: nextProduct.imageUrl || nextProduct.image || imagePreview || editingProduct?.imageUrl || '',
        productName: nextProduct.productName || prodName,
        brand: nextProduct.brand || prodBrand,
        description: nextProduct.description || prodDesc,
        price: nextProduct.price ?? parseFloat(prodPrice),
        stockQuantity: nextProduct.stockQuantity ?? parseInt(prodStock, 10),
        categoryId: nextProduct.categoryId || prodCategory,
        featured: nextProduct.featured ?? prodFeatured,
        active: nextProduct.active ?? prodActive,
      };

      setMyProducts(prev => {
        if (editingProduct) {
          return prev.map(item => item.id === normalized.id ? { ...item, ...normalized } : item);
        }
        return [normalized, ...prev];
      });

      setShowProductForm(false);
      setEditingProduct(null);
      resetProductForm();
    } catch (err) {
      addToast(err.message || 'Failed to submit product', 'error');
    }
  };

  const resetProductForm = () => {
    setProdName('');
    setProdBrand('');
    setProdDesc('');
    setProdPrice('');
    setProdStock('');
    setProdFeatured(false);
    setProdActive(true);
    setProdFeatures('');
    setProdImage(null);
    setImagePreview('');
    if (categories && categories.length > 0) {
      setProdCategory(categories[0].id);
    }
  };

  const startEditProduct = (prod) => {
    setEditingProduct(prod);
    setProdName(prod.productName || '');
    setProdBrand(prod.brand || '');
    setProdDesc(prod.description || '');
    setProdPrice(prod.price || '');
    setProdStock(prod.stockQuantity || '');
    setProdCategory(prod.categoryId || '');
    setProdFeatured(prod.featured || false);
    setProdActive(prod.active || false);
    setImagePreview(prod.imageUrl || '');
    setProdImage(null);
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product listing?')) return;
    try {
      await api.products.delete(id);
      addToast('Product listing deleted.', 'success');
      setMyProducts(myProducts.filter(p => p.id !== id));
    } catch (err) {
      addToast(err.message || 'Failed to delete product', 'error');
    }
  };

  // --- Stock quick-edit handlers ---
  const handleStockChange = (prod, delta) => {
    const current = stockDrafts[prod.id] ?? prod.stockQuantity;
    const next = Math.max(0, current + delta);
    setStockDrafts({ ...stockDrafts, [prod.id]: next });
  };

  const handleStockInput = (prod, value) => {
    const next = Math.max(0, parseInt(value) || 0);
    setStockDrafts({ ...stockDrafts, [prod.id]: next });
  };
  const handleDiscountSave = async (prod) => {
  let discount = discountDrafts[prod.id];

  // ✅ VALIDATION
  discount = Math.max(0, Math.min(100, discount));

  try {
    await api.products.update(prod.id, {
      productName: prod.productName,
      brand: prod.brand,
      description: prod.description,
      price: prod.price,
      stockQuantity: prod.stockQuantity,
      categoryId: prod.categoryId,
      featured: prod.featured,
      imageUrl: prod.imageUrl || '',
      active: prod.active,
      discountPercentage: discount
    });

    addToast("Discount updated!", "success");

    setMyProducts(prev => prev.map(p => p.id === prod.id ? { ...p, discountPercentage: discount } : p));

    const { [prod.id]: _, ...rest } = discountDrafts;
    setDiscountDrafts(rest);

    await loadVendorProfile();

  } catch (err) {
    addToast(err.message || "Failed", "error");
  }
};
  const handleStockSave = async (prod) => {
  const newQty = stockDrafts[prod.id];

  try {
    await api.products.update(prod.id, {
      productName: prod.productName,
      brand: prod.brand,
      description: prod.description,
      price: prod.price,
      stockQuantity: newQty,
      categoryId: prod.categoryId,
      featured: prod.featured,
      imageUrl: prod.imageUrl || '',
      active: prod.active
    });

    addToast('Stock updated!', 'success');

    const { [prod.id]: _discard, ...rest } = stockDrafts;
    setStockDrafts(rest);

    
    await loadVendorProfile();

  } catch (err) {
    addToast(err.message || 'Failed to update stock', 'error');
  }
};
  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    if (!docUrl) {
      addToast('Please enter a document URL', 'error');
      return;
    }
    setDocLoading(true);
    try {
      await api.vendor.uploadDocument(vendorProfile.vendorId, {
        vendorId: vendorProfile.vendorId,
        documentType: docType,
        documentUrl: docUrl
      });
      addToast('Document uploaded successfully!', 'success');
      setDocUrl('');
      loadVendorProfile();
    } catch (err) {
      addToast(err.message || 'Failed to upload document', 'error');
    } finally {
      setDocLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '6rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // --- RENDERING ONBOARDING FORM ---
  if (!vendorProfile) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', padding: '2rem' }}>
        <div className="glass-card">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '0.5rem' }}>Complete Seller Registration</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Set up your business credentials to start publishing and selling products on the ShopStack marketplace.
          </p>

          <form onSubmit={handleOnboarding}>
            {/* Section 1: Business Profile */}
            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              1. Business Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Legal Business Name *</label>
                <input type="text" className="form-input" placeholder="Acme Retailers Ltd" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Business Email Address *</label>
                <input type="email" className="form-input" placeholder="sales@acme.com" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Business Phone *</label>
                <input type="tel" className="form-input" placeholder="9199999999" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">GSTIN Number</label>
                <input type="text" className="form-input" placeholder="22AAAAA0000A1Z5" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">PAN Number</label>
                <input type="text" className="form-input" placeholder="ABCDE1234F" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Business Structure Type</label>
              <select className="form-input" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                <option value="PROPRIETORSHIP">Proprietorship</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="PRIVATE_LIMITED">Private Limited</option>
                <option value="LLP">LLP</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Business Description</label>
              <textarea className="form-input" placeholder="Describe your store and products..." value={description} onChange={(e) => setDescription(e.target.value)} rows="3"></textarea>
            </div>

            {/* Section 2: Business Address */}
            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary)', marginTop: '2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              2. Warehouse / Business Address
            </h3>
            <div className="form-group">
              <label className="form-label">Address Line 1 *</label>
              <input type="text" className="form-input" placeholder="Building, Street name" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Address Line 2 (Optional)</label>
              <input type="text" className="form-input" placeholder="Area, Landmark" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">City *</label>
                <input type="text" className="form-input" placeholder="Mumbai" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">State *</label>
                <input type="text" className="form-input" placeholder="Maharashtra" value={stateName} onChange={(e) => setStateName(e.target.value)} required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Postal Code *</label>
                <input type="text" className="form-input" placeholder="400001" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Country *</label>
                <input type="text" className="form-input" placeholder="India" value={country} onChange={(e) => setCountry(e.target.value)} required />
              </div>
            </div>

            {/* Section 3: Bank Details */}
            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary)', marginTop: '2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              3. Bank Details (For Settlements)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Account Holder Name *</label>
                <input type="text" className="form-input" placeholder="John Doe" value={accName} onChange={(e) => setAccName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number *</label>
                <input type="text" className="form-input" placeholder="999888777666" value={accNum} onChange={(e) => setAccNum(e.target.value)} required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Bank Name *</label>
                <input type="text" className="form-input" placeholder="State Bank of India" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">IFSC / SWIFT Code *</label>
                <input type="text" className="form-input" placeholder="SBIN0001234" value={ifsc} onChange={(e) => setIfsc(e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '2rem' }}>
              Submit Onboarding Application
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Helper for status badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE': return <span className="badge badge-active">Active</span>;
      case 'PENDING': return <span className="badge badge-pending">Awaiting Review</span>;
      case 'REJECTED': return <span className="badge badge-rejected">Rejected</span>;
      case 'SUSPENDED': return <span className="badge badge-suspended">Suspended</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  // --- RENDERING FULL VENDOR DASHBOARD ---
  return (
    <div className="vendor-portal-responsive" style={{ textAlign: 'left' }}>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <button className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('dashboard')}>
          📊 Overview
        </button>
        <button className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('products')}>
          📦 Manage Products
        </button>
        <button className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('analytics')}>
          📈 Earnings Analytics
        </button>
        <button className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('orders')}>
          🛒 Customer Orders
        </button>
        <button className={`btn ${activeTab === 'coupons' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('coupons')}>
          🎟️ Coupons
        </button>
        <button className={`btn ${activeTab === 'returns' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('returns')}>
          🔄 Returns & Refunds
        </button>
        <button className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('profile')}>
          💼 Business Profile
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Main overview banner */}
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800 }}>{vendorProfile.businessName}</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{vendorProfile.description || 'No business description added.'}</p>
            </div>
            <div>
              {renderStatusBadge(vendorProfile.status)}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="stats-grid">
            <div className="glass-card stat-card">
              <span className="stat-num">{myProducts.length}</span>
              <span style={{ color: 'var(--text-secondary)' }}>Total Products</span>
            </div>
            <div className="glass-card stat-card">
              <span className="stat-num">{myProducts.filter(p => p.approvalStatus === 'APPROVED').length}</span>
              <span style={{ color: 'var(--text-secondary)' }}>Approved & Live</span>
            </div>
            <div className="glass-card stat-card">
              <span className="stat-num">{myProducts.filter(p => p.approvalStatus === 'PENDING').length}</span>
              <span style={{ color: 'var(--text-secondary)' }}>Pending Review</span>
            </div>
          </div>

          {/* Warnings based on status */}
          {vendorProfile.status === 'PENDING' && (
            <div className="glass-card" style={{ borderLeft: '4px solid var(--warning)', background: 'rgba(245,158,11,0.05)' }}>
              <h4 style={{ color: 'var(--warning)', fontWeight: 600 }}>Application Under Review</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Your merchant profile is currently waiting for system administrator verification. During this time, you can create and compile product listings, but they will not be published to customers until your account is approved.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Merchant Catalog</h3>
            <button className="btn btn-primary" onClick={() => { resetProductForm(); setEditingProduct(null); setShowProductForm(true); }}>
              + Add Product
            </button>
          </div>

          {/* Add / Edit product form overlay */}
          {showProductForm && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: '600px' }}>
                <button className="modal-close" onClick={() => { setShowProductForm(false); setEditingProduct(null); }}>×</button>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.5rem' }}>
                  {editingProduct ? 'Edit Product Details' : 'Publish New Product'}
                </h3>
                
                <form onSubmit={handleProductSubmit}>
                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input type="text" className="form-input" placeholder="Wireless Earbuds X" value={prodName} onChange={(e) => setProdName(e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Product Image</label>
                    <input type="file" accept="image/*" className="form-input" onChange={(e) => setProdImage(e.target.files[0])} />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Brand Name</label>
                      <input type="text" className="form-input" placeholder="AudioTech" value={prodBrand} onChange={(e) => setProdBrand(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Category *</label>
                      <select className="form-input" value={prodCategory} onChange={(e) => setProdCategory(e.target.value)} required>
                       {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.categoryName || cat.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Price (₹) *</label>
                      <input type="number" step="0.01" className="form-input" placeholder="49.99" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Stock Quantity *</label>
                      <input type="number" className="form-input" placeholder="150" value={prodStock} onChange={(e) => setProdStock(e.target.value)} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Product Description</label>
                    <textarea className="form-input" placeholder="Write full specifications..." value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} rows="3"></textarea>
                  </div>

                  <div style={{ display: 'flex', gap: '2rem', margin: '1rem 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={prodFeatured} onChange={(e) => setProdFeatured(e.target.checked)} />
                      Mark as Featured Product
                    </label>
                    {editingProduct && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={prodActive} onChange={(e) => setProdActive(e.target.checked)} />
                        Catalog Active / Visible
                      </label>
                    )}
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                    {editingProduct ? 'Save Changes' : 'Submit Listing'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Product list */}
          {myProducts.length === 0 ? (
            <div className="glass-card" style={{ padding: '4rem', textalign: 'center', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No products found. Start by adding a new product listing.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
  <tr>
    <th>Product</th>
    <th>Category</th>
    <th>Price</th>
    <th>Discount</th> {/* ✅ NEW */}
    <th>Stock</th>
    <th>Availability</th>
    <th>Approval Status</th>
    <th>Live Status</th>
    <th>Actions</th>
  </tr>
</thead>
                <tbody>
{myProducts.map(prod => (
  <tr key={prod.id}>

    <td>
      <strong>{prod.productName}</strong>
      {prod.brand && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {prod.brand}
        </div>
      )}
    </td>

    <td>{prod.categoryName || 'General'}</td>

    {/* ✅ PRICE + DISCOUNTED PRICE */}
    <td>
      ₹{prod.price}
      {prod.discountPercentage > 0 && (
        <div style={{ fontSize: '0.8rem', color: 'green' }}>
          ₹{(prod.price * (1 - prod.discountPercentage / 100)).toFixed(2)}
        </div>
      )}
    </td>

    
   {/* ✅ DISCOUNT COLUMN */}
    <td>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <input
          type="number"
          min="0"
          max="100"
          value={discountDrafts[prod.id] ?? prod.discountPercentage ?? 0}
          onChange={(e) =>
            setDiscountDrafts({
              ...discountDrafts,
              [prod.id]: Number(e.target.value),
            })
          }
          style={{ width: '60px', textAlign: 'center' }}
        />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>%</span>
        {discountDrafts[prod.id] !== undefined &&
          discountDrafts[prod.id] !== (prod.discountPercentage ?? 0) && (
            <button
              onClick={() => handleDiscountSave(prod)}
              title="Save discount"
              style={{
                background: '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                width: '26px',
                height: '26px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ✓
            </button>
          )}
      </div>
    </td>

    {/* ✅ STOCK */}
    <td>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        
        <input
          type="number"
          value={stockDrafts[prod.id] ?? prod.stockQuantity}
          onChange={(e) => handleStockInput(prod, e.target.value)}
          style={{ width: '50px', textAlign: 'center' }}
        />

        
        {stockDrafts[prod.id] !== undefined &&
         stockDrafts[prod.id] !== prod.stockQuantity && (
          <button
            onClick={() => handleStockSave(prod)}
            style={{
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              width: '26px',
              height: '26px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✓
          </button>
        )}
      </div>
    </td>

    <td>
      <AvailabilityBadge stockQty={stockDrafts[prod.id] ?? prod.stockQuantity} />
    </td>

   <td>
  {prod.approvalStatus === 'APPROVED' && (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        color: '#22c55e',
        border: '1px solid rgba(34, 197, 94, 0.4)',
        whiteSpace: 'nowrap'
      }}
    >
      Approved
    </span>
  )}

  {prod.approvalStatus === 'PENDING' && (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        color: '#f59e0b',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        whiteSpace: 'nowrap'
      }}
    >
      Pending
    </span>
  )}

  {prod.approvalStatus === 'REJECTED' && (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#ef4444',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        whiteSpace: 'nowrap'
      }}
    >
      {prod.rejectionReason || 'Rejected'}
    </span>
  )}
</td>

    <td>
      {prod.active ? (
        <span style={{ color: 'green' }}>Active</span>
      ) : (
        <span>Disabled</span>
      )}
    </td>

    <td>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => startEditProduct(prod)}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.3rem 0.75rem',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Edit
        </button>
        <button
          onClick={() => handleDeleteProduct(prod.id)}
          style={{
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.3rem 0.75rem',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Delete
        </button>
      </div>
    </td>

  </tr>
))}
</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
          {/* Profile details */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Merchant Credentials</h3>
            
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>BUSINESS NAME</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{vendorProfile.businessName}</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>EMAIL</span>
                <p>{vendorProfile.businessEmail}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>PHONE</span>
                <p>{vendorProfile.businessPhone}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>GSTIN</span>
                <p>{vendorProfile.gstNumber || 'Not Configured'}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>PAN NUMBER</span>
                <p>{vendorProfile.panNumber || 'Not Configured'}</p>
              </div>
            </div>

            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>SETTLEMENT BANK DETAILS</span>
              {vendorProfile.bankDetails && vendorProfile.bankDetails.length > 0 ? (
                vendorProfile.bankDetails.map((bank, index) => (
                  <div key={index} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', marginTop: '0.4rem' }}>
                    <p style={{ fontWeight: 600 }}>{bank.bankName}</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>A/C: {bank.accountNumber}</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Holder: {bank.accountHolderName} | IFSC: {bank.ifscOrSwiftCode}</p>
                  </div>
                ))
              ) : (
                <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>No bank accounts registered.</p>
              )}
            </div>
          </div>

          {/* Compliance & Verification Documents */}
          <div className="glass-card">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1rem' }}>Business Verification</h3>
            
            {/* Upload document form */}
            <form onSubmit={handleDocumentSubmit} style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Upload / Link Document</h4>
              
              <div className="form-group">
                <label className="form-label">Document Type</label>
                <select className="form-input" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  <option value="GST_CERTIFICATE">GST Certificate</option>
                  <option value="PAN_CARD">PAN Card</option>
                  <option value="SHOP_LICENSE">Shop License</option>
                  <option value="Id_PPOOF">Identity Proof (Aadhaar/DL)</option>
                  <option value="OTHER">Other Proof</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Document Link (URL) *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="https://drive.google.com/... or cloud link" 
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  required 
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem' }} disabled={docLoading}>
                {docLoading ? 'Uploading...' : 'Link Document'}
              </button>
            </form>

            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Uploaded Proofs</h4>
            {vendorProfile.documents && vendorProfile.documents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {vendorProfile.documents.map((doc, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {doc.documentType.replace('_', ' ')}
                      </span>
                      <a href={doc.documentUrl} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--secondary)', textDecoration: 'none', marginTop: '0.2rem' }}>
                        View Document URL ↗
                      </a>
                    </div>
                    <span className="badge badge-active" style={{ fontSize: '0.6rem' }}>Verified</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No verification documents uploaded yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <VendorEarningsAnalytics vendorId={vendorProfile?.vendorId} />
        </div>
      )}

      {activeTab === 'orders' && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.5rem' }}>Customer Orders Management</h3>
          <OrderList isVendor={true} addToast={addToast} />
        </div>
      )}

      {activeTab === 'coupons' && (
        <div>
          <CouponManagementPage addToast={addToast} />
        </div>
      )}

      {activeTab === 'returns' && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.5rem' }}>Returns &amp; Refunds Management</h3>
          
          {returnsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Return Request ID</th>
                    <th>Reason</th>
                    <th>Refund Type</th>
                    <th>Notes</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorReturns.map(ret => (
                    <tr key={ret.id}>
                      <td><strong>{ret.id.substring(0, 8)}...</strong></td>
                      <td>{ret.reason}</td>
                      <td>{ret.refundType}</td>
                      <td>{ret.notes || 'No remarks'}</td>
                      <td>
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '5px 10px',
      borderRadius: '999px',
      fontSize: '0.72rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      background:
        ret.status === 'REFUND_COMPLETED'
          ? 'rgba(16, 185, 129, 0.15)'
          : ret.status === 'REFUND_INITIATED'
          ? 'rgba(168, 85, 247, 0.15)'
          : ret.status === 'RETURN_REQUESTED'
          ? 'rgba(245, 158, 11, 0.15)'
          : ret.status === 'RETURN_APPROVED'
          ? 'rgba(59, 130, 246, 0.15)'
          : ret.status === 'RETURN_PICKED'
          ? 'rgba(99, 102, 241, 0.15)'
          : ret.status === 'RETURN_RECEIVED'
          ? 'rgba(6, 182, 212, 0.15)'
          : 'rgba(107, 114, 128, 0.15)',
      color:
        ret.status === 'REFUND_COMPLETED'
          ? '#10b981'
          : ret.status === 'REFUND_INITIATED'
          ? '#a855f7'
          : ret.status === 'RETURN_REQUESTED'
          ? '#f59e0b'
          : ret.status === 'RETURN_APPROVED'
          ? '#3b82f6'
          : ret.status === 'RETURN_PICKED'
          ? '#6366f1'
          : ret.status === 'RETURN_RECEIVED'
          ? '#06b6d4'
          : '#9ca3af',
      border:
        ret.status === 'REFUND_COMPLETED'
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : ret.status === 'REFUND_INITIATED'
          ? '1px solid rgba(168, 85, 247, 0.4)'
          : ret.status === 'RETURN_REQUESTED'
          ? '1px solid rgba(245, 158, 11, 0.4)'
          : ret.status === 'RETURN_APPROVED'
          ? '1px solid rgba(59, 130, 246, 0.4)'
          : ret.status === 'RETURN_PICKED'
          ? '1px solid rgba(99, 102, 241, 0.4)'
          : ret.status === 'RETURN_RECEIVED'
          ? '1px solid rgba(6, 182, 212, 0.4)'
          : '1px solid rgba(107, 114, 128, 0.4)'
    }}
  >
    {String(ret.status || 'UNKNOWN').replace(/_/g, ' ')}
  </span>
</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {ret.status === 'RETURN_REQUESTED' && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#10b981', borderColor: '#10b981' }}
                              onClick={() => handleUpdateReturnStatus(ret.id, 'RETURN_APPROVED', 'Return approved. Pickup scheduled.')}
                            >
                              Approve Return
                            </button>
                          )}
                          {ret.status === 'RETURN_APPROVED' && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => handleUpdateReturnStatus(ret.id, 'RETURN_PICKED', 'Marked return package as picked up.')}
                            >
                              Mark Picked Up
                            </button>
                          )}
                          {ret.status === 'RETURN_RECEIVED' && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => handleUpdateReturnStatus(ret.id, 'REFUND_INITIATED', 'Refund payment transaction initiated.')}
                            >
                              Initiate Refund
                            </button>
                          )}
                          {ret.status === 'REFUND_INITIATED' && (
                            <button
                              className="btn btn-success"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => handleUpdateReturnStatus(ret.id, 'REFUND_COMPLETED', 'Refund completed successfully.')}
                            >
                              Complete Refund
                            </button>
                          )}
                          {['RETURN_PICKED', 'REFUND_COMPLETED'].includes(ret.status) && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No Action Required</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {vendorReturns.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No return requests found for your products.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 