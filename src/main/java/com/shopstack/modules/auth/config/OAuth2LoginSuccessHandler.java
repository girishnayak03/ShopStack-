package com.shopstack.modules.auth.config;

import com.shopstack.common.enums.AccountStatus;
import com.shopstack.common.enums.Gender;
import com.shopstack.modules.auth.service.JwtService;
import com.shopstack.modules.user.entity.Role;
import com.shopstack.modules.user.entity.User;
import com.shopstack.modules.user.repository.RoleRepository;
import com.shopstack.modules.user.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final JwtService jwtService;

    @Value("${application.cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    public OAuth2LoginSuccessHandler(UserRepository userRepository, RoleRepository roleRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.jwtService = jwtService;
    }

    private String getRedirectUrl() {
        String primaryOrigin = allowedOrigins.split(",")[0].trim();
        if (primaryOrigin.endsWith("/")) {
            primaryOrigin = primaryOrigin.substring(0, primaryOrigin.length() - 1);
        }
        return primaryOrigin + "/oauth2/redirect";
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        String redirectBase = getRedirectUrl();

        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        String email = oauthUser.getAttribute("email");
        String name = oauthUser.getAttribute("name");
        String givenName = oauthUser.getAttribute("given_name");
        String familyName = oauthUser.getAttribute("family_name");

        if (email == null) {
            response.sendRedirect(redirectBase + "?error=no_email_from_provider");
            return;
        }

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(name != null ? name : email);

            // Google gives given_name/family_name separately; fall back to splitting "name" if missing
            if (givenName != null || familyName != null) {
                newUser.setFirstName(givenName != null ? givenName : "");
                newUser.setLastName(familyName != null ? familyName : "");
            } else {
                String[] parts = (name != null ? name : email).split(" ", 2);
                newUser.setFirstName(parts[0]);
                newUser.setLastName(parts.length > 1 ? parts[1] : "");
            }

            // OAuth users have no password — use a random unusable placeholder
            newUser.setPassword(UUID.randomUUID().toString());

            // Fields Google doesn't provide — safe defaults, user can update later
            newUser.setPhone(0L);
            newUser.setGender(Gender.OTHER);
            newUser.setStatus(AccountStatus.ACTIVE);
            newUser.setEnabled(true);
            newUser.setEmailVerified(true); // Google already verified this email
            newUser.setPhoneVerified(false);

            Role defaultRole = roleRepository.findByName("CUSTOMER")
                    .orElseThrow(() -> new RuntimeException("Default role CUSTOMER not found — check RoleSeeder"));
            newUser.setRole(defaultRole);

            return userRepository.save(newUser);
        });

        String token = jwtService.generateToken(user.getEmail(), user.getRole().getName());
        response.sendRedirect(redirectBase + "?token=" + token);
    }
}