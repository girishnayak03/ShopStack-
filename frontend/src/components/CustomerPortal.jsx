import React, { useState, useEffect } from 'react';
import { api } from '../api';
import AvailableCoupons from './AvailableCoupons';

export default function CustomerPortal({ user, cart, setCart, addToast , fallbackProducts}) {
  const [activeTab, setActiveTab] = useState('shop'); // 'shop' or 'profile'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [loading, setLoading] = useState(false);

  // Profile states
  const [customerProfile, setCustomerProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  // Product detail modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

 useEffect(() => {
  if (Array.isArray(fallbackProducts)) {
    setProducts(fallbackProducts);
  }

  if (user && user.role === 'CUSTOMER') {
    loadProfileData();
  }
}, [user, fallbackProducts]);

  const loadShopData = async () => {
  setLoading(true);

  try {
    const allCats = await api.categories.listAll();
    setCategories(allCats || []);
  } catch (err) {
    addToast('Failed to load categories', 'error');
  } finally {
    setLoading(false);
  }
};

  const loadProfileData = async () => {
    try {
      const profileResponse = await api.customer.getProfile();
      // Notice: CustomerController response might wrap in ApiResponse { data: CustomerResponse }
      const profile = profileResponse.data || profileResponse;
      setCustomerProfile(profile);

      if (profile && profile.id) {
        const addressResponse = await api.customer.getAddresses(profile.id);
        setAddresses(addressResponse.data || addressResponse || []);
      }
    } catch (err) {
      console.error('Could not load customer profile', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!searchKeyword.trim()) {
        const activeProds = await api.products.browseActive();
        setProducts(activeProds || []);
      } else {
        const searchResults = await api.products.search(searchKeyword);
        setProducts(searchResults || []);
      }
    } catch (err) {
      addToast('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (catId) => {
    setLoading(true);
    try {
      if (selectedCategory === catId) {
        setSelectedCategory(null);
        const activeProds = await api.products.browseActive();
        setProducts(activeProds || []);
      } else {
        setSelectedCategory(catId);
        const filtered = await api.products.getByCategory(catId);
        setProducts(filtered || []);
      }
    } catch (err) {
      addToast('Failed to load category products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!customerProfile) return;
    try {
      const newAddress = {
        addressLine1,
        addressLine2,
        city,
        state: stateName,
        postalCode,
        country,
        isDefault: addresses.length === 0
      };
      await api.customer.addAddress(customerProfile.id, newAddress);
      addToast('Address added successfully!', 'success');
      setShowAddressForm(false);
      // Reset fields
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setStateName('');
      setPostalCode('');
      setCountry('');
      // Reload profile
      loadProfileData();
    } catch (err) {
      addToast(err.message || 'Failed to add address', 'error');
    }
  };

  const handleAddToCart = async (product, e) => {
  e.stopPropagation();

  const stock = Number(product.stockQuantity ?? product.stock ?? 0);
  const MAX_ITEMS = 10;

  // Out of stock validation
  if (stock <= 0) {
    addToast('This product is out of stock.', 'error');
    return;
  }

  const existing = cart.find(item =>
  item.product?.id === product.id || item.id === product.id
);
  const currentQuantity = existing ? Number(existing.quantity) : 0;

  // Frontend limit check
  if (currentQuantity >= MAX_ITEMS) {
    addToast('Maximum 10 items per product allowed.', 'error');
    return;
  }

  // Stock check
  if (currentQuantity >= stock) {
    addToast(
      `Only ${stock} item${stock > 1 ? 's' : ''} available in stock.`,
      'error'
    );
    return;
  }

  try {
    // ✅ ADD TO BACKEND CART
    const response = await api.cart.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 1
    });

    console.log('Marketplace cart backend response:', response);

    // ✅ Update frontend cart state
    if (existing) {
      setCart(
        cart.map(item =>
          (item.product?.id === product.id || item.id === product.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...product,
          quantity: 1
        }
      ]);
    }

    addToast(
      `${product.productName || product.name} added to cart!`,
      'success'
    );

  } catch (err) {
    console.error('Marketplace add to cart error:', err);

    // Backend validation message
    addToast(
      err.message || 'Failed to add product to cart.',
      'error'
    );
  }
};

  const viewProductDetails = async (product) => {
    setSelectedProduct(product);
    try {
      const prodReviews = await api.reviews.getByProduct(product.id);
      setReviews(prodReviews || []);
    } catch (err) {
      console.error('Failed to load reviews', err);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      addToast('Please login to add a review', 'warning');
      return;
    }
    setReviewLoading(true);
    try {
        await api.reviews.create(selectedProduct.id, {
        customerName: user?.name || user?.email || 'Anonymous',
        rating: newRating,
        review: newComment
      });
      addToast('Review submitted!', 'success');
      setNewComment('');
      setNewRating(5);
      // Reload reviews
      const prodReviews = await api.reviews.getByProduct(selectedProduct.id);
      setReviews(prodReviews || []);
    } catch (err) {
      addToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await api.reviews.delete(reviewId);
      addToast('Review deleted', 'success');
      // Reload reviews
      const prodReviews = await api.reviews.getByProduct(selectedProduct.id);
      setReviews(prodReviews || []);
    } catch (err) {
      addToast(err.message || 'Could not delete review', 'error');
    }
  };

  // Filter products by price client-side for immediate responsive experience
  const filteredProducts = products.filter(p => {
    const price = p.price || 0;
    if (priceMin && price < parseFloat(priceMin)) return false;
    if (priceMax && price > parseFloat(priceMax)) return false;
    return true;
  });

  return (
    <div>
      {/* Tab controls */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <button 
          className={`btn ${activeTab === 'shop' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('shop')}
        >
          🛍️ Browse Shop
        </button>
        {user && user.role === 'CUSTOMER' && (
          <button 
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 My Account
          </button>
        )}

         <button 
          className={`btn ${activeTab === 'offers' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('offers')}
        >
          🏷️ Offers
        </button>
      </div>


      {activeTab === 'offers' ? (
        <AvailableCoupons addToast={addToast} />
      ) : activeTab === 'shop' ? (
        /* SHOP VIEW */

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem' }}>
          {/* Filters Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'left' }}>
            {/* Search */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' }}>Search Catalog</h3>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Keywords..." 
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  style={{ padding: '0.5rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Go</button>
              </form>
            </div>

            {/* Categories */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' }}>Categories</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  onClick={() => { setSelectedCategory(null); loadShopData(); }}
                  style={{
                    background: 'transparent', border: 'none', color: !selectedCategory ? 'var(--primary)' : 'var(--text-secondary)',
                    textAlign: 'left', cursor: 'pointer', fontWeight: !selectedCategory ? 600 : 400
                  }}
                >
                  All Products
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    style={{
                      background: 'transparent', border: 'none', color: selectedCategory === cat.id ? 'var(--primary)' : 'var(--text-secondary)',
                      textAlign: 'left', cursor: 'pointer', fontWeight: selectedCategory === cat.id ? 600 : 400
                    }}
                  >
                    {cat.categoryName || cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' }}>Price Range</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Min" 
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  style={{ padding: '0.5rem' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>-</span>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Max" 
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  style={{ padding: '0.5rem' }}
                />
              </div>
            </div>
          </div>

          {/* Catalog grid */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, textAlign: 'left' }}>Marketplace Catalog</h2>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <div className="spinner"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="glass-card" style={{ padding: '4rem', color: 'var(--text-secondary)', marginTop: '1.5rem' }}>
                No active products matching your filters.
              </div>
            ) : (
              <div className="product-grid">
                {filteredProducts.map(prod => (
                  <div key={prod.id} className="glass-card product-card" onClick={() => viewProductDetails(prod)}>
                    <div className="product-image-placeholder">
                {prod.imageUrl ? (
                  <img
                    src={prod.imageUrl}
                    alt={prod.productName || prod.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}
                    onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerHTML='<span style="font-size:3rem">📦</span>'; }}
                  />
                ) : (
                  '📦'
                )}
              </div>
                   <div className="product-details">

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                            flexWrap: 'wrap'
                          }}>

                            {/* Category */}
                            <span
                              className="badge badge-active"
                              style={{
                                fontSize: '0.65rem'
                              }}
                            >
                              {prod.categoryName || 'General'}
                            </span>

                            {/* Stock Status */}
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                padding: '4px 8px',
                                borderRadius: '12px',
                                background: Number(prod.stockQuantity) > 0
                                  ? 'rgba(34, 197, 94, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                                color: Number(prod.stockQuantity) > 0
                                  ? 'var(--success)'
                                  : 'var(--danger)',
                                border: Number(prod.stockQuantity) > 0
                                  ? '1px solid rgba(34, 197, 94, 0.3)'
                                  : '1px solid rgba(239, 68, 68, 0.3)',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {Number(prod.stockQuantity) > 0
                                ? `In Stock (${prod.stockQuantity})`
                                : 'Out of Stock'}
                            </span>

                          </div>
                     
                      <h4 className="product-title">{prod.productName || prod.name}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', height: '40px', overflow: 'hidden' }}>
                        {prod.description}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <span className="product-price">₹{prod.price}</span>
                        <button
                            className="btn btn-primary"
                            style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.85rem',
                              opacity: Number(prod.stockQuantity ?? prod.stock ?? 0) <= 0 ? 0.5 : 1,
                              cursor: Number(prod.stockQuantity ?? prod.stock ?? 0) <= 0
                                ? 'not-allowed'
                                : 'pointer'
                            }}
                            onClick={(e) => handleAddToCart(prod, e)}
                            disabled={Number(prod.stockQuantity ?? prod.stock ?? 0) <= 0}
                          >
                            {Number(prod.stockQuantity ?? prod.stock ?? 0) <= 0
                              ? 'Out of Stock'
                              : '+ Add'}
                          </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CUSTOMER PROFILE VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', textAlign: 'left' }}>
          {/* Profile Overview */}
          <div className="glass-card">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.5rem' }}>Account Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Full Name:</strong>
                <p style={{ fontSize: '1.1rem', marginTop: '0.2rem' }}>{customerProfile?.fullName || user.name}</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Registered Email:</strong>
                <p style={{ fontSize: '1.1rem', marginTop: '0.2rem' }}>{customerProfile?.email || user.email}</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Contact Phone:</strong>
                <p style={{ fontSize: '1.1rem', marginTop: '0.2rem' }}>{customerProfile?.phoneNumber || user.phone || 'Not provided'}</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Profile ID:</strong>
                <p style={{ fontSize: '0.85rem', fontFamily: 'monospace', marginTop: '0.2rem', wordBreak: 'break-all' }}>
                  {customerProfile?.id}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Addresses */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Saved Addresses</h3>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setShowAddressForm(!showAddressForm)}>
                {showAddressForm ? 'Cancel' : '+ Add Address'}
              </button>
            </div>

            {showAddressForm && (
              <form onSubmit={handleAddAddress} style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Address Line 1</label>
                  <input type="text" className="form-input" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Address Line 2 (Optional)</label>
                  <input type="text" className="form-input" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input type="text" className="form-input" value={city} onChange={(e) => setCity(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input type="text" className="form-input" value={stateName} onChange={(e) => setStateName(e.target.value)} required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Postal Code</label>
                    <input type="text" className="form-input" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input type="text" className="form-input" value={country} onChange={(e) => setCountry(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '1rem' }}>
                  Save Address
                </button>
              </form>
            )}

            {addresses.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No saved addresses. Add one above.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {addresses.map((addr) => (
                  <div key={addr.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', position: 'relative' }}>
                    {addr.isDefault && (
                      <span className="badge badge-active" style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.6rem' }}>
                        Default
                      </span>
                    )}
                    <p style={{ fontWeight: 600 }}>{addr.addressLine1}</p>
                    {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                    <p>{addr.city}, {addr.state} - {addr.postalCode}</p>
                    <p>{addr.country}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRODUCT DETAILS MODAL */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'left' }}>
            <button className="modal-close" onClick={() => setSelectedProduct(null)}>×</button>
            
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '0.5rem' }}>{selectedProduct.productName || selectedProduct.name}</h2>
            <span className="badge badge-active" style={{ marginBottom: '1.5rem' }}>{selectedProduct.categoryName || 'General'}</span>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div>
               <div
  style={{
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
    height: '220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: '1rem'
  }}
>
  {selectedProduct.imageUrl ? (
    <img
      src={selectedProduct.imageUrl}
      alt={selectedProduct.productName || selectedProduct.name}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        borderRadius: '8px'
      }}
      onError={(e) => {
        e.target.style.display = 'none';
      }}
    />
  ) : (
    <span style={{ fontSize: '4rem' }}>📦</span>
  )}
</div>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Description</h4>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{selectedProduct.description}</p>
              </div>

              <div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>PRICE</span>
                    <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--secondary)' }}>₹{selectedProduct.price}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>BRAND</span>
                    <p style={{ fontWeight: 600 }}>{selectedProduct.brand || 'Unbranded'}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>STOCK STATUS</span>
                    <p style={{ color: selectedProduct.stockQuantity > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      {selectedProduct.stockQuantity > 0 ? `${selectedProduct.stockQuantity} In Stock` : 'Out of Stock'}
                    </p>
                  </div>
                  <button 
                      className="btn btn-primary" 
                      style={{
                        width: '100%',
                        marginTop: '0.5rem',
                        opacity: Number(selectedProduct.stockQuantity ?? selectedProduct.stock ?? 0) <= 0 ? 0.5 : 1,
                        cursor: Number(selectedProduct.stockQuantity ?? selectedProduct.stock ?? 0) <= 0
                          ? 'not-allowed'
                          : 'pointer'
                      }}
                      onClick={(e) => handleAddToCart(selectedProduct, e)}
                      disabled={Number(selectedProduct.stockQuantity ?? selectedProduct.stock ?? 0) <= 0}
                    >
                      {Number(selectedProduct.stockQuantity ?? selectedProduct.stock ?? 0) <= 0
                        ? 'Out of Stock'
                        : 'Add To Cart'}
                    </button>
                </div>
              </div>
            </div>

            {/* REVIEWS SECTION */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1rem' }}>Customer Reviews</h3>

              {/* Review submit form */}
              {user ? (
                <form onSubmit={submitReview} style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Add your review</h4>
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label className="form-label">Rating</label>
                      <select 
                        className="form-input" 
                        value={newRating} 
                        onChange={(e) => setNewRating(parseInt(e.target.value))}
                        style={{ padding: '0.4rem', width: '80px' }}
                      >
                        {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label className="form-label">Comment</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Tell us what you think..." 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        style={{ padding: '0.4rem' }}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} disabled={reviewLoading}>
                    {reviewLoading ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Please log in to review this product.</p>
              )}

              {/* Reviews list */}
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No reviews yet for this product. Be the first!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reviews.map(rev => (
                    <div key={rev.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 600 }}>
                            {rev.customerName || 'Anonymous'}
                          </span>
                          <span className="rating-stars">
                            {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                          </span>
                        </div>
                        {user && user.email === rev.customerName && (
                          <button 
                            onClick={() => handleDeleteReview(rev.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{rev.review}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
