package com.shopstack.modules.vendor.repository;

import com.shopstack.modules.vendor.entity.VendorCustomerInsights;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface VendorCustomerInsightsRepository extends JpaRepository<VendorCustomerInsights, Long> {

    Optional<VendorCustomerInsights> findByVendorIdAndSummaryDate(Long vendorId, LocalDate summaryDate);

    List<VendorCustomerInsights> findByVendorIdAndSummaryDateBetweenOrderBySummaryDateAsc(
            Long vendorId, LocalDate startDate, LocalDate endDate);
}
