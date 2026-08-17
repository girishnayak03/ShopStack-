package com.shopstack.modules.vendor.controller;

import com.shopstack.common.security.SecurityUtil;
import com.shopstack.modules.vendor.dto.responses.VendorAnalyticsAggregateResponse;
import com.shopstack.modules.vendor.dto.responses.VendorCustomerInsightsDto;
import com.shopstack.modules.vendor.dto.responses.VendorProductPerformanceDto;
import com.shopstack.modules.vendor.entity.Vendor;
import com.shopstack.modules.vendor.service.VendorAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/vendors")
@RequiredArgsConstructor
public class VendorAnalyticsController {

    private final VendorAnalyticsService analyticsService;
    private final SecurityUtil securityUtil;

    // ---- Vendor Self Analytics ----

    @GetMapping("/me/analytics/sales")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<VendorAnalyticsAggregateResponse> getMySalesSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        Vendor currentVendor = securityUtil.getCurrentVendor();
        return ResponseEntity.ok(analyticsService.getSalesSummary(currentVendor.getVendorId(), startDate, endDate));
    }

    @GetMapping("/me/analytics/products")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<Page<VendorProductPerformanceDto>> getMyProductPerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {

        Vendor currentVendor = securityUtil.getCurrentVendor();
        return ResponseEntity.ok(analyticsService.getProductPerformance(currentVendor.getVendorId(), startDate, endDate, pageable));
    }

    @GetMapping("/me/analytics/top-products")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<List<VendorProductPerformanceDto>> getMyTopProducts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        Vendor currentVendor = securityUtil.getCurrentVendor();
        return ResponseEntity.ok(analyticsService.getTopProductsPerformance(currentVendor.getVendorId(), startDate, endDate));
    }

    @GetMapping("/me/analytics/customers")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<VendorCustomerInsightsDto> getMyCustomerInsights(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        Vendor currentVendor = securityUtil.getCurrentVendor();
        return ResponseEntity.ok(analyticsService.getCustomerInsights(currentVendor.getVendorId(), startDate, endDate));
    }

    // ---- Vendor / Admin Path Specific Analytics ----

    @GetMapping("/{vendorId}/analytics/sales")
    @PreAuthorize("hasAnyRole('VENDOR', 'ADMIN')")
    public ResponseEntity<VendorAnalyticsAggregateResponse> getSalesSummary(
            @PathVariable Long vendorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        verifyVendorAccess(vendorId);
        return ResponseEntity.ok(analyticsService.getSalesSummary(vendorId, startDate, endDate));
    }

    @GetMapping("/{vendorId}/analytics/products")
    @PreAuthorize("hasAnyRole('VENDOR', 'ADMIN')")
    public ResponseEntity<Page<VendorProductPerformanceDto>> getProductPerformance(
            @PathVariable Long vendorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {

        verifyVendorAccess(vendorId);
        return ResponseEntity.ok(analyticsService.getProductPerformance(vendorId, startDate, endDate, pageable));
    }

    @GetMapping("/{vendorId}/analytics/top-products")
    @PreAuthorize("hasAnyRole('VENDOR', 'ADMIN')")
    public ResponseEntity<List<VendorProductPerformanceDto>> getTopProducts(
            @PathVariable Long vendorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        verifyVendorAccess(vendorId);
        return ResponseEntity.ok(analyticsService.getTopProductsPerformance(vendorId, startDate, endDate));
    }

    @GetMapping("/{vendorId}/analytics/customers")
    @PreAuthorize("hasAnyRole('VENDOR', 'ADMIN')")
    public ResponseEntity<VendorCustomerInsightsDto> getCustomerInsights(
            @PathVariable Long vendorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        verifyVendorAccess(vendorId);
        return ResponseEntity.ok(analyticsService.getCustomerInsights(vendorId, startDate, endDate));
    }

    private void verifyVendorAccess(Long vendorId) {
        if (!securityUtil.isCurrentUserAdmin()) {
            Vendor vendor = securityUtil.getCurrentVendor();
            if (!Objects.equals(vendor.getVendorId(), vendorId)) {
                throw new com.shopstack.common.exception.ForbiddenException("Access denied. Vendors can only view their own analytics.");
            }
        }
    }
}
