package com.shopstack.modules.vendor.repository;

import com.shopstack.modules.vendor.entity.VendorProductPerformance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VendorProductPerformanceRepository extends JpaRepository<VendorProductPerformance, Long> {

    Optional<VendorProductPerformance> findByVendorIdAndProductIdAndSummaryDate(
            Long vendorId, UUID productId, LocalDate summaryDate);

    List<VendorProductPerformance> findByVendorIdAndSummaryDateBetween(
            Long vendorId, LocalDate startDate, LocalDate endDate);

    Page<VendorProductPerformance> findByVendorIdAndSummaryDateBetween(
            Long vendorId, LocalDate startDate, LocalDate endDate, Pageable pageable);

    @Query("SELECT p.productId AS productId, " +
           "SUM(p.unitsSold) AS totalUnitsSold, " +
           "SUM(p.revenue) AS totalRevenue, " +
           "SUM(p.views) AS totalViews, " +
           "AVG(p.avgRating) AS avgRating, " +
           "SUM(p.returnCount) AS totalReturnCount " +
           "FROM VendorProductPerformance p " +
           "WHERE p.vendorId = :vendorId AND p.summaryDate BETWEEN :startDate AND :endDate " +
           "GROUP BY p.productId " +
           "ORDER BY totalRevenue DESC")
    List<Object[]> aggregateProductPerformanceByVendorAndRange(
            @Param("vendorId") Long vendorId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
