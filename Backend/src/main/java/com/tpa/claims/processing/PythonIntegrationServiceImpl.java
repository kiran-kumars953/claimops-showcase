package com.tpa.claims.processing;

import com.tpa.claims.model.Document;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.Collections;
import java.util.HashMap;

@Service
@Slf4j
@RequiredArgsConstructor
public class PythonIntegrationServiceImpl implements PythonIntegrationService {

    private final WebClient.Builder webClientBuilder;
    private final com.tpa.claims.repository.DocumentRepository documentRepository;
    private final com.tpa.claims.storage.StorageService storageService;

    @Value("${app.python-service.url:http://localhost:5000}")
    private String pythonServiceUrl;

    @Override
    public ExtractionResult extractData(com.tpa.claims.model.Claim claim) {
        log.info("Requesting data extraction for claim: {}", claim.getClaimId());

        try {
            List<Document> documents = documentRepository.findByClaimId(claim.getId());

            List<Map<String, Object>> docList = documents.stream()
                    .map(doc -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("type", doc.getDocumentType());
                        map.put("path", storageService.load(doc.getStoragePath()).toAbsolutePath().toString());
                        return map;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("claim_id", claim.getClaimId());
            requestBody.put("documents", docList);
            Map<String, Object> response = webClientBuilder.build().post()
                    .uri(pythonServiceUrl + "/extract")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null) {
                Map<String, Object> data = (Map<String, Object>) response.getOrDefault("data", Collections.emptyMap());
                Double confidence = parseDouble(response.get("confidence"));
                List<String> warnings = (List<String>) response.getOrDefault("warnings", Collections.emptyList());
                String status = (String) response.getOrDefault("status", "FAILED");

                if (!"SUCCESS".equalsIgnoreCase(status)) {
                    log.warn("Python extraction failed. Status: {}, Warnings: {}", status, warnings);
                }

                return ExtractionResult.builder()
                        .status(status)
                        .confidence(confidence == null ? 0.0 : confidence)
                        .data(data)
                        .warnings(warnings)
                        .build();
            }

            return fallbackResult("Python service returned empty response");
        } catch (Exception e) {
            log.error("Error communicating with Python service", e);
            return fallbackResult("Python service communication error: " + e.getMessage());
        }
    }

    private ExtractionResult fallbackResult(String warning) {
        log.warn("Falling back to empty extraction result. Reason: {}", warning);
        return ExtractionResult.builder()
                .status("FAILED")
                .confidence(0.0)
                .data(new HashMap<>())
                .warnings(List.of(warning))
                .build();
    }

    private Double parseDouble(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
