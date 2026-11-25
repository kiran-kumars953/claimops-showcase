package com.tpa.claims.controller;

import com.tpa.claims.dto.ClaimConfirmationRequest;
import com.tpa.claims.dto.ClaimRequest;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.AuditLogDto;
import com.tpa.claims.dto.ManualReviewDecisionRequest;
import com.tpa.claims.dto.PaginatedResponse;
import com.tpa.claims.model.AuditLog;
import com.tpa.claims.repository.AuditLogRepository;
import com.tpa.claims.service.ClaimService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tpa/claims")
@RequiredArgsConstructor
public class TpaClaimController {

    private final ClaimService claimService;
    private final AuditLogRepository auditLogRepository;

    @PostMapping
    public ResponseEntity<ClaimResponse> createClaim(@RequestBody ClaimRequest request) {
        return ResponseEntity.ok(claimService.createClaim(request));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ClaimResponse> confirmClaim(@PathVariable Long id, @RequestBody ClaimConfirmationRequest request) {
        return ResponseEntity.ok(claimService.confirmClaim(id, request));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ClaimResponse> submitToCarrier(@PathVariable Long id) {
        return ResponseEntity.ok(claimService.submitToCarrier(id));
    }

    @PostMapping("/{id}/manual-review/decision")
    public ResponseEntity<ClaimResponse> applyManualReviewDecision(@PathVariable Long id,
                                                                   @RequestBody ManualReviewDecisionRequest request) {
        return ResponseEntity.ok(claimService.applyManualReviewDecision(id, request));
    }

    @GetMapping
    public ResponseEntity<PaginatedResponse<ClaimResponse>> listClaims(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String searchTerm
    ) {
        return ResponseEntity.ok(claimService.getClaims(page, size, status, searchTerm));
    }

    @GetMapping("/{id}/audit")
    public ResponseEntity<List<AuditLogDto>> getAudit(@PathVariable Long id) {
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
}
