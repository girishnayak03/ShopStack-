package com.shopstack.modules.vendor.scheduler;

import com.shopstack.modules.vendor.service.VendorAnalyticsAggregationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class VendorAnalyticsAggregationJob {

    private final VendorAnalyticsAggregationService aggregationService;

    /**
     * Daily background scheduled job running at 01:00 AM.
     * Aggregates yesterday's transactional data and updates today's persistent records.
     */
    @Scheduled(cron = "0 0 1 * * ?")
    public void runDailyAnalyticsAggregation() {
        log.info("Scheduled VendorAnalyticsAggregationJob triggered.");
        LocalDate today = LocalDate.now();
        aggregationService.aggregateAllVendorsForDate(today.minusDays(1));
        aggregationService.aggregateAllVendorsForDate(today);
        log.info("Scheduled VendorAnalyticsAggregationJob finished successfully.");
    }
}
