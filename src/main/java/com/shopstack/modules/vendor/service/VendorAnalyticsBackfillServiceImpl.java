package com.shopstack.modules.vendor.service;

import com.shopstack.common.exception.BadRequestException;
import com.shopstack.modules.vendor.dto.requests.BackfillAnalyticsRequest;
import com.shopstack.modules.vendor.dto.responses.BackfillAnalyticsResponse;
import com.shopstack.modules.vendor.entity.Vendor;
import com.shopstack.modules.vendor.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class VendorAnalyticsBackfillServiceImpl implements VendorAnalyticsBackfillService {

    private final VendorAnalyticsAggregationService aggregationService;
    private final VendorRepository vendorRepository;

    @Override
    public BackfillAnalyticsResponse backfillAnalytics(BackfillAnalyticsRequest request) {
        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new BadRequestException("startDate and endDate are required");
        }
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new BadRequestException("startDate cannot be after endDate");
        }

        LocalDate current = request.getStartDate();
        LocalDate end = request.getEndDate();

        int processedDays = 0;
        int processedVendorsCount;
        int recordsUpdated = 0;

        if (request.getVendorId() != null) {
            processedVendorsCount = 1;
            while (!current.isAfter(end)) {
                aggregationService.aggregateVendorAnalyticsForDate(request.getVendorId(), current);
                recordsUpdated++;
                processedDays++;
                current = current.plusDays(1);
            }
        } else {
            List<Vendor> vendors = vendorRepository.findAll();
            processedVendorsCount = vendors.size();

            while (!current.isAfter(end)) {
                aggregationService.aggregateAllVendorsForDate(current);
                recordsUpdated += processedVendorsCount;
                processedDays++;
                current = current.plusDays(1);
            }
        }

        log.info("Backfill completed for period {} to {}. Days: {}, Vendors: {}, Records: {}",
                request.getStartDate(), request.getEndDate(), processedDays, processedVendorsCount, recordsUpdated);

        return BackfillAnalyticsResponse.builder()
                .success(true)
                .message("Successfully backfilled persistent vendor analytics for the specified range")
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .processedDays(processedDays)
                .processedVendors(processedVendorsCount)
                .recordsUpdated(recordsUpdated)
                .build();
    }
}
