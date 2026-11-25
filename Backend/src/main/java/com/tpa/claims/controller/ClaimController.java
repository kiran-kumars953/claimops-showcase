package com.tpa.claims.controller;

import com.tpa.claims.dto.ClaimRequest;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.ClaimConfirmationRequest;
import com.tpa.claims.model.Document;
import com.tpa.claims.dto.ManualReviewDecisionRequest;
import com.tpa.claims.repository.DocumentRepository;
import com.tpa.claims.service.ClaimService;
import com.tpa.claims.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
public class ClaimController {

    private final ClaimService claimService;
    private final DocumentRepository documentRepository;
    private final StorageService storageService;

    @PostMapping
    public ResponseEntity<ClaimResponse> createClaim(@RequestBody ClaimRequest request) {
        return ResponseEntity.ok(claimService.createClaim(request));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ClaimResponse> confirmClaim(@PathVariable Long id, @RequestBody ClaimConfirmationRequest request) {
        return ResponseEntity.ok(claimService.confirmClaim(id, request));
    }

    @PostMapping("/{id}/manual-review/decision")
    public ResponseEntity<ClaimResponse> applyManualReviewDecision(@PathVariable Long id,
                                                                   @RequestBody ManualReviewDecisionRequest request) {
        return ResponseEntity.ok(claimService.applyManualReviewDecision(id, request));
    }

    @PostMapping("/{id}/submit-to-carrier")
    public ResponseEntity<ClaimResponse> submitToCarrier(@PathVariable Long id) {
        return ResponseEntity.ok(claimService.submitToCarrier(id));
    }

    @GetMapping
    public ResponseEntity<com.tpa.claims.dto.PaginatedResponse<ClaimResponse>> getClaims(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String searchTerm) {
        return ResponseEntity.ok(claimService.getClaims(page, size, status, searchTerm));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClaimResponse> getClaimById(@PathVariable Long id) {
        return ResponseEntity.ok(claimService.getClaimById(id));
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportClaim(@PathVariable Long id) {
        byte[] pdfContent = claimService.exportClaim(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=claim_" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfContent);
    }

    @GetMapping("/{id}/documents/{documentId}/content")
    public ResponseEntity<Resource> previewDocument(@PathVariable Long id, @PathVariable Long documentId) {
        Document document = documentRepository.findByIdAndClaimId(documentId, id)
                .orElseThrow(() -> new RuntimeException("Document not found for claim: " + id));

        Path filePath = storageService.load(document.getStoragePath());
        Resource resource = new FileSystemResource(filePath);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;

        try {
            String detectedType = Files.probeContentType(filePath);
            if (detectedType != null && !detectedType.isBlank()) {
                mediaType = MediaType.parseMediaType(detectedType);
            }
        } catch (Exception ignored) {
            // Fallback to octet-stream if detection fails.
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + document.getOriginalFilename() + "\"")
                .body(resource);
    }
}
