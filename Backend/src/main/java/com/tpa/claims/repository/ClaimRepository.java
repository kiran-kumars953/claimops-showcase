package com.tpa.claims.repository;

import com.tpa.claims.model.Claim;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.time.LocalDate;
import java.util.Collection;

@Repository
public interface ClaimRepository extends JpaRepository<Claim, Long> {
    Optional<Claim> findByClaimId(String claimId);
    Optional<Claim> findBySubmissionId(String submissionId);
    
    @Query("SELECT c FROM Claim c WHERE c.claimId = :claimId OR c.policy.policyNumber = :searchTerm")
    Page<Claim> searchByClaim(String claimId, String searchTerm, Pageable pageable);

    @Query("""
            SELECT c FROM Claim c
            LEFT JOIN c.policy p
            WHERE c.carrier.id = :carrierId
              AND (c.claimId = :term OR p.policyNumber = :term)
            """)
    Page<Claim> searchByClaimForCarrier(@Param("carrierId") Long carrierId, @Param("term") String term, Pageable pageable);
    
    Page<Claim> findByStatus(Claim.ClaimStatus status, Pageable pageable);

    Page<Claim> findByCarrier_Id(Long carrierId, Pageable pageable);

    Page<Claim> findByCarrier_IdAndStatus(Long carrierId, Claim.ClaimStatus status, Pageable pageable);

    long countByStatus(Claim.ClaimStatus status);

    long countByStatusIn(Collection<Claim.ClaimStatus> statuses);

    long countByCarrier_Id(Long carrierId);

    long countByCarrier_IdAndStatus(Long carrierId, Claim.ClaimStatus status);
    
    Page<Claim> findAll(Pageable pageable);
    
    @Query("SELECT c FROM Claim c WHERE c.status = :status OR :status IS NULL")
    Page<Claim> findByStatusOrAll(Claim.ClaimStatus status, Pageable pageable);

    @Query("""
            SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END
            FROM Claim c
            WHERE c.id <> :claimId
              AND c.policy IS NOT NULL
              AND c.policy.policyNumber = :policyNumber
              AND LOWER(c.patientName) = LOWER(:patientName)
              AND LOWER(c.hospitalName) = LOWER(:hospitalName)
              AND c.serviceDate = :admissionDate
            """)
    boolean existsPotentialDuplicate(@Param("claimId") Long claimId,
                                     @Param("policyNumber") String policyNumber,
                                     @Param("patientName") String patientName,
                                     @Param("hospitalName") String hospitalName,
                                     @Param("admissionDate") LocalDate admissionDate);
}
