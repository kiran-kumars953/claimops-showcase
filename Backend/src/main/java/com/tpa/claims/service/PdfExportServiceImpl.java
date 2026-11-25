package com.tpa.claims.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.tpa.claims.model.Claim;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;

@Service
@Slf4j
public class PdfExportServiceImpl implements PdfExportService {

    @Override
    public byte[] generateClaimReport(Claim claim) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            document.add(new Paragraph("Claim Summary Report").setFontSize(18).setBold());
            document.add(new Paragraph("Claim ID: " + claim.getClaimId()));
            document.add(new Paragraph("Status: " + claim.getStatus()));
            document.add(new Paragraph("Policy Number: " + claim.getPolicy().getPolicyNumber()));
            document.add(new Paragraph("Patient Name: " + claim.getPatientName()));
            document.add(new Paragraph("Hospital: " + claim.getHospitalName()));

            Table table = new Table(2);
            table.addCell("Description");
            table.addCell("Amount");

            table.addCell("Bill Amount");
            table.addCell(claim.getBillAmount().toString());

            table.addCell("Claimed Amount");
            table.addCell(claim.getClaimedAmount().toString());

            table.addCell("Payable Amount");
            table.addCell(claim.getRecommendedPayableAmount() != null ? claim.getRecommendedPayableAmount().toString()
                    : "0.00");

            document.add(table);
            document.close();

            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Error generating PDF for claim {}", claim.getClaimId(), e);
            throw new RuntimeException("Error generating PDF report", e);
        }
    }
}
