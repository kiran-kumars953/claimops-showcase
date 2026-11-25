package com.tpa.claims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentPreviewDto {
    private Long id;
    private String type;
    private String filename;
    private String previewUrl;
}
