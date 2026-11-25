package com.tpa.claims.config;

import com.tpa.claims.auth.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .headers(headers -> headers.frameOptions(frame -> frame.disable()))
                // Default behavior can return 403 for missing auth; make APIs return 401 for unauthenticated requests.
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized"))
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden"))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/tpa/claims/**").permitAll()
                        // PDF / document preview is embedded via <object> and cannot easily send Authorization headers.
                        // In production, replace this with signed URLs or cookie auth.
                        .requestMatchers(HttpMethod.GET, "/api/claims/*/documents/*/content").permitAll()

                        // Carrier portal APIs (carrier isolation enforced by role + controllers).
                        .requestMatchers("/api/carrier/**").hasRole("CARRIER")

                        // TPA APIs.
                        .requestMatchers("/api/tpa/**").hasAnyRole("ADMIN", "AGENT", "SUPERVISOR", "AUDITOR")

                        // Read-only access for viewers/auditors.
                        .requestMatchers(HttpMethod.GET, "/api/claims/**").hasAnyRole("ADMIN", "AGENT", "SUPERVISOR", "AUDITOR", "VIEWER")
                        .requestMatchers(HttpMethod.GET, "/api/claims/*/export").hasAnyRole("ADMIN", "AGENT", "SUPERVISOR", "AUDITOR", "VIEWER")

                        // Claim processing actions.
                        .requestMatchers(HttpMethod.POST, "/api/claims/**").hasAnyRole("ADMIN", "AGENT", "SUPERVISOR")
                        .requestMatchers(HttpMethod.PUT, "/api/claims/**").hasAnyRole("ADMIN", "AGENT", "SUPERVISOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/claims/**").hasAnyRole("ADMIN", "AGENT", "SUPERVISOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/claims/**").hasRole("ADMIN")

                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173", "http://localhost:5174", "http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
