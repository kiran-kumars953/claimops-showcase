package com.tpa.claims.config;

import com.tpa.claims.model.Carrier;
import com.tpa.claims.model.User;
import com.tpa.claims.repository.CarrierRepository;
import com.tpa.claims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final UserRepository userRepository;
    private final CarrierRepository carrierRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner seedDefaultUsers() {
        return args -> {
            Carrier icici = carrierRepository.findByCarrierCode("ICICI_LOMBARD")
                    .orElseGet(() -> carrierRepository.save(Carrier.builder()
                            .carrierCode("ICICI_LOMBARD")
                            .carrierName("ICICI Lombard")
                            .isActive(true)
                            .build()));

            // Dev-only default accounts. Replace with proper user provisioning for production.
            if (!userRepository.existsByUsername("admin")) {
                userRepository.save(User.builder()
                        .username("admin")
                        .email("admin@tpa.local")
                        .fullName("System Admin")
                        .role(User.UserRole.ADMIN)
                        .passwordHash(passwordEncoder.encode("admin123"))
                        .isActive(true)
                        .build());
            }

            if (!userRepository.existsByUsername("agent")) {
                userRepository.save(User.builder()
                        .username("agent")
                        .email("agent@tpa.local")
                        .fullName("TPA Agent")
                        .role(User.UserRole.AGENT)
                        .passwordHash(passwordEncoder.encode("agent123"))
                        .isActive(true)
                        .build());
            }

            if (!userRepository.existsByUsername("auditor")) {
                userRepository.save(User.builder()
                        .username("auditor")
                        .email("auditor@tpa.local")
                        .fullName("Compliance Auditor")
                        .role(User.UserRole.AUDITOR)
                        .passwordHash(passwordEncoder.encode("auditor123"))
                        .isActive(true)
                        .build());
            }

            if (!userRepository.existsByUsername("carrier")) {
                userRepository.save(User.builder()
                        .username("carrier")
                        .email("carrier@icici.local")
                        .fullName("Carrier Reviewer")
                        .role(User.UserRole.CARRIER)
                        .carrier(icici)
                        .passwordHash(passwordEncoder.encode("carrier123"))
                        .isActive(true)
                        .build());
            }

            log.warn("Default users (dev): admin/admin123, agent/agent123, auditor/auditor123, carrier/carrier123.");
        };
    }
}
