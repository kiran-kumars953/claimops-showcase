package com.tpa.claims.controller;

import com.tpa.claims.dto.TpaDashboardResponse;
import com.tpa.claims.model.Claim;
import com.tpa.claims.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tpa/dashboard")
@RequiredArgsConstructor
public class TpaDashboardController {

    private final ClaimRepository claimRepository;

    @GetMapping
    public ResponseEntity<TpaDashboardResponse> getDashboard() {
        long total = claimRepository.count();
        long carrierApproved = claimRepository.countByStatusIn(List.of(Claim.ClaimStatus.CARRIER_APPROVED, Claim.ClaimStatus.CLOSED));
        long carrierRejected = claimRepository.countByStatus(Claim.ClaimStatus.CARRIER_REJECTED);
        long manualReview = claimRepository.countByStatusIn(List.of(Claim.ClaimStatus.MANUAL_REVIEW, Claim.ClaimStatus.TPA_MANUAL_REVIEW));
        long rejectedTotal = claimRepository.countByStatusIn(List.of(Claim.ClaimStatus.REJECTED, Claim.ClaimStatus.CARRIER_REJECTED));

        return ResponseEntity.ok(TpaDashboardResponse.builder()
                .totalClaims(total)
                .carrierApproved(carrierApproved)
                .carrierRejected(carrierRejected)
                .manualReview(manualReview)
                .rejectedTotal(rejectedTotal)
                .build());
    }
}

