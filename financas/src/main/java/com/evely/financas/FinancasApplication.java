package com.evely.financas;

import java.util.TimeZone;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import com.fasterxml.jackson.databind.SerializationFeature;
import jakarta.annotation.PostConstruct;

@EnableScheduling
@SpringBootApplication
public class FinancasApplication {

	private static final String APP_TIME_ZONE = "America/Sao_Paulo";

	@PostConstruct
	public void initTimeZone() {
		TimeZone.setDefault(TimeZone.getTimeZone(APP_TIME_ZONE));
	}

	@Bean
	public Jackson2ObjectMapperBuilderCustomizer jacksonTimeCustomizer() {
		return builder -> builder
			.timeZone(TimeZone.getTimeZone(APP_TIME_ZONE))
			.featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
	}

	public static void main(String[] args) {
		SpringApplication.run(FinancasApplication.class, args);
	}

}
