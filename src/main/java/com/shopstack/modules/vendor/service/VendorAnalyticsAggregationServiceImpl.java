package com.shopstack.modules.vendor.service;

import com.shopstack.modules.order.entity.CommissionLedger;
import com.shopstack.modules.order.entity.Order;
import com.shopstack.modules.order.entity.OrderItem;
import com.shopstack.modules.order.entity.ReturnRequest;
import com.shopstack.modules.order.enums.LedgerTransactionType;
import com.shopstack.modules.order.repository.CommissionLedgerRepository;
import com.shopstack.modules.order.repository.OrderRepository;
import com.shopstack.modules.order.repository.ReturnRequestRepository;
import com.shopstack.modules.order.service.CommissionService;
import com.shopstack.modules.product.entity.Product;
import com.shopstack.modules.product.entity.Review;
import com.shopstack.modules.product.repository.ProductRepository;
import com.shopstack.modules.product.repository.ReviewRepository;
import com.shopstack.modules.user.entity.User;
import com.shopstack.modules.vendor.entity.*;
import com.shopstack.modules.vendor.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VendorAnalyticsAggregationServiceImpl implements VendorAnalyticsAggregationService {

    private final VendorRepository vendorRepository;
    private final OrderRepository orderRepository;
    private final CommissionLedgerRepository commissionLedgerRepository;
    private final ProductRepository productRepository;
    private final ReviewRepository reviewRepository;
    private final ReturnRequestRepository returnRequestRepository;

    private final VendorSalesSummaryRepository salesSummaryRepository;
    private final VendorProductPerformanceRepository productPerformanceRepository;
    private final VendorCustomerInsightsRepository customerInsightsRepository;

    private final CommissionService commissionService;

    @Override
    @Transactional
    public void aggregateAllVendorsForDate(LocalDate summaryDate) {
        log.info("Starting daily analytics aggregation for all vendors for date {}", summaryDate);
        List<Vendor> vendors = vendorRepository.findAll();
        for (Vendor vendor : vendors) {
            try {
                aggregateVendorAnalyticsForDate(vendor.getVendorId(), summaryDate);
            } catch (Exception e) {
                log.error("Failed to aggregate analytics for vendor {} on date {}: {}", vendor.getVendorId(), summaryDate, e.getMessage(), e);
            }
        }
        log.info("Finished daily analytics aggregation for date {}", summaryDate);
    }

    @Override
    @Transactional
    public void aggregateVendorAnalyticsForDate(Long vendorId, LocalDate summaryDate) {
        log.debug("Aggregating vendor analytics for vendorId {} on date {}", vendorId, summaryDate);

        LocalDateTime startOfDay = summaryDate.atStartOfDay();
        LocalDateTime endOfDay = summaryDate.atTime(LocalTime.MAX);

        // 1. Fetch qualifying orders containing products of this vendor created on summaryDate
        List<Order> qualifyingOrders = orderRepository.findQualifyingOrdersByVendorIdAndDateRange(vendorId, startOfDay, endOfDay);

        // Filter order items specifically owned by this vendor
        List<OrderItem> vendorOrderItems = new ArrayList<>();
        Set<UUID> vendorOrderIds = new HashSet<>();

        for (Order order : qualifyingOrders) {
            for (OrderItem item : order.getItems()) {
                Product p = item.getProduct();
                if (p != null && Objects.equals(p.getVendorId(), vendorId)) {
                    vendorOrderItems.add(item);
                    vendorOrderIds.add(order.getId());
                }
            }
        }

        int totalOrders = vendorOrderIds.size();
        int totalUnitsSold = vendorOrderItems.stream()
                .mapToInt(item -> item.getQuantity() != null ? item.getQuantity() : 0)
                .sum();

        BigDecimal grossRevenue = vendorOrderItems.stream()
                .map(item -> BigDecimal.valueOf(item.getPrice() != null ? item.getPrice() : 0.0)
                        .multiply(BigDecimal.valueOf(item.getQuantity() != null ? item.getQuantity() : 0)))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        // Calculate commission deducted from CommissionLedger for this vendor on summaryDate
        List<CommissionLedger> dailyLedger = commissionLedgerRepository.findAllByVendorIdAndRange(vendorId, startOfDay, endOfDay);

        BigDecimal commissionDeducted = dailyLedger.stream()
                .filter(l -> l.getTransactionType() == LedgerTransactionType.COMMISSION)
                .map(CommissionLedger::getCommissionAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        // Fallback: If ledger entries weren't yet generated, calculate from commission rates
        if (dailyLedger.isEmpty() && !vendorOrderItems.isEmpty()) {
            BigDecimal calcCommission = BigDecimal.ZERO;
            for (OrderItem item : vendorOrderItems) {
                Product prod = item.getProduct();
                if (prod != null) {
                    UUID catId = prod.getCategory() != null ? prod.getCategory().getId() : null;
                    BigDecimal rate = commissionService.getApplicableCommissionRate(prod.getId(), catId, vendorId, startOfDay);
                    BigDecimal gross = BigDecimal.valueOf(item.getPrice()).multiply(BigDecimal.valueOf(item.getQuantity()));
                    BigDecimal comm = commissionService.calculateCommission(gross, rate);
                    calcCommission = calcCommission.add(comm);
                }
            }
            commissionDeducted = calcCommission.setScale(2, RoundingMode.HALF_UP);
        }

        // Calculate refunds / reversals amount on summaryDate
        BigDecimal refundsAmount = dailyLedger.stream()
                .filter(l -> l.getTransactionType() == LedgerTransactionType.REFUND_REVERSAL)
                .map(l -> l.getGrossAmount().abs())
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        // If no ledger reversals, check ReturnRequests created on summaryDate
        if (refundsAmount.compareTo(BigDecimal.ZERO) == 0) {
            List<ReturnRequest> returns = returnRequestRepository.findByVendorIdAndCreatedAtBetween(vendorId, startOfDay, endOfDay);
            for (ReturnRequest rr : returns) {
                if ("APPROVED".equalsIgnoreCase(rr.getStatus()) || "PROCESSED".equalsIgnoreCase(rr.getStatus())) {
                    if (rr.getOrder() != null && rr.getOrder().getTotalAmount() != null) {
                        refundsAmount = refundsAmount.add(BigDecimal.valueOf(rr.getOrder().getTotalAmount()));
                    }
                }
            }
            refundsAmount = refundsAmount.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal netPayout = grossRevenue.subtract(commissionDeducted).subtract(refundsAmount);
        if (netPayout.compareTo(BigDecimal.ZERO) < 0) {
            netPayout = BigDecimal.ZERO;
        }
        netPayout = netPayout.setScale(2, RoundingMode.HALF_UP);

        // Save / Upsert VendorSalesSummary
        VendorSalesSummary summary = salesSummaryRepository
                .findByVendorIdAndSummaryDate(vendorId, summaryDate)
                .orElseGet(() -> VendorSalesSummary.builder()
                        .vendorId(vendorId)
                        .summaryDate(summaryDate)
                        .createdAt(LocalDateTime.now())
                        .build());

        summary.setTotalOrders(totalOrders);
        summary.setTotalUnitsSold(totalUnitsSold);
        summary.setGrossRevenue(grossRevenue);
        summary.setCommissionDeducted(commissionDeducted);
        summary.setRefundsAmount(refundsAmount);
        summary.setNetPayout(netPayout);

        salesSummaryRepository.save(summary);

        // 2. Vendor Product Performance Aggregation
        aggregateProductPerformance(vendorId, summaryDate, vendorOrderItems, startOfDay, endOfDay);

        // 3. Vendor Customer Insights Aggregation
        aggregateCustomerInsights(vendorId, summaryDate, qualifyingOrders, startOfDay, grossRevenue, totalOrders);
    }

    private void aggregateProductPerformance(Long vendorId, LocalDate summaryDate, List<OrderItem> vendorOrderItems, LocalDateTime startOfDay, LocalDateTime endOfDay) {
        List<Product> vendorProducts = productRepository.findByVendorId(vendorId);

        // Map order items by productId
        Map<UUID, List<OrderItem>> itemsByProduct = vendorOrderItems.stream()
                .filter(item -> item.getProduct() != null)
                .collect(Collectors.groupingBy(item -> item.getProduct().getId()));

        for (Product product : vendorProducts) {
            UUID productId = product.getId();
            List<OrderItem> prodItems = itemsByProduct.getOrDefault(productId, Collections.emptyList());

            int unitsSold = prodItems.stream().mapToInt(item -> item.getQuantity() != null ? item.getQuantity() : 0).sum();
            BigDecimal revenue = prodItems.stream()
                    .map(item -> BigDecimal.valueOf(item.getPrice() != null ? item.getPrice() : 0.0)
                            .multiply(BigDecimal.valueOf(item.getQuantity() != null ? item.getQuantity() : 0)))
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .setScale(2, RoundingMode.HALF_UP);

            // Calculate average rating from Reviews
            List<Review> reviews = reviewRepository.findByProduct_Id(productId);
            BigDecimal avgRating = BigDecimal.ZERO;
            if (!reviews.isEmpty()) {
                double avg = reviews.stream()
                        .mapToInt(r -> r.getRating() != null ? r.getRating() : 0)
                        .average()
                        .orElse(0.0);
                avgRating = BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP);
            }

            // Return count for this product
            List<ReturnRequest> returns = returnRequestRepository.findByVendorIdAndCreatedAtBetween(vendorId, startOfDay, endOfDay);
            int returnCount = 0;
            for (ReturnRequest rr : returns) {
                if (rr.getOrder() != null) {
                    boolean matchesProduct = rr.getOrder().getItems().stream()
                            .anyMatch(i -> i.getProduct() != null && Objects.equals(i.getProduct().getId(), productId));
                    if (matchesProduct) {
                        returnCount++;
                    }
                }
            }

            // Skip zero records if never recorded before, but if units > 0 or record exists, upsert
            Optional<VendorProductPerformance> existingOpt = productPerformanceRepository
                    .findByVendorIdAndProductIdAndSummaryDate(vendorId, productId, summaryDate);

            if (unitsSold > 0 || returnCount > 0 || existingOpt.isPresent()) {
                VendorProductPerformance perf = existingOpt.orElseGet(() -> VendorProductPerformance.builder()
                        .vendorId(vendorId)
                        .productId(productId)
                        .summaryDate(summaryDate)
                        .views(0)
                        .build());

                perf.setUnitsSold(unitsSold);
                perf.setRevenue(revenue);
                perf.setAvgRating(avgRating);
                perf.setReturnCount(returnCount);

                productPerformanceRepository.save(perf);
            }
        }
    }

    private void aggregateCustomerInsights(Long vendorId, LocalDate summaryDate, List<Order> qualifyingOrders, LocalDateTime startOfDay, BigDecimal grossRevenue, int totalOrders) {
        Set<User> customersOnDate = qualifyingOrders.stream()
                .map(Order::getUser)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        int newCustomers = 0;
        int repeatCustomers = 0;

        for (User user : customersOnDate) {
            long priorOrdersCount = orderRepository.countQualifyingOrdersByVendorAndUserBefore(vendorId, user.getId(), startOfDay);
            if (priorOrdersCount > 0) {
                repeatCustomers++;
            } else {
                newCustomers++;
            }
        }

        BigDecimal avgOrderValue = totalOrders > 0
                ? grossRevenue.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        VendorCustomerInsights insights = customerInsightsRepository
                .findByVendorIdAndSummaryDate(vendorId, summaryDate)
                .orElseGet(() -> VendorCustomerInsights.builder()
                        .vendorId(vendorId)
                        .summaryDate(summaryDate)
                        .createdAt(LocalDateTime.now())
                        .build());

        insights.setNewCustomers(newCustomers);
        insights.setRepeatCustomers(repeatCustomers);
        insights.setAvgOrderValue(avgOrderValue);

        customerInsightsRepository.save(insights);
    }
}
