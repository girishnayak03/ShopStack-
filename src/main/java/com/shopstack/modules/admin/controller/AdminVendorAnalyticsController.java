package com.shopstack.modules.admin.controller;

import com.shopstack.modules.vendor.dto.requests.BackfillAnalyticsRequest;
import com.shopstack.modules.vendor.dto.responses.BackfillAnalyticsResponse;
import com.shopstack.modules.vendor.service.VendorAnalyticsBackfillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminVendorAnalyticsController {

    private final VendorAnalyticsBackfillService backfillService;

    @PostMapping({"/api/admin/vendor-analytics/backfill", "/api/v1/admin/vendor-analytics/backfill"})
    public ResponseEntity<BackfillAnalyticsResponse> backfillVendorAnalytics(
            @Valid @RequestBody BackfillAnalyticsRequest request) {

        BackfillAnalyticsResponse response = backfillService.backfillAnalytics(request);
        return ResponseEntity.ok(response);
    }
}
