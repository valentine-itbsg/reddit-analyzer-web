import ExcelJS from "exceljs";
import { InputRow } from "./types";

export class ExcelService {
  async readInputRows(filePath: string): Promise<InputRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("No worksheet found in the input Excel file.");
    }

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = this.cellToString(cell.value).trim();
    });

    const urlColumnIndex = headers.findIndex(
      (header) => header.toLowerCase() === "url",
    );

    if (urlColumnIndex === -1) {
      throw new Error('Input Excel must contain a column named "url".');
    }

    const rows: InputRow[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      const rowData: Record<string, unknown> = { rowNumber };

      headers.forEach((header, index) => {
        rowData[header] = row.getCell(index + 1).value;
      });

      const urlCellValue = row.getCell(urlColumnIndex + 1).value;
      const url = this.extractUrl(urlCellValue);

      if (!url) {
        return;
      }

      rows.push({
        ...rowData,
        rowNumber,
        url,
      });
    });

    return rows;
  }

  private extractUrl(value: ExcelJS.CellValue): string {
    if (value == null) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
    if (value instanceof Date) return value.toISOString().trim();

    if (typeof value === "object") {
      if ("hyperlink" in value && typeof value.hyperlink === "string") {
        return value.hyperlink.trim();
      }
      if ("text" in value && typeof value.text === "string") {
        return value.text.trim();
      }
      if ("result" in value && typeof value.result === "string") {
        return value.result.trim();
      }
      if ("richText" in value && Array.isArray(value.richText)) {
        return value.richText.map((part) => part.text).join("").trim();
      }
    }

    return this.cellToString(value).trim();
  }

  private cellToString(value: ExcelJS.CellValue): string {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (value instanceof Date) return value.toISOString();

    if (typeof value === "object") {
      if ("text" in value && typeof value.text === "string") return value.text;
      if ("hyperlink" in value && typeof value.hyperlink === "string") return value.hyperlink;
      if ("result" in value) return String(value.result ?? "");
      if ("richText" in value && Array.isArray(value.richText)) {
        return value.richText.map((part) => part.text).join("");
      }
    }

    return String(value);
  }
}