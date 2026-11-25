package com.tpa.claims.auth;

import com.tpa.claims.model.Carrier;
import com.tpa.claims.model.User;
import com.tpa.claims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CarrierContextService {

    private final UserRepository userRepository;

    public Carrier requireCarrier() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new RuntimeException("Unauthorized");
        }

        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != User.UserRole.CARRIER) {
            throw new RuntimeException("Forbidden: carrier role required");
        }
        if (user.getCarrier() == null) {
            throw new RuntimeException("Carrier assignment missing for user");
        }
        return user.getCarrier();
    }
}

