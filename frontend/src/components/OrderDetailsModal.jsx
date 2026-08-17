import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Truck,
  Package,
  CreditCard,
  CalendarDays,
  CheckCircle2
} from 'lucide-react';
import { api } from '../api';
import ProductImage from './ProductImage';
import OrderTimeline from './OrderTimeline';
import StatusBadge from './StatusBadge';

export default function OrderDetailsModal({ order, onClose }) {
  const [details, setDetails] = useState(order);
  const [timeline, setTimeline] = useState([]);
  const [tracking, setTracking] = useState(null);

  const orderId = order?.orderId || order?.id;

  useEffect(() => {
    if (!orderId) return;

    Promise.all([
      api.orders.getById(orderId),
      api.orders.getTimeline(orderId),
      api.orders.getTracking(orderId)
    ])
      .then(([orderResult, timelineResult, trackingResult]) => {
        const orderData = orderResult?.data || orderResult || order;
        const timelineData = timelineResult?.data || timelineResult || [];

        const deliveredEvent = timelineData.find(
          (event) =>
            String(
              event.status ||
              event.event ||
              event.type ||
              ''
            ).toUpperCase() === 'DELIVERED'
        );

        const deliveredAt =
          deliveredEvent?.timestamp ||
          deliveredEvent?.createdAt ||
          deliveredEvent?.date ||
          deliveredEvent?.time ||
          null;

        setDetails({
          ...orderData,
          deliveredAt:
            orderData?.deliveredAt || deliveredAt
        });

        setTimeline(timelineData);

        setTracking(
          trackingResult?.data ||
          trackingResult ||
          null
        );
      })
      .catch(() => {
        setDetails(order);
        setTimeline([]);

        setTracking({
          trackingNumber: order?.trackingNumber,
          status: order?.status
        });
      });
  }, [order, orderId]);

  if (!order) return null;

  const items = details?.items || [];

  const address =
    details?.shippingAddress ||
    details?.address ||
    details?.deliveryAddress ||
    details?.customerAddress;

  const formatAddress = (addressObj) => {
    if (!addressObj) return 'Address not available';

    if (typeof addressObj === 'string') {
      return addressObj;
    }

    return [
      addressObj.addressLine1 || addressObj.street,
      addressObj.addressLine2,
      addressObj.city,
      addressObj.state,
      addressObj.postalCode ||
        addressObj.zipCode ||
        addressObj.pincode,
      addressObj.country
    ]
      .filter(Boolean)
      .join(', ') || 'Address not available';
  };

  const orderStatus = String(
    details?.status || 'PENDING'
  ).toUpperCase();

  const isDelivered =
    orderStatus === 'DELIVERED' && details?.deliveredAt;

  const isPaid =
    orderStatus !== 'PAYMENT_PENDING' &&
    orderStatus !== 'PENDING';

  const estimatedDate = details?.estimatedDelivery
    ? new Date(
        details.estimatedDelivery
      ).toLocaleDateString()
    : '—';

  const deliveredDate = details?.deliveredAt
    ? new Date(
        details.deliveredAt
      ).toLocaleDateString()
    : null;

  const deliveredEarly =
    details?.deliveredAt &&
    details?.estimatedDelivery &&
    new Date(details.deliveredAt) <
      new Date(details.estimatedDelivery);

  const totalAmount =
    Number(
      details?.totalAmount ||
      details?.total ||
      0
    ).toFixed(2);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        padding: '1rem',
        zIndex: 2000
      }}
    >
      <div
        className="modal-content"
        onClick={(event) =>
          event.stopPropagation()
        }
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: 0,
          textAlign: 'left',
          borderRadius: '18px',
          overflowX: 'hidden'
        }}
      >
        {/* HEADER */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            padding: '1.25rem 1.5rem',
            borderBottom:
              '1px solid var(--border-color)',
            background:
              'var(--bg-card, var(--bg-main))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.2rem'
              }}
            >
              Order Details
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: '1.25rem',
                overflowWrap: 'anywhere'
              }}
            >
              Order #{details?.orderId || details?.id}
            </h2>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close order details"
            style={{
              position: 'static',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* STATUS HERO */}
        <div
          style={{
            margin: '1.25rem 1.5rem 0',
            padding: '1.15rem',
            borderRadius: '14px',
            border:
              '1px solid var(--border-color)',
            background:
              'var(--glass-bg, rgba(255,255,255,0.03))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              minWidth: 0
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'rgba(59, 130, 246, 0.12)',
                color: '#3b82f6',
                flexShrink: 0
              }}
            >
              {isDelivered ? (
                <CheckCircle2 size={22} />
              ) : (
                <Package size={22} />
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: '0.2rem'
                }}
              >
                Current Status
              </div>

              <div
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem'
                }}
              >
                Your order status is updated in
                real time.
              </div>
            </div>
          </div>

          <StatusBadge status={details?.status} />
        </div>

        {/* SUMMARY CARDS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '0.9rem',
            padding: '1.25rem 1.5rem'
          }}
        >
          {/* PAYMENT */}
          <div
            style={{
              border:
                '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '1rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                marginBottom: '0.65rem',
                color: 'var(--text-secondary)'
              }}
            >
              <CreditCard size={17} />
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Payment
              </span>
            </div>

            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700
              }}
            >
              {isPaid ? 'Paid' : 'Pending'}
            </div>

            <div
              style={{
                marginTop: '0.35rem',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem'
              }}
            >
              Total: ₹{totalAmount}
            </div>
          </div>

          {/* DELIVERY */}
          <div
            style={{
              border:
                '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '1rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                marginBottom: '0.65rem',
                color: 'var(--text-secondary)'
              }}
            >
              <CalendarDays size={17} />
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Delivery
              </span>
            </div>

            {isDelivered ? (
              <>
                <div
                  style={{
                    fontWeight: 700
                  }}
                >
                  Delivered
                </div>

                <div
                  style={{
                    marginTop: '0.35rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.82rem'
                  }}
                >
                  {deliveredDate}
                </div>

                {deliveredEarly && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      color: '#10b981',
                      fontSize: '0.78rem',
                      fontWeight: 700
                    }}
                  >
                    🎉 Delivered earlier than
                    expected
                  </div>
                )}
              </>
            ) : (
              <>
                <div
                  style={{
                    fontWeight: 700
                  }}
                >
                  Estimated Delivery
                </div>

                <div
                  style={{
                    marginTop: '0.35rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.82rem'
                  }}
                >
                  {estimatedDate}
                </div>
              </>
            )}
          </div>

          {/* TRACKING */}
          <div
            style={{
              border:
                '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '1rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                marginBottom: '0.65rem',
                color: 'var(--text-secondary)'
              }}
            >
              <Truck size={17} />

              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Tracking
              </span>
            </div>

            <div
              style={{
                fontWeight: 700,
                overflowWrap: 'anywhere'
              }}
            >
              {tracking?.trackingNumber ||
                details?.trackingNumber ||
                'Not available'}
            </div>

            <div
              style={{
                marginTop: '0.35rem',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem'
              }}
            >
              {tracking?.courierStatus ||
                tracking?.status ||
                'Awaiting courier update'}
            </div>
          </div>
        </div>

        {/* ADDRESS */}
        <div
          style={{
            margin: '0 1.5rem 1.25rem',
            padding: '1rem',
            borderRadius: '14px',
            border:
              '1px solid var(--border-color)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              marginBottom: '0.6rem'
            }}
          >
            <MapPin size={17} />

            <strong>
              Shipping Address
            </strong>
          </div>

          <div
            style={{
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              fontSize: '0.88rem',
              overflowWrap: 'anywhere'
            }}
          >
            {formatAddress(address)}
          </div>
        </div>

        {/* PRODUCTS */}
        <div
          style={{
            padding: '0 1.5rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginBottom: '0.75rem'
            }}
          >
            <h3
              style={{
                margin: 0
              }}
            >
              Ordered Products
            </h3>

            <span
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.8rem'
              }}
            >
              {items.length}{' '}
              {items.length === 1
                ? 'item'
                : 'items'}
            </span>
          </div>

          <div
            style={{
              border:
                '1px solid var(--border-color)',
              borderRadius: '14px',
              overflow: 'hidden'
            }}
          >
            {items.length ? (
              items.map((item, index) => (
                <div
                  key={
                    item.id ||
                    item.productId ||
                    index
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.9rem',
                    padding: '0.9rem',
                    borderTop:
                      index === 0
                        ? 'none'
                        : '1px solid var(--border-color)',
                    minWidth: 0
                  }}
                >
                  <ProductImage
                    src={
                      item.productImage ||
                      item.image ||
                      item.product?.imageUrl ||
                      item.product?.image
                    }
                    alt={
                      item.productName ||
                      item.name ||
                      item.product?.productName ||
                      'Product'
                    }
                    style={{
                      width: 64,
                      height: 64,
                      objectFit: 'cover',
                      borderRadius: '10px',
                      flexShrink: 0
                    }}
                  />

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        lineHeight: 1.35,
                        overflowWrap: 'anywhere'
                      }}
                    >
                      {item.productName ||
                        item.name ||
                        item.product?.name ||
                        'Product'}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.45rem',
                        marginTop: '0.35rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <span>
                        Qty {item.quantity || 1}
                      </span>

                      <span>•</span>

                      <span>
                        ₹
                        {Number(
                          item.price ||
                            item.unitPrice ||
                            0
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    ₹
                    {(
                      Number(
                        item.price ||
                          item.unitPrice ||
                          0
                      ) *
                      Number(item.quantity || 1)
                    ).toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: '1.25rem',
                  color: 'var(--text-muted)'
                }}
              >
                No item details available.
              </div>
            )}
          </div>
        </div>

        {/* TOTAL */}
        <div
          style={{
            margin: '1.25rem 1.5rem',
            padding: '1rem 1.15rem',
            borderRadius: '14px',
            background:
              'rgba(59, 130, 246, 0.08)',
            border:
              '1px solid rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <span
            style={{
              color: 'var(--text-secondary)',
              fontWeight: 600
            }}
          >
            Order Total
          </span>

          <strong
            style={{
              fontSize: '1.25rem'
            }}
          >
            ₹{totalAmount}
          </strong>
        </div>

        {/* TIMELINE */}
        <div
          style={{
            padding: '0 1.5rem 1.5rem'
          }}
        >
          <h3
            style={{
              margin: '0 0 0.75rem'
            }}
          >
            Delivery Timeline
          </h3>

          <div
            style={{
              border:
                '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '1rem'
            }}
          >
            <OrderTimeline
              status={details?.status}
              timeline={timeline}
            />
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop:
              '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}