package com.tpa.claims.repository;

import com.tpa.claims.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByClaim_IdOrderByCreatedAtAsc(Long claimDbId);
    List<AuditLog> findByUser_IdOrderByCreatedAtDesc(Long userId);
}
