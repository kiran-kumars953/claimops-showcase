package com.tpa.claims.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class StorageServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void storesAndLoadsFileUnderClaimFolder() throws Exception {
        StorageService storage = new StorageService(tempDir.toString());
        byte[] content = "claim form".getBytes(StandardCharsets.UTF_8);

        String stored = storage.store(content, "claim form.pdf", "claims/CLM-1");

        assertThat(stored).startsWith("claims/CLM-1/").endsWith("_claim_form.pdf");
        Path loaded = storage.load(stored);
        assertThat(loaded).startsWith(tempDir.toAbsolutePath().normalize());
        assertThat(Files.readAllBytes(loaded)).isEqualTo(content);
    }

    @Test
    void stripsDirectoriesFromUploadedFilename() {
        assertThat(StorageService.sanitize("../../etc/passwd")).isEqualTo("passwd");
        assertThat(StorageService.sanitize(null)).isEqualTo("document");
    }

    @Test
    void rejectsPathTraversalOnLoad() {
        StorageService storage = new StorageService(tempDir.toString());
        assertThatThrownBy(() -> storage.load("../outside.txt"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsEmptyContent() {
        StorageService storage = new StorageService(tempDir.toString());
        assertThatThrownBy(() -> storage.store(new byte[0], "a.pdf", "claims/CLM-2"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
