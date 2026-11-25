package com.tpa.claims.processing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtractionResult {
    private String status;
    private Double confidence;
    private Map<String, Object> data;
    private List<String> warnings;
}
