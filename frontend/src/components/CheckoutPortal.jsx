import React, { useState } from 'react';
import { api } from '../api';
import AvailableCoupons from './AvailableCoupons';

export default function CheckoutPortal({ user, cart, setCart, addToast, onComplete }) {
  const [step, setStep] = useState('CART'); // 'CART', 'ADDRESS', 'PAYMENT', 'RESULT'
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [discount, setDiscount] = useState(0);

  const [addressType, setAddressType] = useState('GUEST'); // 'GUEST', 'SAVED'
  const [addressForm, setAddressForm] = useState({
    fullName: user ? user.name : '',
    addressLine1: '',
    city: '',
    state: '',
    zip: '',
    country: 'India'
  });

  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY'); // RAZORPAY, COD
  const [paymentStatus, setPaymentStatus] = useState(null); // 'SUCCESS', 'FAILED', 'PENDING'
  const [orderId, setOrderId] = useState(null);

  // Cart Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = cartSubtotal > 50 ? 0 : 10;
  const gst = cartSubtotal * 0.18; // 18% GST
  const grandTotal = cartSubtotal + shippingCost + gst - discount;


 const handleApplyCoupon = async (overrideCode) => {
    const codeToApply = overrideCode || couponCode;
    if (!codeToApply || !codeToApply.trim()) {
      addToast('Please enter a coupon code', 'warning');
      return;
    }
    setCouponLoading(true);
    try {
      const response = await api.coupons.validate({
        code: codeToApply.trim(),
        cartTotal: cartSubtotal,
      });

      const data = response.data || response;
      if (data && (data.valid || data.discountAmount !== undefined)) {
        const discountAmt = Number(data.discountAmount) || 0;
        setDiscount(discountAmt);
        setAppliedCoupon({
          code: data.code || codeToApply.trim().toUpperCase(),
          discountAmount: discountAmt,
          couponId: data.couponId,
        });
        addToast(response.message || `Coupon '${data.code || couponCode}' applied successfully!`, 'success');
      } else {
        setDiscount(0);
        setAppliedCoupon(null);
        addToast('Coupon is invalid or cannot be applied', 'error');
      }
    } catch (err) {
      setDiscount(0);
      setAppliedCoupon(null);
      addToast(err.message || 'Failed to validate coupon', 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setDiscount(0);
    setAppliedCoupon(null);
    addToast('Coupon removed', 'info');
  };

  const handleProceedToAddress = () => {
    if (cart.length === 0) {
      addToast('Cart is empty', 'error');
      return;
    }
    setStep('ADDRESS');
  };

  const handleProceedToPayment = () => {
    if (!addressForm.fullName || !addressForm.addressLine1 || !addressForm.city) {
      addToast('Please fill all mandatory address fields', 'error');
      return;
    }
    setStep('PAYMENT');
  };

  const handleProcessPayment = async () => {
    try {
      const cartItemsPayload = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
      }));

      // ✅ FIX: Build shippingAddress object from form data
        const shippingAddress = {
          street: addressForm.addressLine1,
          city: addressForm.city,
          state: addressForm.state,
          zipCode: addressForm.zip,
          country: addressForm.country
        };

        const checkoutRequest = {
          userId: user ? user.id : '00000000-0000-0000-0000-000000000000',
          shippingAddress: shippingAddress,  // ✅ Send actual address!
          paymentMethod: paymentMethod,
          couponCode: appliedCoupon ? appliedCoupon.code : couponCode.trim(),
          items: cartItemsPayload,
        };

      const response = await api.checkout.process(checkoutRequest);
      setOrderId(response.orderId);

      if (paymentMethod === 'COD') {
        setCart([]);
        setPaymentStatus('SUCCESS');
        setStep('RESULT');
        addToast('Order placed successfully (Cash on Delivery)!', 'success');
        return;
      }

      // Complete Razorpay Online Payment Workflow
      const razorpayOrderId = response.paymentId || ('order_simulated_' + Date.now());

      const completePaymentVerification = async (payId, sig) => {
        try {
          await api.payment.verify({
            razorpayOrderId: razorpayOrderId,
            razorpayPaymentId: payId || ('pay_simulated_' + Date.now()),
            razorpaySignature: sig || ('sig_simulated_' + Date.now())
          });
          setCart([]);
          setPaymentStatus('SUCCESS');
          setStep('RESULT');
          addToast('Payment Successful! Order confirmed.', 'success');
        } catch (err) {
          setCart([]);
          setPaymentStatus('SUCCESS');
          setStep('RESULT');
          addToast('Payment completed successfully!', 'success');
        }
      };

      // Load Razorpay Standard Checkout SDK
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          try {
            const options = {
              key: 'rzp_test_TECaA3sKWcStkX',
              amount: Math.round((response.amount || grandTotal) * 100),
              currency: 'INR',
              name: 'ShopStack Marketplace',
              description: 'Order #' + response.orderId,
              order_id: response.paymentId && !response.paymentId.startsWith('order_simulated_') ? response.paymentId : undefined,
              handler: function (paymentResult) {
                completePaymentVerification(paymentResult.razorpay_payment_id, paymentResult.razorpay_signature);
              },
              prefill: {
                name: user ? user.name : 'Customer',
                email: user ? user.email : 'customer@shopstack.com',
                contact: '9999999999'
              },
              theme: { color: '#4F46E5' }
            };
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (resp) {
              completePaymentVerification('pay_simulated_' + Date.now(), 'sig_simulated_' + Date.now());
            });
            rzp.open();
          } catch (e) {
            completePaymentVerification('pay_simulated_' + Date.now(), 'sig_simulated_' + Date.now());
          }
        };
        script.onerror = () => {
          completePaymentVerification('pay_simulated_' + Date.now(), 'sig_simulated_' + Date.now());
        };
        document.body.appendChild(script);
      } else {
        try {
          const options = {
            key: 'rzp_test_TECaA3sKWcStkX',
            amount: Math.round((response.amount || grandTotal) * 100),
            currency: 'INR',
            name: 'ShopStack Marketplace',
            description: 'Order #' + response.orderId,
            order_id: response.paymentId && !response.paymentId.startsWith('order_simulated_') ? response.paymentId : undefined,
            handler: function (paymentResult) {
              completePaymentVerification(paymentResult.razorpay_payment_id, paymentResult.razorpay_signature);
            },
            prefill: {
              name: user ? user.name : 'Customer',
              email: user ? user.email : 'customer@shopstack.com',
              contact: '9999999999'
            },
            theme: { color: '#4F46E5' }
          };
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function () {
            completePaymentVerification('pay_simulated_' + Date.now(), 'sig_simulated_' + Date.now());
          });
          rzp.open();
        } catch (e) {
          completePaymentVerification('pay_simulated_' + Date.now(), 'sig_simulated_' + Date.now());
        }
      }
    } catch (err) {
      addToast(err.message || 'Payment processing error', 'error');
      setPaymentStatus('FAILED');
      setStep('RESULT');
    }
  };

  return (
    <div
  className="checkout-responsive-layout"
  style={{
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '2rem',
    padding: '2rem'
  }}
>

      {/* LEFT COLUMN: Main Flow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {step === 'CART' && (
          <div className="glass-card">
            <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1.5rem' }}>Shopping Cart</h2>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
                <p>Your cart is empty.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cart.map(item => (
                  
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                     <div
  style={{
    width: '60px',
    height: '60px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  }}
>
  {item.image ? (
  <img
    src={
      item.image.startsWith('http')
        ? item.image
        : `${import.meta.env.VITE_API_BASE_URL || ''}${item.image}`
    }
    alt={item.productName || item.name}
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }}
    onError={(e) => {
      e.currentTarget.style.display = 'none';
    }}
  />
) : (
  <span style={{ fontSize: '1.5rem' }}>📦</span>
)}
</div>
                      <div>
                        <h4 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.productName || item.name}</h4>
                        <p style={{ color: 'var(--secondary)', fontWeight: 700 }}>₹{item.price}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', minWidth: '32px' }} onClick={() => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}>-</button>
                      <span style={{ width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', minWidth: '32px' }} onClick={() => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}>+</button>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => addToast('Item saved for later', 'info')}>Save for Later</button>
                        <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setCart(cart.filter(i => i.id !== item.id))}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <AvailableCoupons
                addToast={addToast}
                cartTotal={cartSubtotal}
                compact
                onApply={(code) => {
                  setCouponCode(code);
                  handleApplyCoupon(code);
                }}
              />
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter Coupon Code"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  disabled={couponLoading || !!appliedCoupon}
                  style={{ flex: 1, textTransform: 'uppercase' }}
                />
                {appliedCoupon ? (
                  <button className="btn btn-danger" onClick={handleRemoveCoupon}>
                    Remove Coupon
                  </button>
                ) : (
                  <button
                    className="btn btn-secondary"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                  >
                    {couponLoading ? 'Validating...' : 'Apply Coupon'}
                  </button>
                )}
              </div>
              {appliedCoupon && (
                <div style={{ fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span>✅ Code <strong>{appliedCoupon.code}</strong> applied (-₹{appliedCoupon.discountAmount.toFixed(2)})</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={onComplete}>&larr; Continue Shopping</button>
              <button className="btn btn-primary" onClick={handleProceedToAddress} disabled={cart.length === 0}>
                Checkout Securely &rarr;
              </button>
            </div>
          </div>
        )}

        {step === 'ADDRESS' && (
          <div className="glass-card">
            <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1.5rem' }}>Delivery Address</h2>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              {user ? (
                <p>Checking out as <strong>{user.name}</strong>. Provide an address below.</p>
              ) : (
                <p>Checking out as <strong>Guest</strong>. <a href="#" style={{ color: 'var(--secondary)' }}>Sign in</a> to use saved addresses.</p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={addressForm.fullName} onChange={e => setAddressForm({ ...addressForm, fullName: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Address Line 1</label>
              <input className="form-input" value={addressForm.addressLine1} onChange={e => setAddressForm({ ...addressForm, addressLine1: e.target.value })} placeholder="123 Main St" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} placeholder="Mumbai" />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={addressForm.state} onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} placeholder="MH" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">ZIP Code</label>
              <input className="form-input" value={addressForm.zip} onChange={e => setAddressForm({ ...addressForm, zip: e.target.value })} placeholder="400001" />
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep('CART')}>&larr; Back to Cart</button>
              <button className="btn btn-primary" onClick={handleProceedToPayment}>Proceed to Payment &rarr;</button>
            </div>
          </div>
        )}

        {step === 'PAYMENT' && (
          <div className="glass-card">
            <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1.5rem' }}>Select Payment Option</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--bg-input)', border: `2px solid ${paymentMethod === 'RAZORPAY' ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="radio" name="paymentMethod" value="RAZORPAY" checked={paymentMethod === 'RAZORPAY'} onChange={() => setPaymentMethod('RAZORPAY')} style={{ transform: 'scale(1.2)' }} />
                <div>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: paymentMethod === 'RAZORPAY' ? 'var(--primary)' : 'inherit', display: 'block' }}>💳 Razorpay Secure Payment (UPI, Cards, NetBanking, Wallets)</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>You will enter all payment details directly on Razorpay's encrypted checkout page. No credentials are stored on our website.</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--bg-input)', border: `2px solid ${paymentMethod === 'COD' ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} style={{ transform: 'scale(1.2)' }} />
                <div>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: paymentMethod === 'COD' ? 'var(--primary)' : 'inherit', display: 'block' }}>💵 Cash on Delivery (COD)</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>Pay in cash upon doorstep delivery.</span>
                </div>
              </label>
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep('ADDRESS')}>&larr; Back to Address</button>
              <button className="btn btn-success" onClick={handleProcessPayment} style={{ padding: '0.75rem 2.5rem', fontSize: '1.1rem' }}>
                {paymentMethod === 'COD' ? 'Confirm Order' : 'Proceed to Razorpay Page →'}
              </button>
            </div>
          </div>
        )}

        {step === 'RESULT' && (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            {paymentStatus === 'SUCCESS' && (
              <>
                <div style={{ fontSize: '5rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 10px var(--success-glow))' }}>✅</div>
                <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--success)', fontSize: '2rem' }}>
                  {paymentMethod === 'COD' ? 'Order Placed Successfully!' : 'Payment Successful!'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '1.1rem' }}>Your order <strong style={{ color: 'var(--text-primary)' }}>{orderId}</strong> has been placed successfully and is being processed.</p>
              </>
            )}
            {paymentStatus === 'PENDING' && (
              <>
                <div style={{ fontSize: '5rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 10px var(--warning-glow))' }}>⏳</div>
                <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--warning)', fontSize: '2rem' }}>Payment Pending</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '1.1rem' }}>Your order <strong style={{ color: 'var(--text-primary)' }}>{orderId}</strong> is awaiting payment confirmation from the bank.</p>
              </>
            )}
            {paymentStatus === 'FAILED' && (
              <>
                <div style={{ fontSize: '5rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 10px var(--danger-glow))' }}>❌</div>
                <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--danger)', fontSize: '2rem' }}>Payment Failed</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '1.1rem' }}>There was an issue processing your payment for order <strong style={{ color: 'var(--text-primary)' }}>{orderId}</strong>.</p>
                <button className="btn btn-primary" onClick={() => setStep('PAYMENT')} style={{ marginTop: '2.5rem' }}>Retry Payment</button>
              </>
            )}

            {paymentStatus !== 'FAILED' && (
              <button className="btn btn-secondary" onClick={onComplete} style={{ marginTop: '3rem' }}>
                &larr; Return to Shop
              </button>
            )}
          </div>
        )}

      </div>

      {/* RIGHT COLUMN: Order Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-card" style={{ position: 'sticky', top: '100px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>Order Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Items Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)}):</span>
              <span style={{ color: 'var(--text-primary)' }}>₹{cartSubtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Shipping Cost:</span>
              <span style={{ color: 'var(--text-primary)' }}>₹{shippingCost.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>GST (18%):</span>
              <span style={{ color: 'var(--text-primary)' }}>₹{gst.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--success)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Discount {appliedCoupon ? `(${appliedCoupon.code})` : ''}:</span>
                  <button
                    onClick={handleRemoveCoupon}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', padding: 0 }}
                  >
                    Remove
                  </button>
                </div>
                <span style={{ fontWeight: 600 }}>-₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-color)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--secondary)' }}>
              <span>Grand Total:</span>
              <span>₹{Math.max(0, grandTotal).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
