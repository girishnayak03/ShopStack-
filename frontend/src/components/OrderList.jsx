import React, {
  useEffect,
  useMemo,
  useState,
  useRef
} from 'react';

import { RefreshCw, Search } from 'lucide-react';
import { api } from '../api';
import { Client } from '@stomp/stompjs';

import EmptyState from './EmptyState';
import OrderCard from './OrderCard';
import OrderDetailsModal from './OrderDetailsModal';
import { MOCK_ORDERS } from '../data/mockOrders';

const filters = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED'
];

const unwrap = (result) =>
  result?.data?.content ||
  result?.content ||
  result?.data ||
  result ||
  [];

const statusOf = (order) =>
  String(order.status || 'PENDING')
    .toUpperCase()
    .replace(/ /g, '_');

export default function OrderList({
  isVendor,
  addToast,
  user
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const stompClientRef = useRef(null);

  const loadOrders = async () => {
    setLoading(true);

    try {
      const result = await (
        isVendor
          ? api.orders.getVendorAll()
          : api.orders.getAll(user?.id)
      );

      const responseOrders = unwrap(result);

      setOrders(
        Array.isArray(responseOrders)
          ? responseOrders
          : []
      );

      setError('');

    } catch (err) {
      setOrders([]);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadOrders();
  };

  useEffect(() => {
    loadOrders();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVendor, user?.id]);

  /*
   * Existing Customer-specific WebSocket
   * Keep this because it is already working.
   */
  useEffect(() => {
    if (isVendor || !user?.id) {
      return;
    }

    const client = new Client({
      webSocketFactory: () =>
        new WebSocket('http://localhost:8080/ws'),

      reconnectDelay: 5000,

      onConnect: () => {
        console.log(
          '✅ Customer WebSocket connected'
        );

        client.subscribe(
          `/topic/orders/${user.id}`,
          (message) => {
            try {
              const update =
                JSON.parse(message.body);

              console.log(
                '⚡ Real-time order update:',
                update
              );

              const statusMessages = {
                PENDING:
                  'Your order is pending.',
                CONFIRMED:
                  'Your order has been confirmed.',
                PACKING:
                  'Your order is being packed.',
                READY_FOR_PICKUP:
                  'Your order is ready for courier pickup.',
                SHIPPED:
                  'Your order has been shipped.',
                OUT_FOR_DELIVERY:
                  'Your order is out for delivery.',
                DELIVERED:
                  'Your order has been delivered successfully. 🎉',
                CANCELLED:
                  'Your order has been cancelled.',
                RETURNED:
                  'Your order has been returned.',
                REFUNDED:
                  'Your order has been refunded.'
              };

              const updateStatus =
                String(
                  update.status || ''
                ).toUpperCase();

              const notificationMessage =
                statusMessages[updateStatus] ||
                `Your order status has been updated to ${updateStatus.replace(
                  /_/g,
                  ' '
                )}.`;

              addToast?.(
                notificationMessage,
                updateStatus === 'DELIVERED'
                  ? 'success'
                  : updateStatus === 'CANCELLED'
                    ? 'error'
                    : 'info'
              );

              setOrders(
                (currentOrders) =>
                  currentOrders.map((order) => {

                    const currentOrderId =
                      order.orderId ||
                      order.id;

                    if (
                      String(currentOrderId) ===
                      String(update.orderId)
                    ) {
                      return {
                        ...order,
                        status:
                          update.status
                      };
                    }

                    return order;
                  })
              );

            } catch (error) {
              console.error(
                'Failed to process order update:',
                error
              );
            }
          }
        );
      },

      onStompError: (frame) => {
        console.error(
          '❌ WebSocket error:',
          frame.headers['message']
        );
      },

      onWebSocketError: (error) => {
        console.error(
          '❌ WebSocket connection error:',
          error
        );
      }
    });

    stompClientRef.current = client;

    client.activate();

    return () => {
      client.deactivate();
      stompClientRef.current = null;
    };
  }, [isVendor, user?.id, addToast]);

  /*
   * Generic realtime event listener.
   *
   * This receives events from:
   * Customer
   * Vendor
   * Warehouse
   * Admin
   */
 

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {

        const searchText =
          `${order.orderId || order.id || ''} ${
            (order.items || [])
              .map(
                (item) =>
                  item.productName ||
                  item.name ||
                  item.product?.name ||
                  ''
              )
              .join(' ')
          }`.toLowerCase();

        return (
          (status === 'ALL' ||
            statusOf(order) === status) &&
          searchText.includes(
            query.trim().toLowerCase()
          )
        );
      }),
    [orders, query, status]
  );

  const updateStatus = async (
    orderId,
    nextStatus
  ) => {

    const previous = orders;

    setOrders(
      (current) =>
        current.map((order) =>
          (order.orderId || order.id) ===
          orderId
            ? {
                ...order,
                status: nextStatus
              }
            : order
        )
    );

    try {

      await api.orders.updateStatus(
        orderId,
        nextStatus
      );

      addToast?.(
        'Order status updated.',
        'success'
      );

    } catch (requestError) {

      setOrders(previous);

      addToast?.(
        requestError.message ||
          'Status update failed.',
        'error'
      );
    }
  };

  const customerAction = async (
    order,
    action
  ) => {

    const orderId =
      order.orderId || order.id;

    try {

      await (
        action === 'cancel'
          ? api.orders.cancel(orderId)
          : api.orders.returnOrder(orderId)
      );

      setOrders(
        (current) =>
          current.map((item) =>
            (item.orderId || item.id) ===
            orderId
              ? {
                  ...item,
                  status:
                    action === 'cancel'
                      ? 'CANCELLED'
                      : 'RETURNED'
                }
              : item
          )
      );

      addToast?.(
        `Order ${
          action === 'cancel'
            ? 'cancelled'
            : 'return requested'
        }.`,
        'success'
      );

    } catch (requestError) {

      addToast?.(
        requestError.message ||
          'Order action failed.',
        'error'
      );
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        Loading orders...
      </div>
    );
  }

  return (
    <section>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '1rem'
        }}
      >

        <div
          style={{
            flex: 1,
            minWidth: '220px',
            position: 'relative'
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 10,
              top: 10,
              color: 'var(--text-muted)'
            }}
          />

          <input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value
              )
            }
            placeholder="Search order ID or product"
            style={{
              boxSizing: 'border-box',
              padding:
                '0.55rem 0.55rem 0.55rem 34px',
              width: '100%',
              borderRadius: '8px',
              border:
                '1px solid var(--border-color)',
              background:
                'var(--input-bg)',
              color:
                'var(--text-primary)'
            }}
          />
        </div>

        <button
          className="btn btn-secondary"
          onClick={loadOrders}
        >
          <RefreshCw size={15} />
          Retry
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleRefresh}
        >
          <RefreshCw size={15} />
          Refresh Orders
        </button>

      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: '1rem'
        }}
      >

        {filters.map((filter) => (

          <button
            key={filter}
            className={`btn ${
              status === filter
                ? 'btn-primary'
                : 'btn-secondary'
            }`}
            onClick={() =>
              setStatus(filter)
            }
            style={{
              padding:
                '0.25rem 0.5rem',
              fontSize: '0.72rem'
            }}
          >
            {filter.replace(
              /_/g,
              ' '
            )}
          </button>

        ))}

      </div>

      {visibleOrders.length ? (

        <div
          className="order-list"
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns:
              'repeat(auto-fill, minmax(300px, 1fr))'
          }}
        >

          {visibleOrders.map((order) => (

            <OrderCard
              key={
                order.orderId ||
                order.id
              }
              order={order}
              isVendor={isVendor}
              onStatusChange={
                updateStatus
              }
              onOpenDetails={
                setSelectedOrder
              }
              onCancel={(item) =>
                customerAction(
                  item,
                  'cancel'
                )
              }
              onReturn={(item) =>
                customerAction(
                  item,
                  'return'
                )
              }
              onReorder={() =>
                addToast?.(
                  'Order items are ready to add to your cart.',
                  'info'
                )
              }
              addToast={addToast}
            />

          ))}

        </div>

      ) : (

        <EmptyState
          message="No orders match your search or filter."
        />

      )}

      {selectedOrder && (

        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setSelectedOrder(null);
            loadOrders();
          }}
        />

      )}

    </section>
  );
}