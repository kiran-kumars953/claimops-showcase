package com.tpa.claims.repository;

import com.tpa.claims.model.Carrier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CarrierRepository extends JpaRepository<Carrier, Long> {
    Optional<Carrier> findByCarrierCode(String carrierCode);
    Optional<Carrier> findByCarrierName(String carrierName);
}

