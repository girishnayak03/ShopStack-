import React, { useState } from 'react';
import { api } from '../api';
import { Eye, RotateCcw, XCircle, Calendar, MapPin } from 'lucide-react';
import ProductImage from './ProductImage';
import StatusBadge from './StatusBadge';
import InvoiceButton from './InvoiceButton';
import ReturnRefundModal from './ReturnRefundModal';

const vendorStatuses = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED'
];

export default function OrderCard({
  order,
  isVendor,
  onStatusChange,
  onOpenDetails,
  onCancel,
  onReturn,
  onReorder,
  addToast
}) {
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const orderId = order.orderId || order.id;

  const normalizedStatus = String(
    order.status || 'PENDING'
  ).toUpperCase().replace(/ /g, '_');

  const items = order.items || [];

  const canCancel = ['PENDING', 'CONFIRMED'].includes(normalizedStatus);

  const totalVal = Number(
    order.totalAmount ||
    order.total ||
    order.amount ||
    0
  );

  // -----------------------------
  // ORDER DATE & TIME
  // -----------------------------
  const rawDate =
    order.createdAt ||
    order.orderDate ||
    order.date ||
    order.createdDate;

  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : 'Date not available';

  // -----------------------------
  // SHIPPING ADDRESS
  // -----------------------------
  const shippingAddress =
    order.shippingAddress ||
    order.address ||
    order.deliveryAddress ||
    order.customerAddress;

  const getAddressText = (address) => {
    if (!address) {
      return 'Address not available';
    }

    // If backend already sends address as a string
    if (typeof address === 'string') {
      return address;
    }

    // If backend sends address as an object
    return [
      address.addressLine1,
      address.addressLine2,
      address.street,
      address.city,
      address.state,
      address.postalCode || address.zipCode || address.pincode,
      address.country
    ]
      .filter(Boolean)
      .join(', ') || 'Address not available';
  };

  const addressText = getAddressText(shippingAddress);

  return (
    <article
      className="order-card glass-card"
      style={{
        padding: '1rem',
        borderRadius: '8px',
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-md)'
      }}
    >

      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '10px',
          alignItems: 'start'
        }}
      >
        <div>
          <strong>Order #{orderId}</strong>

          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginTop: 4
            }}
          >
            {order.customerName ||
              order.customer?.name ||
              order.user?.name ||
              (isVendor ? 'Customer details' : '')}
          </div>
        </div>

        <StatusBadge status={normalizedStatus} />
      </div>

      {/* DATE & TIME */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '10px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}
      >
        <Calendar size={14} />
        <span>{formattedDate}</span>
      </div>

      {/* SHIPPING ADDRESS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '6px',
          marginTop: '8px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}
      >
        <MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} />

        <span>
          {addressText}
        </span>
      </div>

      {/* PRODUCTS */}
      <div
        style={{
          margin: '12px 0',
          display: 'grid',
          gap: '8px'
        }}
      >
        {items.slice(0, 2).map((item, index) => {

          const imageUrl =
            item.imageUrl ||
            item.image ||
            item.productImage ||
            item.product?.imageUrl ||
            item.product?.image ||
            item.product?.imageUrlPath;

          const productName =
            item.productName ||
            item.name ||
            item.product?.productName ||
            item.product?.name ||
            'Product';

          const itemPrice = Number(
            item.price ||
            item.unitPrice ||
            item.product?.price ||
            0
          );

          return (
            <div
              key={item.id || item.productId || index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >

              {/* PRODUCT IMAGE */}
              <ProductImage
                src={imageUrl}
                alt={productName}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />

              {/* PRODUCT NAME */}
              <span
                style={{
                  flex: 1,
                  fontSize: '0.85rem'
                }}
              >
                {productName} × {item.quantity || 1}
              </span>

              {/* PRODUCT PRICE */}
              <span
                style={{
                  fontSize: '0.82rem'
                }}
              >
                ₹{itemPrice.toFixed(2)}
              </span>

            </div>
          );
        })}
      </div>

      {/* PAYMENT + TOTAL */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '10px'
        }}
      >
        <span
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)'
          }}
        >
          Payment: {order.paymentStatus || 'COMPLETED'}
        </span>

        <strong>
          ₹{totalVal.toFixed(2)}
        </strong>
      </div>

      {/* ACTIONS */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginTop: '12px'
        }}
      >

        <button
          className="btn btn-secondary"
          onClick={() => onOpenDetails(order)}
          style={{
            padding: '0.35rem 0.65rem',
            fontSize: '0.8rem'
          }}
        >
          <Eye size={14} />
          Details
        </button>

        {!isVendor && (
          <>
            <InvoiceButton order={order} />

            <button
              className="btn btn-secondary"
              onClick={() => onReorder(order)}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.8rem'
              }}
            >
              <RotateCcw size={14} />
              Reorder
            </button>

            {canCancel && (
              <button
                className="btn btn-secondary"
                onClick={() => onCancel(order)}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  color: '#ef4444'
                }}
              >
                <XCircle size={14} />
                Cancel
              </button>
            )}

            {normalizedStatus === 'DELIVERED' && (
              <button
                className="btn btn-return"
                onClick={() => setShowReturnModal(true)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                ↩ Return / Refund
              </button>
            )}

            {showReturnModal && (
              <ReturnRefundModal
                order={order}
                addToast={addToast}
                onClose={() => setShowReturnModal(false)}
              />
            )}
          </>
        )}

        {isVendor && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
            
            {/* Status indicator */}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              Status: {String(normalizedStatus).replace(/_/g, ' ')}
            </span>

            {/* Accept / Reject */}
            {['PENDING', 'PAYMENT_SUCCESS', 'PAYMENT_PENDING'].includes(normalizedStatus) && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#10b981', borderColor: '#10b981' }}
                  onClick={async () => {
                    try {
                      await api.orders.accept(orderId);
                      addToast?.('Order accepted successfully.', 'success');
                      onStatusChange?.(orderId, 'CONFIRMED');
                    } catch (err) {
                      addToast?.(err.message || 'Failed to accept order', 'error');
                    }
                  }}
                >
                  Accept Order
                </button>
                <button
                  className="btn btn-danger"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={async () => {
                    try {
                      await api.orders.reject(orderId);
                      addToast?.('Order rejected successfully.', 'success');
                      onStatusChange?.(orderId, 'CANCELLED');
                    } catch (err) {
                      addToast?.(err.message || 'Failed to reject order', 'error');
                    }
                  }}
                >
                  Reject
                </button>
              </div>
            )}

            {/* Pack */}
            {normalizedStatus === 'CONFIRMED' && (
              <button
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', marginLeft: 'auto' }}
                onClick={async () => {
                  try {
                    await api.orders.pack(orderId);
                    addToast?.('Order packed successfully.', 'success');
                    onStatusChange?.(orderId, 'PACKING');
                  } catch (err) {
                    addToast?.(err.message || 'Failed to pack order', 'error');
                  }
                }}
              >
                Pack Product
              </button>
            )}

            {/* Ready for Pickup */}
            {normalizedStatus === 'PACKING' && (
              <button
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', marginLeft: 'auto' }}
                onClick={async () => {
                  try {
                    await api.orders.readyPickup(orderId);
                    addToast?.('Order marked as ready for courier pickup.', 'success');
                    onStatusChange?.(orderId, 'READY_FOR_PICKUP');
                  } catch (err) {
                    addToast?.(err.message || 'Failed to mark ready', 'error');
                  }
                }}
              >
                Ready for Pickup
              </button>
            )}

            {/* Ready for Pickup actions: Slip & Allocate */}
            {normalizedStatus === 'READY_FOR_PICKUP' && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={async () => {
                    try {
                      const res = await api.orders.getPackingSlip(orderId);
                      if (res && res.pdfPath) {
                        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
                        window.open(`${baseUrl}${res.pdfPath}`, '_blank');
                      } else {
                        addToast?.('Failed to get packing slip path', 'error');
                      }
                    } catch (err) {
                      addToast?.(err.message || 'Failed to generate slip', 'error');
                    }
                  }}
                >
                  📄 Packing Slip
                </button>
                <button
                  className="btn btn-primary"
                  disabled={allocating}
                  onClick={async () => {
                    try {
                      setAllocating(true);
                      await api.warehouseFulfillments.allocateOrder(orderId);
                      addToast?.('Order sent for warehouse allocation.', 'success');
                      onStatusChange?.(orderId, 'PROCESSING');
                    } catch (err) {
                      addToast?.(err.message || 'Allocation failed', 'error');
                    } finally {
                      setAllocating(false);
                    }
                  }}
                  style={{ padding: '0.35rem 0.75rem' }}
                >
                  {allocating ? 'Allocating...' : 'Allocate to Warehouse'}
                </button>
              </div>
            )}

            {/* Awaiting Vendor Allotment fallback (for backward compatibility) */}
            {normalizedStatus === 'AWAITING_VENDOR_ALLOTMENT' && (
              <button
                className="btn btn-primary"
                disabled={allocating}
                onClick={async () => {
                  try {
                    setAllocating(true);
                    await api.warehouseFulfillments.allocateOrder(orderId);
                    addToast?.('Order sent for warehouse allocation.', 'success');
                    onStatusChange?.(orderId, 'PROCESSING');
                  } catch (err) {
                    addToast?.(err.message || 'Allocation failed', 'error');
                  } finally {
                    setAllocating(false);
                  }
                }}
                style={{ padding: '0.35rem 0.75rem', marginLeft: 'auto' }}
              >
                {allocating ? 'Allocating...' : 'Allocate to Warehouse'}
              </button>
            )}

          </div>
        )}

      </div>

    </article>
  );
}