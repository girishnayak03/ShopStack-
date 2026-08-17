package com.shopstack.modules.vendor.service;

import com.shopstack.modules.vendor.dto.requests.BackfillAnalyticsRequest;
import com.shopstack.modules.vendor.dto.responses.BackfillAnalyticsResponse;
import com.shopstack.modules.vendor.dto.responses.VendorAnalyticsAggregateResponse;
import com.shopstack.modules.vendor.entity.VendorSalesSummary;
import com.shopstack.modules.vendor.repository.VendorSalesSummaryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
public class PersistentAnalyticsIntegrationTest {

    @Autowired
    private VendorSalesSummaryRepository salesSummaryRepository;

    @Autowired
    private com.shopstack.modules.vendor.repository.VendorRepository vendorRepository;

    @Autowired
    private com.shopstack.modules.user.repository.UserRepository userRepository;

    @Autowired
    private com.shopstack.modules.user.repository.RoleRepository roleRepository;

    @Autowired
    private VendorAnalyticsAggregationService aggregationService;

    @Autowired
    private VendorAnalyticsBackfillService backfillService;

    @Autowired
    private VendorAnalyticsService analyticsService;

    @Test
    @Transactional
    public void testPersistentAnalyticsAndBackfillWorkflow() {
        // Create dummy user for test vendor
        com.shopstack.modules.user.entity.Role role = roleRepository.findByName("ROLE_VENDOR")
                .orElseGet(() -> roleRepository.findAll().get(0));

        com.shopstack.modules.user.entity.User dummyUser = new com.shopstack.modules.user.entity.User();
        dummyUser.setFirstName("Test");
        dummyUser.setLastName("VendorUser");
        dummyUser.setEmail("testuser_" + UUID.randomUUID() + "@shopstack.com");
        dummyUser.setPassword("password");
        dummyUser.setPhone(Math.abs(UUID.randomUUID().getMostSignificantBits() % 8999999999L) + 1000000000L);
        dummyUser.setGender(com.shopstack.common.enums.Gender.MALE);
        dummyUser.setStatus(com.shopstack.common.enums.AccountStatus.ACTIVE);
        dummyUser.setRole(role);
        dummyUser = userRepository.save(dummyUser);

        // Save test vendor entity
        com.shopstack.modules.vendor.entity.Vendor vendor = com.shopstack.modules.vendor.entity.Vendor.builder()
                .businessName("Test Integration Merchant")
                .businessEmail("testmerchant_" + UUID.randomUUID() + "@shopstack.com")
                .businessPhone("9998887776")
                .status(com.shopstack.common.enums.VendorStatus.APPROVED)
                .user(dummyUser)
                .build();
        vendor = vendorRepository.save(vendor);



        Long testVendorId = vendor.getVendorId();
        LocalDate testDate = LocalDate.of(2026, 8, 10);

        // 1. Manually insert summary row
        VendorSalesSummary summary = VendorSalesSummary.builder()
                .vendorId(testVendorId)
                .summaryDate(testDate)
                .totalOrders(5)
                .totalUnitsSold(10)
                .grossRevenue(BigDecimal.valueOf(2500.00))
                .commissionDeducted(BigDecimal.valueOf(250.00))
                .refundsAmount(BigDecimal.valueOf(0.00))
                .netPayout(BigDecimal.valueOf(2250.00))
                .createdAt(LocalDateTime.now())
                .build();

        salesSummaryRepository.save(summary);


        // 2. Verify summary row persists in database
        Optional<VendorSalesSummary> fetched = salesSummaryRepository.findByVendorIdAndSummaryDate(testVendorId, testDate);
        assertTrue(fetched.isPresent());
        assertEquals(5, fetched.get().getTotalOrders());
        assertEquals(0, fetched.get().getGrossRevenue().compareTo(BigDecimal.valueOf(2500.00)));

        // 3. Test backfill execution over date range
        BackfillAnalyticsRequest backfillRequest = BackfillAnalyticsRequest.builder()
                .vendorId(testVendorId)
                .startDate(testDate.minusDays(2))
                .endDate(testDate)
                .build();

        BackfillAnalyticsResponse backfillResponse = backfillService.backfillAnalytics(backfillRequest);
        assertTrue(backfillResponse.isSuccess());
        assertEquals(3, backfillResponse.getProcessedDays());

        // 4. Verify API queries persistent summary table directly
        VendorAnalyticsAggregateResponse apiResponse = analyticsService.getSalesSummary(testVendorId, testDate.minusDays(2), testDate);
        assertNotNull(apiResponse);
        assertEquals(testVendorId, apiResponse.getVendorId());
        assertFalse(apiResponse.getDailySummaries().isEmpty());
    }
}
