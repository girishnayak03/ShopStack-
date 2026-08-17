package com.shopstack;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ShopstackBackendApplication {
	public static void main(String[] args) {
		SpringApplication.run(ShopstackBackendApplication.class, args);
	}

}

