package com.tpa.claims.controller;

import com.tpa.claims.auth.CarrierContextService;
import com.tpa.claims.dto.CarrierDashboardResponse;
import com.tpa.claims.model.Carrier;
import com.tpa.claims.model.Claim;
import com.tpa.claims.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/carrier/dashboard")
@RequiredArgsConstructor
public class CarrierDashboardController {

    private final CarrierContextService carrierContextService;
    private final ClaimRepository claimRepository;

    @GetMapping
    public ResponseEntity<CarrierDashboardResponse> getDashboard() {
        Carrier carrier = carrierContextService.requireCarrier();
        long total = claimRepository.countByCarrier_Id(carrier.getId());
        long pending = claimRepository.countByCarrier_IdAndStatus(carrier.getId(), Claim.ClaimStatus.CARRIER_PENDING);
        long approved = claimRepository.countByCarrier_IdAndStatus(carrier.getId(), Claim.ClaimStatus.CARRIER_APPROVED);
        long rejected = claimRepository.countByCarrier_IdAndStatus(carrier.getId(), Claim.ClaimStatus.CARRIER_REJECTED);

        return ResponseEntity.ok(CarrierDashboardResponse.builder()
                .totalClaims(total)
                .pending(pending)
                .approved(approved)
                .rejected(rejected)
                .build());
    }
}

