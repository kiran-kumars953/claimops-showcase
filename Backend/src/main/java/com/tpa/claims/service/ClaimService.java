package com.tpa.claims.service;

import com.tpa.claims.dto.ClaimRequest;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.ClaimConfirmationRequest;
import com.tpa.claims.dto.TpaCallbackRequest;
import com.tpa.claims.dto.ManualReviewDecisionRequest;
import java.util.List;

public interface ClaimService {
    ClaimResponse createClaim(ClaimRequest request);

    ClaimResponse confirmClaim(Long id, ClaimConfirmationRequest request);

    ClaimResponse applyManualReviewDecision(Long id, ManualReviewDecisionRequest request);

    List<ClaimResponse> getAllClaims();

    com.tpa.claims.dto.PaginatedResponse<ClaimResponse> getClaims(int page, int size, String status, String searchTerm);

    ClaimResponse getClaimById(Long id);

    byte[] exportClaim(Long id);

    void processCarrierCallback(TpaCallbackRequest request);

    ClaimResponse submitToCarrier(Long id);
}
