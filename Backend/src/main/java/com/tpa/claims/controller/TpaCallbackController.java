package com.tpa.claims.controller;

import com.tpa.claims.dto.TpaCallbackRequest;
import com.tpa.claims.service.ClaimService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/tpa/claims/callback")
@RequiredArgsConstructor
public class TpaCallbackController {

    private final ClaimService claimService;

    @PostMapping
    public ResponseEntity<Void> processCallback(@RequestBody TpaCallbackRequest request) {
        claimService.processCarrierCallback(request);
        return ResponseEntity.ok().build();
    }
}
