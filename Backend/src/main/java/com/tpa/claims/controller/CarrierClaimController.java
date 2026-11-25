package com.tpa.claims.controller;

import com.tpa.claims.auth.CarrierContextService;
import com.tpa.claims.dto.CarrierDecisionRequest;
import com.tpa.claims.dto.AuditLogDto;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.PaginatedResponse;
import com.tpa.claims.model.Carrier;
import com.tpa.claims.model.Claim;
import com.tpa.claims.model.AuditLog;
import com.tpa.claims.repository.AuditLogRepository;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.claims.service.ClaimResponseMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/carrier/claims")
@RequiredArgsConstructor
public class CarrierClaimController {

    private final CarrierContextService carrierContextService;
    private final ClaimRepository claimRepository;
    private final ClaimResponseMapper claimResponseMapper;
    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<PaginatedResponse<ClaimResponse>> listClaims(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String searchTerm
    ) {
        Carrier carrier = carrierContextService.requireCarrier();
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("updatedAt").descending());

        Page<Claim> claimPage;
        if (searchTerm != null && !searchTerm.isBlank()) {
            claimPage = claimRepository.searchByClaimForCarrier(carrier.getId(), searchTerm.trim(), pageable);
        } else if (status != null && !status.isBlank() && !"All".equalsIgnoreCase(status)) {
            Claim.ClaimStatus enumStatus = Claim.ClaimStatus.valueOf(status.toUpperCase().trim());
            claimPage = claimRepository.findByCarrier_IdAndStatus(carrier.getId(), enumStatus, pageable);
        } else {
            claimPage = claimRepository.findByCarrier_Id(carrier.getId(), pageable);
        }

        List<ClaimResponse> data = claimPage.getContent().stream()
                .map(claim -> claimResponseMapper.toResponse(claim, false))
                .collect(Collectors.toList());

        return ResponseEntity.ok(PaginatedResponse.<ClaimResponse>builder()
                .data(data)
                .total(claimPage.getTotalElements())
                .page(page)
                .size(size)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClaimResponse> getClaim(@PathVariable Long id) {
        Carrier carrier = carrierContextService.requireCarrier();
        Claim claim = claimRepository.findById(id).orElseThrow(() -> new RuntimeException("Claim not found"));
        if (claim.getCarrier() == null || !carrier.getId().equals(claim.getCarrier().getId())) {
            throw new RuntimeException("Forbidden");
        }
        return ResponseEntity.ok(claimResponseMapper.toResponse(claim, true));
    }

    @PostMapping("/{id}/decision")
    public ResponseEntity<ClaimResponse> carrierDecision(@PathVariable Long id, @RequestBody CarrierDecisionRequest request) {
        Carrier carrier = carrierContextService.requireCarrier();
        Claim claim = claimRepository.findById(id).orElseThrow(() -> new RuntimeException("Claim not found"));
        if (claim.getCarrier() == null || !carrier.getId().equals(claim.getCarrier().getId())) {
            throw new RuntimeException("Forbidden");
        }

        if (claim.getStatus() != Claim.ClaimStatus.CARRIER_PENDING && claim.getStatus() != Claim.ClaimStatus.SUBMITTED_TO_CARRIER) {
            throw new RuntimeException("Claim is not pending carrier decision.");
        }

        String decision = request == null ? null : request.getDecision();
        if (decision == null) {
            throw new RuntimeException("decision is required");
        }

        if ("APPROVE".equalsIgnoreCase(decision)) {
            claim.setStatus(Claim.ClaimStatus.CARRIER_APPROVED);
            claim.setCarrierDecision("APPROVED");
            claim.setCarrierDecisionDate(LocalDateTime.now());
            claim.setCarrierDecisionReason(normalizeReason(request == null ? null : request.getReason(), "Approved by carrier."));
            if (request.getApprovedAmount() != null) {
                claim.setRecommendedPayableAmount(request.getApprovedAmount());
            }
        } else if ("REJECT".equalsIgnoreCase(decision)) {
            claim.setStatus(Claim.ClaimStatus.CARRIER_REJECTED);
            claim.setCarrierDecision("REJECTED");
            claim.setCarrierDecisionDate(LocalDateTime.now());
            String reason = normalizeReason(request == null ? null : request.getReason(), "Rejected by carrier.");
            claim.setCarrierDecisionReason(reason);
            // Keep legacy behavior for existing UI exports that read rejectionReason.
            claim.setRejectionReason(reason);
        } else {
            throw new RuntimeException("Unsupported decision: " + decision);
        }

        claimRepository.save(claim);
        createAuditLog(claim,
                "CARRIER_DECISION",
                "CARRIER",
                "Decision: " + claim.getCarrierDecision() + ". " + Optional.ofNullable(claim.getCarrierDecisionReason()).orElse(""));
        return ResponseEntity.ok(claimResponseMapper.toResponse(claim, true));
    }

    @GetMapping("/{id}/audit")
    public ResponseEntity<List<AuditLogDto>> getAudit(@PathVariable Long id) {
        Carrier carrier = carrierContextService.requireCarrier();
        Claim claim = claimRepository.findById(id).orElseThrow(() -> new RuntimeException("Claim not found"));
        if (claim.getCarrier() == null || !carrier.getId().equals(claim.getCarrier().getId())) {
            throw new RuntimeException("Forbidden");
        }

        List<AuditLogDto> logs = auditLogRepository.findByClaim_IdOrderByCreatedAtAsc(id).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(logs);
    }

    private AuditLogDto toDto(AuditLog log) {
        return AuditLogDto.builder()
                .id(log.getId())
                .action(log.getAction())
                .actionType(log.getActionType())
                .message(log.getNewValue())
                .createdAt(log.getCreatedAt())
                .actorUsername(log.getUser() == null ? null : log.getUser().getUsername())
                .build();
    }

    private void createAuditLog(Claim claim, String action, String actionType, String message) {
        auditLogRepository.save(AuditLog.builder()
                .claim(claim)
                .action(action)
                .actionType(actionType)
                .newValue(message)
                .build());
    }

    private String normalizeReason(String reason, String fallback) {
        if (reason == null) {
            return fallback;
        }
        String trimmed = reason.trim();
        return trimmed.isEmpty() ? fallback : trimmed;
    }
}
