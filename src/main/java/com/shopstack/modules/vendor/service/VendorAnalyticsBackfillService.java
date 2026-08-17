package com.shopstack.modules.vendor.service;

import com.shopstack.modules.vendor.dto.requests.BackfillAnalyticsRequest;
import com.shopstack.modules.vendor.dto.responses.BackfillAnalyticsResponse;

public interface VendorAnalyticsBackfillService {

    BackfillAnalyticsResponse backfillAnalytics(BackfillAnalyticsRequest request);
}
