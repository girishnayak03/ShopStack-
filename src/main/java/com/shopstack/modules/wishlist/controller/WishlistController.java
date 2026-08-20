package com.shopstack.modules.wishlist.controller;

import com.shopstack.modules.wishlist.entity.Wishlist;
import com.shopstack.modules.wishlist.entity.WishlistItem;
import com.shopstack.modules.wishlist.service.WishlistService;
import com.shopstack.modules.product.entity.Product;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    /**
     * GET /api/v1/wishlist
     * Get user's wishlist with all items
     */
    @GetMapping
public ResponseEntity<?> getWishlist(@RequestParam UUID userId) {
    try {
        Wishlist wishlist = wishlistService.getWishlist(userId);

        List<Map<String, Object>> items = wishlist.getItems()
                .stream()
                .map(item -> {
                    Map<String, Object> data = new HashMap<>();

                    data.put("id", item.getId());
                    data.put("productId", item.getProduct().getId());
                    data.put("productName", item.getProductName());
                    data.put("productPrice", item.getProductPrice());
                    data.put("productImage", item.getProductImage());

                    return data;
                })
                .toList();

        return ResponseEntity.ok(new HashMap<String, Object>() {{
            put("success", true);
            put("data", items);
        }});

    } catch (Exception e) {
        e.printStackTrace();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new HashMap<String, Object>() {{
                    put("success", false);
                    put("message", e.getMessage());
                }});
    }
}

    /**
     * POST /api/v1/wishlist/add
     * Add product to wishlist
     * Body: { "userId": "uuid", "productId": "uuid" }
     */
    @PostMapping("/add")
    public ResponseEntity<?> addToWishlist(@RequestBody Map<String, String> request) {
        try {
            UUID userId = UUID.fromString(request.get("userId"));
            UUID productId = UUID.fromString(request.get("productId"));

            WishlistItem item = wishlistService.addToWishlist(userId, productId);

            return ResponseEntity.ok(new HashMap<String, Object>() {{
                put("success", true);
                put("message", "Product added to wishlist");
                put("data", item);
            }});
        } catch (RuntimeException e) {
            if (e.getMessage().contains("already in wishlist")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(new HashMap<String, Object>() {{
                    put("success", false);
                    put("message", "Product already in wishlist");
                }});
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new HashMap<String, Object>() {{
                put("success", false);
                put("message", e.getMessage());
            }});
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new HashMap<String, Object>() {{
                put("success", false);
                put("message", "Error adding to wishlist: " + e.getMessage());
            }});
        }
    }

    /**
     * DELETE /api/v1/wishlist/{itemId}
     * Remove item from wishlist
     */
    @DeleteMapping("/{itemId}")
    public ResponseEntity<?> removeFromWishlist(
            @PathVariable UUID itemId,
            @RequestParam UUID userId) {
        try {
            wishlistService.removeFromWishlist(userId, itemId);

            return ResponseEntity.ok(new HashMap<String, Object>() {{
                put("success", true);
                put("message", "Product removed from wishlist");
            }});
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new HashMap<String, Object>() {{
                put("success", false);
                put("message", e.getMessage());
            }});
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new HashMap<String, Object>() {{
                put("success", false);
                put("message", "Error removing from wishlist: " + e.getMessage());
            }});
        }
    }

    /**
     * POST /api/v1/wishlist/{itemId}/to-cart
     * Add product to cart and remove from wishlist
     * ✅ KEY ENDPOINT: Called when user clicks "Add to Cart" from wishlist
     */
    @PostMapping("/{itemId}/to-cart")
    public ResponseEntity<?> addToCartAndRemoveFromWishlist(
            @PathVariable UUID itemId,
            @RequestParam UUID userId) {
        try {
            wishlistService.addToCartAndRemoveFromWishlist(userId, itemId);

            return ResponseEntity.ok(new HashMap<String, Object>() {{
                put("success", true);
                put("message", "Product added to cart and removed from wishlist");
            }});
        } catch (RuntimeException e) {
            if (e.getMessage().contains("out of stock")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(new HashMap<String, Object>() {{
                    put("success", false);
                    put("message", "❌ Product is out of stock");
                }});
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new HashMap<String, Object>() {{
                put("success", false);
                put("message", e.getMessage());
            }});
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new HashMap<String, Object>() {{
                put("success", false);
                put("message", "Error: " + e.getMessage());
            }});
        }
    }

    /**
     * GET /api/v1/wishlist/check/{productId}
     * Check if product is in user's wishlist
     */
    @GetMapping("/check/{productId}")
    public ResponseEntity<?> isInWishlist(
            @PathVariable UUID productId,
            @RequestParam UUID userId) {
        try {
            boolean inWishlist = wishlistService.isInWishlist(userId, productId);

            return ResponseEntity.ok(new HashMap<String, Object>() {{
                put("success", true);
                put("inWishlist", inWishlist);
            }});
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new HashMap<String, Object>() {{
                put("success", false);
                put("message", e.getMessage());
            }});
        }
    }

    /**
     * GET /api/v1/wishlist/count
     * Get count of wishlist items
     */
    @GetMapping("/count")
    public ResponseEntity<?> getWishlistCount(@RequestParam UUID userId) {
        try {
            long count = wishlistService.getWishlistItemsCount(userId);

            return ResponseEntity.ok(new HashMap<String, Object>() {{
                put("success", true);
                put("count", count);
            }});
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new HashMap<String, Object>() {{
                put("success", false);
                put("message", e.getMessage());
            }});
        }
    }

    /**
     * GET /api/v1/wishlist/products
     * Get all products in wishlist
     */
    @GetMapping("/products")
    public ResponseEntity<?> getWishlistProducts(@RequestParam UUID userId) {
        try {
            List<Product> products = wishlistService.getWishlistProducts(userId);

            return ResponseEntity.ok(new HashMap<String, Object>() {{
                put("success", true);
                put("data", products);
                put("count", products.size());
            }});
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new HashMap<String, Object>() {{
                put("success", false);
                put("message", e.getMessage());
            }});
        }
    }

    /**
     * DELETE /api/v1/wishlist/clear
     * Clear entire wishlist
     */
    @DeleteMapping("/clear")
    public ResponseEntity<?> clearWishlist(@RequestParam UUID userId) {
        try {
            wishlistService.clearWishlist(userId);

            return ResponseEntity.ok(new HashMap<String, Object>() {{
                put("success", true);
                put("message", "Wishlist cleared");
            }});
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new HashMap<String, Object>() {{
                put("success", false);
                put("message", e.getMessage());
            }});
        }
    }
}