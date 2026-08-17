package com.shopstack.modules.product.dto.requests;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
public class UpdateProductRequest {

    @Size(max = 150)
    private String productName;

    @Size(max = 100)
    private String brand;

    private String description;

    private String imageUrl;

    private org.springframework.web.multipart.MultipartFile image;

    private String features;

    @DecimalMin("0.0")
    private BigDecimal price;

    @Min(0)
    private Integer stockQuantity;

    private BigDecimal discountPercentage;

    // Ownership cannot be changed via update; ignored server-side if supplied.
    private Long vendorId;

    private UUID categoryId;

    private Boolean featured;

    private Boolean active;
}