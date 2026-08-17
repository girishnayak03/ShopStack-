package com.shopstack.modules.vendor.service;

import com.shopstack.modules.vendor.dto.responses.VendorAnalyticsAggregateResponse;
import com.shopstack.modules.vendor.dto.responses.VendorCustomerInsightsDto;
import com.shopstack.modules.vendor.dto.responses.VendorProductPerformanceDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface VendorAnalyticsService {

    VendorAnalyticsAggregateResponse getSalesSummary(Long vendorId, LocalDate startDate, LocalDate endDate);

    Page<VendorProductPerformanceDto> getProductPerformance(Long vendorId, LocalDate startDate, LocalDate endDate, Pageable pageable);

    List<VendorProductPerformanceDto> getTopProductsPerformance(Long vendorId, LocalDate startDate, LocalDate endDate);

    VendorCustomerInsightsDto getCustomerInsights(Long vendorId, LocalDate startDate, LocalDate endDate);
}
