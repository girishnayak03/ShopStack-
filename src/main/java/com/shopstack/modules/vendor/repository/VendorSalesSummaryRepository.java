package com.shopstack.modules.vendor.repository;

import com.shopstack.modules.vendor.entity.VendorSalesSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface VendorSalesSummaryRepository extends JpaRepository<VendorSalesSummary, Long> {

    Optional<VendorSalesSummary> findByVendorIdAndSummaryDate(Long vendorId, LocalDate summaryDate);

    List<VendorSalesSummary> findByVendorIdAndSummaryDateBetweenOrderBySummaryDateAsc(
            Long vendorId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT s FROM VendorSalesSummary s WHERE s.summaryDate BETWEEN :startDate AND :endDate ORDER BY s.summaryDate ASC")
    List<VendorSalesSummary> findAllBySummaryDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
