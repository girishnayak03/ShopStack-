package com.shopstack.modules.vendor.service;

import java.time.LocalDate;

public interface VendorAnalyticsAggregationService {

    /**
     * Aggregates and persists daily sales summary, product performance,
     * and customer insights for a single vendor on a specific date.
     */
    void aggregateVendorAnalyticsForDate(Long vendorId, LocalDate summaryDate);

    /**
     * Aggregates and persists daily analytics for all registered vendors on a specific date.
     */
    void aggregateAllVendorsForDate(LocalDate summaryDate);
}
