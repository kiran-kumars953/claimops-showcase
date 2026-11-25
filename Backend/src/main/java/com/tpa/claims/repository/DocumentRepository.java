package com.tpa.claims.repository;

import com.tpa.claims.model.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByClaimId(Long claimId);
    Optional<Document> findByIdAndClaimId(Long id, Long claimId);
    Optional<Document> findByClaimIdAndSubmissionId(Long claimId, String submissionId);
    List<Document> findByClaimIdAndDocumentType(Long claimId, String documentType);
    Optional<Document> findByFileHash(String fileHash);
}
