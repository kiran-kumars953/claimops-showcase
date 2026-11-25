package com.tpa.claims.repository;

import com.tpa.claims.model.CarrierSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CarrierSubmissionRepository extends JpaRepository<CarrierSubmission, Long> {
}
