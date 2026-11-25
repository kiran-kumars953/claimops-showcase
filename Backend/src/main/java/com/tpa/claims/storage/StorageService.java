package com.tpa.claims.storage;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Stores uploaded claim documents on the local file system (a shared volume in Docker).
 *
 * <p>Paths returned by {@link #store} are relative to the upload root, so they can be
 * saved in the database and resolved later with {@link #load}. Path traversal outside
 * the upload root is rejected.
 */
@Service
public class StorageService {

    private final Path root;

    public StorageService(@Value("${app.storage.upload-dir:storage}") String uploadDir) {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    /**
     * Writes the content under {@code <root>/<folder>/<uuid>_<filename>}.
     *
     * @return the stored file's path relative to the upload root
     */
    public String store(byte[] content, String originalFilename, String folder) {
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("Cannot store an empty file");
        }
        String safeName = sanitize(originalFilename);
        Path target = resolveInsideRoot(Paths.get(folder == null ? "" : folder)
                .resolve(UUID.randomUUID() + "_" + safeName));
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store file " + safeName, e);
        }
        return root.relativize(target).toString().replace('\\', '/');
    }

    /** Resolves a stored relative path back to an absolute path inside the upload root. */
    public Path load(String storedPath) {
        if (storedPath == null || storedPath.isBlank()) {
            throw new IllegalArgumentException("Stored path is empty");
        }
        return resolveInsideRoot(Paths.get(storedPath));
    }

    public Path getRoot() {
        return root;
    }

    private Path resolveInsideRoot(Path relative) {
        Path resolved = root.resolve(relative).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("Path escapes the upload directory: " + relative);
        }
        return resolved;
    }

    static String sanitize(String filename) {
        String name = filename == null ? "" : Paths.get(filename).getFileName().toString();
        name = name.replaceAll("[^A-Za-z0-9._-]", "_");
        return name.isBlank() ? "document" : name;
    }
}
