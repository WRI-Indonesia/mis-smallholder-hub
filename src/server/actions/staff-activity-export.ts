"use server";

import ExcelJS from "exceljs";
import sharp from "sharp";
import { getActivitiesForExport } from "./staff-activity";
import type { ActionResult } from "@/types/action-result";

const MONTHS_ID = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Thumbnail size in pixels
const THUMB_WIDTH = 267;
const THUMB_HEIGHT = 150;
// Row height in Excel points when photos are present (1pt ≈ 0.75px)
const ROW_HEIGHT_WITH_2_PHOTOS = 200;
const ROW_HEIGHT_WITH_1_PHOTO = 100;
const ROW_HEIGHT_DEFAULT = 15;

/**
 * Download a photo from a presigned URL and resize to thumbnail.
 * Returns null if download or resize fails (graceful degradation).
 */
async function fetchThumbnail(
  url: string
): Promise<{ buffer: Buffer; ext: "jpeg" | "png" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const input = Buffer.from(arrayBuffer);

    // Detect if it's a PDF — skip embed for PDFs (use link only)
    const isPdf =
      input.slice(0, 4).toString("ascii") === "%PDF";
    if (isPdf) return null;

    const thumb = await sharp(input)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover" })
      .jpeg({ quality: 70 })
      .toBuffer();

    return { buffer: thumb, ext: "jpeg" };
  } catch {
    return null;
  }
}

export async function exportActivitiesToExcel(
  staffId: string,
  staffName: string,
  staffTitle: string,
  lineManagerName: string,
  lineManagerTitle: string,
  year: number,
  month: number
): Promise<ActionResult<{ buffer: number[]; filename: string }>> {
  try {
    const dataResult = await getActivitiesForExport(staffId, year, month);
    if (!dataResult.success) {
      return { success: false, error: dataResult.error };
    }

    const rows = dataResult.data!;
    const monthName = MONTHS_ID[month - 1];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Monthly Deliverables");

    // ─── Title ────────────────────────────────────────────────────────────

    sheet.mergeCells("A1:H1");
    sheet.getCell("A1").value = "Monthly Deliverables";
    sheet.getCell("A1").font = { bold: true, size: 14 };
    sheet.getCell("A1").alignment = { horizontal: "center" };

    sheet.mergeCells("A2:H2");
    sheet.getCell("A2").value = staffName;
    sheet.getCell("A2").font = { size: 11, underline: true };
    sheet.getCell("A2").alignment = { horizontal: "center" };

    sheet.getCell("A3").value = "Month";
    sheet.getCell("B3").value = monthName;
    sheet.getCell("B3").fill = {
      type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" },
    };
    sheet.getCell("C3").value = "Year";
    sheet.getCell("D3").value = year;
    sheet.getCell("D3").fill = {
      type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" },
    };

    // ─── Header row (row 4) ───────────────────────────────────────────────

    const headerRow = sheet.addRow([
      "No", "Day", "Date", "Planning", "Realization",
      "Comment", "Documentation/Links", "Validation by Line Manager",
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" },
    };
    headerRow.alignment = { horizontal: "center", wrapText: true };
    headerRow.height = 30;

    // ─── Data rows (start at row 5) ───────────────────────────────────────

    // Pre-fetch all thumbnails in parallel to avoid sequential delays
    const thumbnailCache = new Map<
      string,
      { buffer: Buffer; ext: "jpeg" | "png" } | null
    >();

    const allPhotoUrls = rows.flatMap((r) => r.photos.map((p) => p.presignedUrl));
    await Promise.all(
      allPhotoUrls.map(async (url) => {
        if (!thumbnailCache.has(url)) {
          thumbnailCache.set(url, await fetchThumbnail(url));
        }
      })
    );

    for (const row of rows) {
      const isWeekend = row.day === "Saturday" || row.day === "Sunday";
      const hasPhotos = row.photos.length > 0;

      // Add the data row (documentation cell left empty — images added below)
      const dataRow = sheet.addRow([
        row.no,
        row.day,
        row.date,
        row.planning,
        row.realization,
        row.comment,
        "", // documentation — filled with images/links below
        row.validationStatus
          ? `${row.validationStatus}${row.validatedBy ? ` — ${row.validatedBy}` : ""}`
          : "",
      ]);

      const weekendFont = { color: { argb: "FFFF0000" } };
      if (isWeekend) {
        dataRow.eachCell((cell) => { cell.font = weekendFont; });
      }

      // Set alignment for all cells in the row to top
      dataRow.eachCell((cell) => {
        if (!cell.alignment) {
          cell.alignment = { vertical: "top" };
        } else {
          cell.alignment = { ...cell.alignment, vertical: "top" };
        }
      });

      if (hasPhotos) {
        // Dynamic row height based on number of photos
        const photoCount = Math.min(row.photos.length, 2);
        dataRow.height = photoCount === 2 ? ROW_HEIGHT_WITH_2_PHOTOS : ROW_HEIGHT_WITH_1_PHOTO;

        const docCell = dataRow.getCell(7); // column G
        const rowIndex = dataRow.number;

        // Set cell value to indicate photos are embedded
        const totalPhotos = row.photos.length;
        const exportedPhotos = Math.min(totalPhotos, 2);
        docCell.value = totalPhotos > 2 
          ? `${exportedPhotos} dari ${totalPhotos} foto` 
          : `${totalPhotos} foto`;
        docCell.alignment = { horizontal: "center", vertical: "top" };

        // Embed thumbnails positioned vertically within the cell
        // Column G starts at index 6 (0-based)
        const COL_G_INDEX = 6;
        const CELL_WIDTH_PIXELS = 380; // Adjusted for 267px thumbnails
        const CELL_HEIGHT_PIXELS = dataRow.height * 1.33; // Convert points to pixels
        
        // Calculate vertical layout - only first 2 thumbnails
        const maxThumbs = Math.min(row.photos.length, 2); // Limited to 2 photos
        
        // Calculate spacing - center thumbnails horizontally in cell
        const startX = Math.max(0, (CELL_WIDTH_PIXELS - THUMB_WIDTH) / 2);
        const startY = 10; // Top margin
        const verticalSpacing = 50; // Much larger space between thumbnails

        for (let i = 0; i < maxThumbs; i++) {
          const photo = row.photos[i];
          const thumb = thumbnailCache.get(photo.presignedUrl);
          if (!thumb) continue;

          const imageId = workbook.addImage({
            buffer: thumb.buffer as any,
            extension: thumb.ext,
          });

          // Calculate vertical position - stack thumbnails vertically
          const y = startY + (i * (THUMB_HEIGHT + verticalSpacing));

          // Position image within the cell using precise positioning
          sheet.addImage(imageId, {
            tl: { 
              col: COL_G_INDEX + (startX / CELL_WIDTH_PIXELS), 
              row: rowIndex - 1 + (y / CELL_HEIGHT_PIXELS)
            },
            ext: { width: THUMB_WIDTH, height: THUMB_HEIGHT },
            editAs: "oneCell", // Keep image within cell boundaries
          });
        }
      } else {
        dataRow.height = ROW_HEIGHT_DEFAULT;
        // Add empty dash for no photos
        const docCell = dataRow.getCell(7);
        docCell.value = "—";
      }
    }

    // ─── Footer ───────────────────────────────────────────────────────────

    sheet.addRow([]);
    const footerRow1 = sheet.addRow([
      "Made by,", "", "", "", "Approved by,", "", "Acknowledged by,",
    ]);
    footerRow1.font = { italic: true };
    sheet.addRow([]);
    sheet.addRow([]);
    const footerRow2 = sheet.addRow([
      staffName, "", "", "", lineManagerName, "", "",
    ]);
    footerRow2.font = { bold: true, underline: true };
    sheet.addRow([staffTitle, "", "", "", lineManagerTitle, "", ""]);

    // ─── Column widths ────────────────────────────────────────────────────

    sheet.columns = [
      { width: 6 },   // No
      { width: 12 },  // Day
      { width: 16 },  // Date
      { width: 38 },  // Planning
      { width: 30 },  // Realization
      { width: 28 },  // Comment
      { width: 60 },  // Documentation - adjusted for 267px thumbnails
      { width: 28 },  // Validation
    ];

    // ─── Borders ─────────────────────────────────────────────────────────

    const dataStartRow = 4;
    const dataEndRow = dataStartRow + rows.length;
    for (let r = dataStartRow; r <= dataEndRow; r++) {
      for (let c = 1; c <= 8; c++) {
        const cell = sheet.getRow(r).getCell(c);
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }

    // ─── Serialize ────────────────────────────────────────────────────────

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Array.from(new Uint8Array(arrayBuffer));
    const filename = `Monthly_Deliverables_${staffName.replace(/\s+/g, "_")}_${monthName}_${year}.xlsx`;

    return { success: true, data: { buffer, filename } };
  } catch (error) {
    console.error("Failed to export activities:", error);
    return { success: false, error: "Gagal mengekspor data." };
  }
}
