package com.shopstack.modules.vendor.service;

import com.shopstack.modules.order.entity.CommissionLedger;
import com.shopstack.modules.order.entity.Order;
import com.shopstack.modules.order.entity.OrderItem;
import com.shopstack.modules.order.enums.LedgerStatus;
import com.shopstack.modules.order.enums.LedgerTransactionType;
import com.shopstack.modules.order.repository.CommissionLedgerRepository;
import com.shopstack.modules.order.repository.OrderRepository;
import com.shopstack.modules.order.repository.ReturnRequestRepository;
import com.shopstack.modules.order.service.CommissionService;
import com.shopstack.modules.product.entity.Product;
import com.shopstack.modules.product.repository.ProductRepository;
import com.shopstack.modules.product.repository.ReviewRepository;
import com.shopstack.modules.user.entity.User;
import com.shopstack.modules.vendor.entity.*;
import com.shopstack.modules.vendor.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class VendorAnalyticsAggregationServiceTest {

    @Mock
    private VendorRepository vendorRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private CommissionLedgerRepository commissionLedgerRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ReviewRepository reviewRepository;
    @Mock
    private ReturnRequestRepository returnRequestRepository;
    @Mock
    private VendorSalesSummaryRepository salesSummaryRepository;
    @Mock
    private VendorProductPerformanceRepository productPerformanceRepository;
    @Mock
    private VendorCustomerInsightsRepository customerInsightsRepository;
    @Mock
    private CommissionService commissionService;

    @InjectMocks
    private VendorAnalyticsAggregationServiceImpl aggregationService;

    private Long vendorId;
    private LocalDate summaryDate;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        vendorId = 10L;
        summaryDate = LocalDate.of(2026, 8, 17);
    }

    @Test
    public void testAggregationWithZeroOrders() {
        when(orderRepository.findQualifyingOrdersByVendorIdAndDateRange(eq(vendorId), any(), any()))
                .thenReturn(Collections.emptyList());
        when(commissionLedgerRepository.findAllByVendorIdAndRange(eq(vendorId), any(), any()))
                .thenReturn(Collections.emptyList());
        when(salesSummaryRepository.findByVendorIdAndSummaryDate(vendorId, summaryDate))
                .thenReturn(Optional.empty());
        when(productRepository.findByVendorId(vendorId)).thenReturn(Collections.emptyList());

        aggregationService.aggregateVendorAnalyticsForDate(vendorId, summaryDate);

        ArgumentCaptor<VendorSalesSummary> summaryCaptor = ArgumentCaptor.forClass(VendorSalesSummary.class);
        verify(salesSummaryRepository).save(summaryCaptor.capture());

        VendorSalesSummary saved = summaryCaptor.getValue();
        assertEquals(0, saved.getTotalOrders());
        assertEquals(0, saved.getTotalUnitsSold());
        assertEquals(0, saved.getGrossRevenue().compareTo(BigDecimal.ZERO));
        assertEquals(0, saved.getCommissionDeducted().compareTo(BigDecimal.ZERO));
        assertEquals(0, saved.getNetPayout().compareTo(BigDecimal.ZERO));
    }

    @Test
    public void testAggregationWithSingleOrderAndCommission() {
        UUID orderId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        User user = new User();
        user.setId(userId);

        Product product = Product.builder()
                .vendorId(vendorId)
                .productName("Test Keyboard")
                .price(BigDecimal.valueOf(500.00))
                .build();
        product.setId(productId);

        OrderItem item = new OrderItem();
        item.setId(UUID.randomUUID());
        item.setProduct(product);
        item.setPrice(500.00);
        item.setQuantity(2);

        Order order = new Order();
        order.setId(orderId);
        order.setUser(user);
        order.setItems(List.of(item));

        when(orderRepository.findQualifyingOrdersByVendorIdAndDateRange(eq(vendorId), any(), any()))
                .thenReturn(List.of(order));

        CommissionLedger ledger = CommissionLedger.builder()
                .vendorId(vendorId)
                .orderId(orderId)
                .orderItemId(item.getId())
                .grossAmount(BigDecimal.valueOf(1000.00))
                .commissionAmount(BigDecimal.valueOf(100.00))
                .vendorAmount(BigDecimal.valueOf(900.00))
                .transactionType(LedgerTransactionType.COMMISSION)
                .status(LedgerStatus.CONFIRMED)
                .build();

        when(commissionLedgerRepository.findAllByVendorIdAndRange(eq(vendorId), any(), any()))
                .thenReturn(List.of(ledger));
        when(productRepository.findByVendorId(vendorId)).thenReturn(List.of(product));
        when(orderRepository.countQualifyingOrdersByVendorAndUserBefore(eq(vendorId), eq(userId), any()))
                .thenReturn(0L); // New customer

        aggregationService.aggregateVendorAnalyticsForDate(vendorId, summaryDate);

        ArgumentCaptor<VendorSalesSummary> summaryCaptor = ArgumentCaptor.forClass(VendorSalesSummary.class);
        verify(salesSummaryRepository).save(summaryCaptor.capture());

        VendorSalesSummary saved = summaryCaptor.getValue();
        assertEquals(1, saved.getTotalOrders());
        assertEquals(2, saved.getTotalUnitsSold());
        assertEquals(0, saved.getGrossRevenue().compareTo(BigDecimal.valueOf(1000.00)));
        assertEquals(0, saved.getCommissionDeducted().compareTo(BigDecimal.valueOf(100.00)));
        assertEquals(0, saved.getNetPayout().compareTo(BigDecimal.valueOf(900.00)));

        ArgumentCaptor<VendorCustomerInsights> insightsCaptor = ArgumentCaptor.forClass(VendorCustomerInsights.class);
        verify(customerInsightsRepository).save(insightsCaptor.capture());

        VendorCustomerInsights savedInsights = insightsCaptor.getValue();
        assertEquals(1, savedInsights.getNewCustomers());
        assertEquals(0, savedInsights.getRepeatCustomers());
    }

    @Test
    public void testIdempotency() {
        VendorSalesSummary existingSummary = VendorSalesSummary.builder()
                .summaryId(100L)
                .vendorId(vendorId)
                .summaryDate(summaryDate)
                .totalOrders(1)
                .totalUnitsSold(1)
                .grossRevenue(BigDecimal.valueOf(500))
                .createdAt(LocalDateTime.now())
                .build();

        when(salesSummaryRepository.findByVendorIdAndSummaryDate(vendorId, summaryDate))
                .thenReturn(Optional.of(existingSummary));
        when(orderRepository.findQualifyingOrdersByVendorIdAndDateRange(eq(vendorId), any(), any()))
                .thenReturn(Collections.emptyList());

        aggregationService.aggregateVendorAnalyticsForDate(vendorId, summaryDate);

        // Verifies update rather than creating duplicate row
        verify(salesSummaryRepository).save(existingSummary);
        assertEquals(0, existingSummary.getTotalOrders());
        assertEquals(0, existingSummary.getGrossRevenue().compareTo(BigDecimal.ZERO));
    }
}
