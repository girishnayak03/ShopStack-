package com.shopstack.modules.vendor.service;

import com.shopstack.common.exception.ResourceNotFoundException;
import com.shopstack.modules.product.entity.Product;
import com.shopstack.modules.product.repository.ProductRepository;
import com.shopstack.modules.vendor.dto.responses.VendorAnalyticsAggregateResponse;
import com.shopstack.modules.vendor.dto.responses.VendorCustomerInsightsDto;
import com.shopstack.modules.vendor.dto.responses.VendorProductPerformanceDto;
import com.shopstack.modules.vendor.dto.responses.VendorSalesSummaryDto;
import com.shopstack.modules.vendor.entity.VendorCustomerInsights;
import com.shopstack.modules.vendor.entity.VendorProductPerformance;
import com.shopstack.modules.vendor.entity.VendorSalesSummary;
import com.shopstack.modules.vendor.repository.VendorCustomerInsightsRepository;
import com.shopstack.modules.vendor.repository.VendorProductPerformanceRepository;
import com.shopstack.modules.vendor.repository.VendorRepository;
import com.shopstack.modules.vendor.repository.VendorSalesSummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class VendorAnalyticsServiceImpl implements VendorAnalyticsService {

    private final VendorRepository vendorRepository;
    private final VendorSalesSummaryRepository salesSummaryRepository;
    private final VendorProductPerformanceRepository productPerformanceRepository;
    private final VendorCustomerInsightsRepository customerInsightsRepository;
    private final ProductRepository productRepository;

    @Override
    public VendorAnalyticsAggregateResponse getSalesSummary(Long vendorId, LocalDate startDate, LocalDate endDate) {
        verifyVendorExists(vendorId);

        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<VendorSalesSummary> dailyList = salesSummaryRepository
                .findByVendorIdAndSummaryDateBetweenOrderBySummaryDateAsc(vendorId, start, end);

        int totalOrders = 0;
        int totalUnitsSold = 0;
        BigDecimal grossRevenue = BigDecimal.ZERO;
        BigDecimal commissionDeducted = BigDecimal.ZERO;
        BigDecimal refundsAmount = BigDecimal.ZERO;
        BigDecimal netPayout = BigDecimal.ZERO;

        List<VendorSalesSummaryDto> dailyDtos = new ArrayList<>();

        for (VendorSalesSummary summary : dailyList) {
            totalOrders += summary.getTotalOrders();
            totalUnitsSold += summary.getTotalUnitsSold();
            grossRevenue = grossRevenue.add(summary.getGrossRevenue());
            commissionDeducted = commissionDeducted.add(summary.getCommissionDeducted());
            refundsAmount = refundsAmount.add(summary.getRefundsAmount());
            netPayout = netPayout.add(summary.getNetPayout());

            dailyDtos.add(VendorSalesSummaryDto.builder()
                    .summaryId(summary.getSummaryId())
                    .vendorId(summary.getVendorId())
                    .summaryDate(summary.getSummaryDate())
                    .totalOrders(summary.getTotalOrders())
                    .totalUnitsSold(summary.getTotalUnitsSold())
                    .grossRevenue(summary.getGrossRevenue())
                    .commissionDeducted(summary.getCommissionDeducted())
                    .netPayout(summary.getNetPayout())
                    .refundsAmount(summary.getRefundsAmount())
                    .createdAt(summary.getCreatedAt())
                    .build());
        }

        return VendorAnalyticsAggregateResponse.builder()
                .vendorId(vendorId)
                .startDate(start)
                .endDate(end)
                .totalOrders(totalOrders)
                .totalUnitsSold(totalUnitsSold)
                .grossRevenue(grossRevenue)
                .commissionDeducted(commissionDeducted)
                .refundsAmount(refundsAmount)
                .netPayout(netPayout)
                .dailySummaries(dailyDtos)
                .build();
    }

    @Override
    public Page<VendorProductPerformanceDto> getProductPerformance(Long vendorId, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        verifyVendorExists(vendorId);

        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        Page<VendorProductPerformance> page = productPerformanceRepository
                .findByVendorIdAndSummaryDateBetween(vendorId, start, end, pageable);

        Map<UUID, String> productNames = getProductNameMap(vendorId);

        return page.map(p -> VendorProductPerformanceDto.builder()
                .performanceId(p.getPerformanceId())
                .vendorId(p.getVendorId())
                .productId(p.getProductId())
                .productName(productNames.getOrDefault(p.getProductId(), "Product #" + p.getProductId().toString().substring(0, 8)))
                .summaryDate(p.getSummaryDate())
                .unitsSold(p.getUnitsSold())
                .revenue(p.getRevenue())
                .views(p.getViews())
                .avgRating(p.getAvgRating())
                .returnCount(p.getReturnCount())
                .build());
    }

    @Override
    public List<VendorProductPerformanceDto> getTopProductsPerformance(Long vendorId, LocalDate startDate, LocalDate endDate) {
        verifyVendorExists(vendorId);

        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<Object[]> rows = productPerformanceRepository.aggregateProductPerformanceByVendorAndRange(vendorId, start, end);
        Map<UUID, String> productNames = getProductNameMap(vendorId);

        List<VendorProductPerformanceDto> dtos = new ArrayList<>();
        for (Object[] row : rows) {
            UUID productId = (UUID) row[0];
            Number totalUnitsSold = (Number) row[1];
            BigDecimal totalRevenue = (BigDecimal) row[2];
            Number totalViews = (Number) row[3];
            Number avgRatingNum = (Number) row[4];
            Number totalReturns = (Number) row[5];

            dtos.add(VendorProductPerformanceDto.builder()
                    .vendorId(vendorId)
                    .productId(productId)
                    .productName(productNames.getOrDefault(productId, "Product #" + productId.toString().substring(0, 8)))
                    .summaryDate(end)
                    .unitsSold(totalUnitsSold != null ? totalUnitsSold.intValue() : 0)
                    .revenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                    .views(totalViews != null ? totalViews.intValue() : 0)
                    .avgRating(avgRatingNum != null ? BigDecimal.valueOf(avgRatingNum.doubleValue()).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO)
                    .returnCount(totalReturns != null ? totalReturns.intValue() : 0)
                    .build());
        }

        return dtos;
    }

    @Override
    public VendorCustomerInsightsDto getCustomerInsights(Long vendorId, LocalDate startDate, LocalDate endDate) {
        verifyVendorExists(vendorId);

        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<VendorCustomerInsights> list = customerInsightsRepository
                .findByVendorIdAndSummaryDateBetweenOrderBySummaryDateAsc(vendorId, start, end);

        int totalNew = 0;
        int totalRepeat = 0;
        BigDecimal sumAov = BigDecimal.ZERO;

        for (VendorCustomerInsights ci : list) {
            totalNew += ci.getNewCustomers();
            totalRepeat += ci.getRepeatCustomers();
            sumAov = sumAov.add(ci.getAvgOrderValue());
        }

        BigDecimal avgOrderValue = !list.isEmpty()
                ? sumAov.divide(BigDecimal.valueOf(list.size()), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return VendorCustomerInsightsDto.builder()
                .vendorId(vendorId)
                .summaryDate(end)
                .newCustomers(totalNew)
                .repeatCustomers(totalRepeat)
                .avgOrderValue(avgOrderValue)
                .build();
    }

    private void verifyVendorExists(Long vendorId) {
        if (!vendorRepository.existsById(vendorId)) {
            throw new ResourceNotFoundException("Vendor not found with id: " + vendorId);
        }
    }

    private Map<UUID, String> getProductNameMap(Long vendorId) {
        List<Product> products = productRepository.findByVendorId(vendorId);
        return products.stream().collect(Collectors.toMap(Product::getId, Product::getProductName, (a, b) -> a));
    }
}
