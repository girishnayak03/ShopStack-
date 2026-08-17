import React, { useState, useEffect, useCallback} from 'react';
import { Sun, Moon } from 'lucide-react';
import { api, tokenStorage } from './api';
import AuthPortal from './components/AuthPortal';
import CustomerPortal from './components/CustomerPortal';
import OrderList from './components/OrderList';
import VendorPortal from './components/VendorPortal';
import AdminPortal from './components/AdminPortal';
import LandingPage from './pages/customer/LandingPage';
import WishlistPage from './pages/customer/WishlistPage';
import { PRODUCTS_DATA } from './data/products';
import ProductImage from './components/ProductImage';
import CheckoutPortal from './components/CheckoutPortal';
import InventoryManagementPage from './components/InventoryManagementPage';
import ReturnRefundPage from './components/ReturnRefundPage';
import WarehousePortal from './components/WarehousePortal';


export default function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [products, setProducts] = useState([]);
  // FIX 1: default view for unauthenticated users is 'landing'
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'shop', 'auth', 'vendor', 'admin'
  const [toasts, setToasts] = useState([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [appLoading, setAppLoading] = useState(true);

  // FIX 3: Theme state — read from localStorage, default 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('shopstack_theme') || 'dark';
  });

  // FIX 3: Apply data-theme attribute whenever theme changes
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('shopstack_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const getDefaultViewForRole = (role) => {
  if (role === 'ADMIN') return 'admin';
  if (role === 'VENDOR') return 'vendor';
  if (role === 'WAREHOUSE_STAFF') return 'warehouse';
  return 'shop';
};

  // Load user session on startup
  useEffect(() => {
    const initSession = async () => {
      const token = tokenStorage.getToken();
      if (token) {
        try {
          const fetchedUser = await api.auth.me();
          setUser(fetchedUser);
          // Send user to appropriate view by default
          setCurrentView(getDefaultViewForRole(fetchedUser.role));
        } catch (err) {
          console.error('Session restoration failed', err);
          tokenStorage.clearToken();
          setUser(null);
          // Unauthenticated: stay on landing
          setCurrentView('landing');
        }
      } else {
        // No token: unauthenticated users see landing page
        setCurrentView('landing');
      }
      setAppLoading(false);
    };
    initSession();

    // Load cart from localStorage
    const savedCart = sessionStorage.getItem('shopstack_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse saved cart', e);
      }
    }

    // Load wishlist from localStorage
    const savedWishlist = sessionStorage.getItem('shopstack_wishlist');
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist));
      } catch (e) {
        console.error('Failed to parse saved wishlist', e);
      }
    }
  }, []);

  // ✅ NEW: Load wishlist from backend whenever user changes
  useEffect(() => {
    if (user) {
      loadWishlistFromBackend();
    } else {
      setWishlist([]);
    }
  }, [user]);

  const loadWishlistFromBackend = async () => {
    try {
      const response = await api.wishlist.getWishlist(user.id);
      const wishlistItems = response.data?.items || response.items || [];
      // Extract just the product IDs
      const productIds = wishlistItems.map(item => item.product?.id || item.productId).filter(Boolean);
      setWishlist(productIds);
      sessionStorage.setItem('shopstack_wishlist', JSON.stringify(productIds));
    } catch (err) {
      console.error('Failed to load wishlist from backend:', err);
    }
  };

  // FIX 2: Load products at App level with fallback to static data
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const activeProds = await api.products.browseActive();
        console.log('Products from API:', activeProds);
        if (activeProds && Array.isArray(activeProds) && activeProds.length > 0) {
          console.log('Using API products:', activeProds.length);
          setProducts(activeProds.map((product) => ({ 
            ...product, 
            id: product.id,
            name: String(product.productName || product.name || ''), 
            category: String(product.categoryName || product.category || ''),
            vendor: String(product.vendorName || product.vendorId || product.vendor || 'ShopStack Vendor'),
            image: String(product.imageUrl || product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format')
          })));
        } else {
          console.log('API returned empty/invalid, using static PRODUCTS_DATA:', PRODUCTS_DATA.length);
          setProducts(PRODUCTS_DATA);
        }
      } catch (err) {
        // API unavailable — fall back to static catalog
        console.warn('API call failed, using static PRODUCTS_DATA:', PRODUCTS_DATA.length, err.message);
        setProducts(PRODUCTS_DATA);
      }
    };
    loadProducts();
  }, []);

  // Save cart to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('shopstack_cart', JSON.stringify(cart));
  }, [cart]);

  // Save wishlist to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('shopstack_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Toast notifications helper
  const addToast = useCallback((message, type = 'info') => {
  const id = Date.now();

  setToasts((prev) => [...prev, { id, message, type }]);

  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, 4000);
}, []);

  const handleSignOut = () => {
    tokenStorage.clearToken();
    setUser(null);
    setCart([]);
    setCurrentView('landing');
    addToast('Signed out successfully!', 'info');
  };

  const handleAuthSuccess = (loggedInUser) => {
      setUser(loggedInUser);
      setCurrentView(getDefaultViewForRole(loggedInUser.role));
  };

  const handleCheckout = () => {
    if (!user) {
      addToast('Please sign in to checkout', 'warning');
      setCurrentView('auth');
      setShowCartDrawer(false);
      return;
    }
    setShowCartDrawer(false);
    setCurrentView('checkout');
  };

  const updateCartQty = (id, newQty) => {
    if (newQty <= 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      setCart(cart.map(item => item.id === id ? { ...item, quantity: newQty } : item));
    }
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  };

  // FIX 1: LandingPage uses nested cart shape { product, quantity }
  // Convert flat cart -> nested for LandingPage
  const landingCart = cart.map(item => ({
    product: { id: item.id, name: item.name || item.productName, price: item.price, image: item.image, vendor: item.vendor, description: item.description, rating: item.rating, reviews: item.reviews, category: item.category },
    quantity: item.quantity,
  }));

  // Convert nested cart from LandingPage -> flat shape for App state
  const handleLandingCartSave = (nestedCart) => {
    const flatCart = nestedCart.map(item => ({
      ...item.product,
      quantity: item.quantity,
    }));
    setCart(flatCart);
  };

  // FIX 1: Handle LandingPage's onNavigate calls
 const handleLandingNavigate = (destination) => {
    if (destination === 'login' || destination === 'register' || destination === 'auth') {
      setCurrentView('auth');
    } else if (destination === 'customer-dashboard' || destination === 'shop') {
      setCurrentView('shop');
      // ✅ Reload wishlist from backend when going to shop
      if (user) {
        loadWishlistFromBackend();
      }
    } else if (destination === 'vendor-dashboard') {
      setCurrentView('vendor');
    } else if (destination === 'wishlist') {
      setCurrentView('wishlist');
    } else if (destination === 'landing') {
      setCurrentView('landing');
      // ✅ Reload wishlist from backend when going home
      if (user) {
        loadWishlistFromBackend();
      }
    }
  };

  // Checkout from LandingPage (nested cart)
 // Checkout from LandingPage (nested cart)
  const handleLandingCheckout = (nestedCart) => {
    if (!user) {
      addToast('Please sign in to checkout', 'warning');
      setCurrentView('auth');
      return;
    }
    const flatCart = nestedCart.map(item => ({
      ...item.product,
      quantity: item.quantity,
    }));
    setCart(flatCart);
    setCurrentView('checkout');
  };

  if (appLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Render LandingPage for unauthenticated users OR as the home view
  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onNavigate={handleLandingNavigate}
          user={user}
          onLogout={handleSignOut}
          appTheme={theme}
          onToggleAppTheme={toggleTheme}
          cart={landingCart}
          onSaveCart={handleLandingCartSave}
          wishlist={wishlist}
          onSaveWishlist={setWishlist}
          products={products}
          onUpdateProducts={setProducts}
          onCheckout={handleLandingCheckout}
          notifications={[]}
        />
        {/* TOAST SYSTEM ALERTS */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <span>
                {toast.type === 'success' && '✅'}
                {toast.type === 'error' && '❌'}
                {toast.type === 'warning' && '⚠️'}
                {toast.type === 'info' && 'ℹ️'}
              </span>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div>
      {/* Dynamic Navigation Header */}
      { currentView != 'wishlist' && (
      <header className="app-header">
        <div className="logo-container" onClick={() => setCurrentView(user ? getDefaultViewForRole(user.role) : 'landing')}>
          <span className="logo-icon">🛍️</span>
          <span className="logo-text">ShopStack</span>
        </div>

        <nav className="nav-links">

          {user && user.role === 'CUSTOMER' && (
          <button
            className={`nav-link ${currentView === 'landing' ? 'active' : ''}`}
            onClick={() => setCurrentView('landing')}
            style={{ background: 'transparent', border: 'none', font: 'inherit' }}
          >
            Shop
          </button>
          )}

          {user && user.role === 'VENDOR' && (
            <button
              className={`nav-link ${currentView === 'vendor' ? 'active' : ''}`}
              onClick={() => setCurrentView('vendor')}
              style={{ background: 'transparent', border: 'none', font: 'inherit' }}
            >
              Merchant Panel
            </button>
          )}

          {user && user.role === 'WAREHOUSE_STAFF' && (
            <button
              className={`nav-link ${currentView === 'warehouse' ? 'active' : ''}`}
              onClick={() => setCurrentView('warehouse')}
              style={{ background: 'transparent', border: 'none', font: 'inherit' }}
            >
              Warehouse Workflow
            </button>
          )}  
          {user && user.role === 'VENDOR' && (
            <button
              className={`nav-link ${currentView === 'inventory' ? 'active' : ''}`}
              onClick={() => setCurrentView('inventory')}
              style={{ background: 'transparent', border: 'none', font: 'inherit' }}
            >
              Inventory
            </button>
          )}
          {/* Customer Orders */}
          {user && user.role === 'CUSTOMER' && (
            <button
              className={`nav-link ${currentView === 'orders' ? 'active' : ''}`}
              onClick={() => setCurrentView('orders')}
              style={{ background: 'transparent', border: 'none', font: 'inherit' }}
            >
              My Orders
            </button>
          )}
           {/* Customer Returns & Refunds */}
          {user && user.role === 'CUSTOMER' && (
            <button
              className={`nav-link ${currentView === 'returns' ? 'active' : ''}`}
              onClick={() => setCurrentView('returns')}
              style={{ background: 'transparent', border: 'none', font: 'inherit' }}
            >
              Returns
            </button>
          )}
          {/* Vendor Orders */}
          {user && user.role === 'VENDOR' && (
            <button
              className={`nav-link ${currentView === 'vendorOrders' ? 'active' : ''}`}
              onClick={() => setCurrentView('vendorOrders')}
              style={{ background: 'transparent', border: 'none', font: 'inherit' }}
            >
              Vendor Orders
            </button>
          )}

          {user && user.role === 'ADMIN' && (
            <button
              className={`nav-link ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin')}
              style={{ background: 'transparent', border: 'none', font: 'inherit' }}
            >
              Admin Dashboard
            </button>
          )}
        </nav>

        <div className="nav-actions">
          {/* FIX 3: Theme toggle button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Cart Trigger */}
          {user && user.role === 'CUSTOMER' && (
          <button
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', position: 'relative' }}
            onClick={() => setShowCartDrawer(true)}
          >
            🛒 Cart ({cart.reduce((a, b) => a + b.quantity, 0)})
          </button>
          )}
          
          {/* User Signin / Info */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  {user.role}
                </div>
              </div>
              <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }} onClick={() => setCurrentView('auth')}>
              Sign In
            </button>
          )}
        </div>
      </header>
  )}
      

      <main style={{ 
        minHeight: currentView === 'wishlist' ? '100vh' : 'calc(100vh - 72px)', 
        background: 'var(--bg-main)' 
      }}>
        {currentView === 'shop' && (
          <div className="main-content">
            <CustomerPortal user={user} cart={cart} setCart={setCart} addToast={addToast} fallbackProducts={products} wishlist={wishlist} setWishlist={setWishlist} />
          </div>
        )}
       

        {currentView === 'auth' && (
          <AuthPortal onAuthSuccess={handleAuthSuccess} addToast={addToast} theme={theme} />
        )}

        {currentView === 'vendor' && user && user.role === 'VENDOR' && (
          <div className="main-content">
            <VendorPortal user={user} addToast={addToast} onProductsChange={setProducts} />
          </div>
        )}

        {currentView === 'warehouse' && user && user.role === 'WAREHOUSE_STAFF' && (
          <div className="main-content">
            <WarehousePortal user={user} addToast={addToast} />
          </div>
        )}

        {currentView === 'admin' && user && user.role === 'ADMIN' && (
          <AdminPortal user={user} addToast={addToast} />
        )}

        {currentView === 'checkout' && (
          <div className="main-content">
            <CheckoutPortal user={user} cart={cart} setCart={setCart} addToast={addToast} onComplete={() => setCurrentView('shop')} />
          </div>
        )}

        {currentView === 'inventory' && user && user.role === 'VENDOR' && (
          <div className="main-content">
            <InventoryManagementPage addToast={addToast} />
          </div>
        )}

        {currentView === 'orders' && user && user.role === 'CUSTOMER' && (
          <div className="main-content">
            <OrderList isVendor={false} addToast={addToast} user={user} />
          </div>
        )}

        {currentView === 'returns' && user && user.role === 'CUSTOMER' && (
          <ReturnRefundPage
            user={user}
            addToast={addToast}
            onBack={() => setCurrentView('orders')}
          />
        )}

        {currentView === 'vendorOrders' && user && user.role === 'VENDOR' && (
          <div className="main-content">
            <OrderList isVendor={true} addToast={addToast} user={user} />
          </div>
        )}

         {currentView === 'wishlist' && user && (
  <WishlistPage
    onNavigate={handleLandingNavigate}
    user={user}
    onLogout={handleSignOut}
    theme={theme}
    onToggleTheme={toggleTheme}
    cart={landingCart}
    onSaveCart={handleLandingCartSave}
    wishlist={wishlist}
    onSaveWishlist={setWishlist}
    products={products}
    notifications={[]}
    onCheckout={handleLandingCheckout}
  />
)}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-main)' }}>
        <p>© 2026 ShopStack Enterprise Multi-Vendor Platform. Built with high fidelity design.</p>
      </footer>

      {/* SHOPPING CART DRAWER MODAL */}
      {showCartDrawer && (
        <div className="modal-overlay" onClick={() => setShowCartDrawer(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, height: '100vh', width: '380px', borderRadius: 0, maxWidth: '100%', textAlign: 'left', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <button className="modal-close" onClick={() => setShowCartDrawer(false)}>×</button>

            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '1.5rem' }}>Shopping Bag</h3>

            {cart.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</span>
                <p>Your shopping bag is empty.</p>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingRight: '0.5rem' }}>
                  {cart.map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                      <ProductImage src={item.image} alt={item.productName || item.name} className="drawer-item-img" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.productName || item.name}</h4>
                        <span style={{ color: 'var(--secondary)', fontWeight: 700, fontSize: '0.9rem' }}>₹{item.price}</span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                            onClick={() => updateCartQty(item.id, item.quantity - 1)}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '0.9rem', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                            onClick={() => updateCartQty(item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700 }}>
                    <span>Estimated Total:</span>
                    <span style={{ color: 'var(--secondary)' }}>₹{calculateTotal()}</span>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCheckout}>
                    Process Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TOAST SYSTEM ALERTS */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'info' && 'ℹ️'}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
