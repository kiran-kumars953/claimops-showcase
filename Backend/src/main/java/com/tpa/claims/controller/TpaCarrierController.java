package com.tpa.claims.controller;

import com.tpa.claims.model.Carrier;
import com.tpa.claims.repository.CarrierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tpa/carriers")
@RequiredArgsConstructor
public class TpaCarrierController {

    private final CarrierRepository carrierRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listCarriers() {
        List<Carrier> carriers = carrierRepository.findAll();
        return ResponseEntity.ok(
                carriers.stream()
                        .filter(c -> Boolean.TRUE.equals(c.getIsActive()))
                        .map(c -> Map.<String, Object>of(
                                "id", c.getId(),
                                "code", c.getCarrierCode(),
                                "name", c.getCarrierName()
                        ))
                        .toList()
        );
    }
}

