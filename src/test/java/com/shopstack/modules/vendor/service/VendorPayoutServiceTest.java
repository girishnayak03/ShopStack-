package com.shopstack.modules.vendor.service;

import com.shopstack.common.exception.DuplicatePayoutException;
import com.shopstack.common.exception.InvalidPayoutStateException;
import com.shopstack.modules.vendor.dto.requests.CreatePayoutRequest;
import com.shopstack.modules.vendor.dto.requests.ProcessPayoutRequest;
import com.shopstack.modules.vendor.dto.responses.VendorPayoutDto;
import com.shopstack.modules.vendor.entity.Vendor;
import com.shopstack.modules.vendor.entity.VendorPayout;
import com.shopstack.modules.vendor.entity.VendorSalesSummary;
import com.shopstack.modules.vendor.enums.PayoutStatus;
import com.shopstack.modules.vendor.repository.VendorPayoutRepository;
import com.shopstack.modules.vendor.repository.VendorRepository;
import com.shopstack.modules.vendor.repository.VendorSalesSummaryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class VendorPayoutServiceTest {

    @Mock
    private VendorPayoutRepository payoutRepository;
    @Mock
    private VendorRepository vendorRepository;
    @Mock
    private VendorSalesSummaryRepository salesSummaryRepository;
    @Mock
    private VendorAnalyticsAggregationService aggregationService;

    @InjectMocks
    private VendorPayoutServiceImpl payoutService;

    private Long vendorId;
    private LocalDate startDate;
    private LocalDate endDate;
    private Vendor vendor;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        vendorId = 5L;
        startDate = LocalDate.of(2026, 8, 1);
        endDate = LocalDate.of(2026, 8, 15);

        vendor = Vendor.builder()
                .vendorId(vendorId)
                .businessName("Acme Traders")
                .build();

        when(vendorRepository.findById(vendorId)).thenReturn(Optional.of(vendor));
    }

    @Test
    public void testCreatePayoutSuccess() {
        CreatePayoutRequest request = CreatePayoutRequest.builder()
                .vendorId(vendorId)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        when(payoutRepository.existsByVendorIdAndPayoutPeriodStartAndPayoutPeriodEndAndStatusNot(
                eq(vendorId), eq(startDate), eq(endDate), eq(PayoutStatus.CANCELLED)))
                .thenReturn(false);

        VendorSalesSummary summary = VendorSalesSummary.builder()
                .vendorId(vendorId)
                .summaryDate(startDate)
                .grossRevenue(BigDecimal.valueOf(10000.00))
                .commissionDeducted(BigDecimal.valueOf(1000.00))
                .refundsAmount(BigDecimal.valueOf(500.00))
                .netPayout(BigDecimal.valueOf(8500.00))
                .build();

        when(salesSummaryRepository.findByVendorIdAndSummaryDateBetweenOrderBySummaryDateAsc(vendorId, startDate, endDate))
                .thenReturn(List.of(summary));

        when(payoutRepository.save(any(VendorPayout.class))).thenAnswer(invocation -> {
            VendorPayout p = invocation.getArgument(0);
            p.setPayoutId(101L);
            return p;
        });

        VendorPayoutDto result = payoutService.createPayout(request);

        assertNotNull(result);
        assertEquals(101L, result.getPayoutId());
        assertEquals(PayoutStatus.PENDING, result.getStatus());
        assertEquals(0, result.getTotalSales().compareTo(BigDecimal.valueOf(10000.00)));
        assertEquals(0, result.getCommissionAmount().compareTo(BigDecimal.valueOf(1000.00)));
        assertEquals(0, result.getNetAmount().compareTo(BigDecimal.valueOf(8500.00)));
    }

    @Test
    public void testCreatePayoutDuplicateThrowsException() {
        CreatePayoutRequest request = CreatePayoutRequest.builder()
                .vendorId(vendorId)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        when(payoutRepository.existsByVendorIdAndPayoutPeriodStartAndPayoutPeriodEndAndStatusNot(
                eq(vendorId), eq(startDate), eq(endDate), eq(PayoutStatus.CANCELLED)))
                .thenReturn(true);

        assertThrows(DuplicatePayoutException.class, () -> payoutService.createPayout(request));
    }

    @Test
    public void testProcessPayoutValidTransition() {
        VendorPayout payout = VendorPayout.builder()
                .payoutId(200L)
                .vendorId(vendorId)
                .payoutPeriodStart(startDate)
                .payoutPeriodEnd(endDate)
                .totalSales(BigDecimal.valueOf(5000))
                .commissionAmount(BigDecimal.valueOf(500))
                .netAmount(BigDecimal.valueOf(4500))
                .status(PayoutStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        when(payoutRepository.findById(200L)).thenReturn(Optional.of(payout));
        when(payoutRepository.save(any(VendorPayout.class))).thenAnswer(i -> i.getArgument(0));

        ProcessPayoutRequest request = ProcessPayoutRequest.builder()
                .status(PayoutStatus.PROCESSING)
                .transactionRef("TXN-12345")
                .build();

        VendorPayoutDto result = payoutService.processPayout(200L, request);

        assertEquals(PayoutStatus.PROCESSING, result.getStatus());
        assertEquals("TXN-12345", result.getTransactionRef());

        // Process to COMPLETED
        payout.setStatus(PayoutStatus.PROCESSING);
        request.setStatus(PayoutStatus.COMPLETED);
        VendorPayoutDto completedResult = payoutService.processPayout(200L, request);

        assertEquals(PayoutStatus.COMPLETED, completedResult.getStatus());
    }

    @Test
    public void testProcessPayoutInvalidTransitionThrowsException() {
        VendorPayout payout = VendorPayout.builder()
                .payoutId(200L)
                .vendorId(vendorId)
                .status(PayoutStatus.COMPLETED)
                .build();

        when(payoutRepository.findById(200L)).thenReturn(Optional.of(payout));

        ProcessPayoutRequest request = ProcessPayoutRequest.builder()
                .status(PayoutStatus.PENDING)
                .build();

        assertThrows(InvalidPayoutStateException.class, () -> payoutService.processPayout(200L, request));
    }
}
