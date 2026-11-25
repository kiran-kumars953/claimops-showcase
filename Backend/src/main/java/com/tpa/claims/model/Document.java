package com.tpa.claims.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "documents", indexes = {
    @Index(name = "idx_claim_id", columnList = "claim_id"),
    @Index(name = "idx_submission_id", columnList = "submission_id"),
    @Index(name = "idx_document_type", columnList = "document_type"),
    @Index(name = "idx_processing_status", columnList = "processing_status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id", nullable = false)
    private Claim claim;

    @NotBlank
    @Column(nullable = false, length = 50)
    private String submissionId;

    @NotBlank
    @Column(nullable = false, length = 50)
    private String documentType;

    @NotBlank
    @Column(nullable = false, length = 255)
    private String originalFilename;

    @NotBlank
    @Column(nullable = false, length = 500)
    private String storagePath;

    @Column(length = 64)
    private String fileHash;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "mime_type", length = 50)
    private String mimeType;

    @Column(name = "page_count")
    private Integer pageCount;

    @Column(name = "is_image")
    @Builder.Default
    private Boolean isImage = false;

    @Column(columnDefinition = "LONGTEXT")
    private String ocrText;

    @Column(name = "extracted_json", columnDefinition = "LONGTEXT")
    private String extractedJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProcessingStatus processingStatus = ProcessingStatus.PENDING;

    @Column(name = "processing_error", length = 500)
    private String processingError;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ProcessingStatus {
        PENDING, PROCESSING, COMPLETED, FAILED
    }
}
