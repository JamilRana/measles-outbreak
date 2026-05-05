import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { createAuditLog, AuditActions } from "@/lib/audit";
import { hasPermission } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, 'data:manage')) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const outbreakId = searchParams.get("outbreakId");
    const format = searchParams.get("format") || "xlsx";

    if (!outbreakId) {
      return new Response("Outbreak ID is required", { status: 400 });
    }

    const [users, formFields] = await Promise.all([
      prisma.user.findMany({
        where: { role: "USER", isActive: true },
        include: { facility: true },
        orderBy: { facility: { district: "asc" } }
      }),
      prisma.formField.findMany({
        where: { outbreakId, fieldType: "NUMBER" },
        orderBy: { sortOrder: "asc" }
      })
    ]);

    const reportingDate = new Date().toISOString().split('T')[0];

    const data = users.map(u => {
      const row: any = {
        "Division": u.facility?.division || "",
        "District": u.facility?.district || "",
        "Facility Name": u.facility?.facilityName || "",
        "Email": u.email,
        "Reporting Date": reportingDate,
      };

      // Add dynamic fields with 0 as default
      formFields.forEach(f => {
        row[f.label] = 0;
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample Reports");

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="sample_reports_${outbreakId}.csv"`
        }
      });
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="sample_reports_${outbreakId}.xlsx"`
      }
    });

  } catch (error: any) {
    console.error("Sample generation error:", error);
    return new Response("Failed to generate sample", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, 'data:manage')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const outbreakId = formData.get("outbreakId") as string;
    
    if (!outbreakId) {
      return NextResponse.json({ error: "Outbreak ID is required. Please select an outbreak context." }, { status: 400 });
    }
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const formFields = await prisma.formField.findMany({
      where: { outbreakId }
    });

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with headers
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    
    if (jsonData.length === 0) {
      return NextResponse.json({ error: "The uploaded file is empty" }, { status: 400 });
    }

    // Normalize keys to lowercase for robust matching
    const rows = jsonData.map(row => {
      const normalizedRow: any = {};
      Object.keys(row).forEach(key => {
        normalizedRow[key.trim().toLowerCase()] = row[key];
      });
      return normalizedRow;
    });

    const mandatoryKeys = ["email", "reporting date"];
    const firstRowKeys = Object.keys(rows[0]);
    const missingMandatory = mandatoryKeys.filter(k => !firstRowKeys.includes(k.toLowerCase()));
    
    if (missingMandatory.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingMandatory.join(", ")}. Please use the downloadable template.` 
      }, { status: 400 });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };
    const { rebuildSnapshot } = await import('@/lib/snapshot');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const user = await prisma.user.findUnique({
          where: { email: String(row.email).trim() },
          include: { facility: true },
        });

        if (!user || !user.facilityId) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: User or facility not found for email ${row.email}`);
          continue;
        }

        let reportingDate: Date;
        const dateVal = row["reporting date"];
        if (typeof dateVal === 'number') {
            reportingDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
        } else {
            reportingDate = new Date(dateVal);
        }

        if (isNaN(reportingDate.getTime())) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: Invalid date format for ${dateVal}`);
            continue;
        }

        reportingDate.setUTCHours(0, 0, 0, 0);

        // Dynamic Payload Extraction
        const dataPayload: Record<string, string> = {};
        for (const field of formFields) {
          const val = row[field.fieldKey.toLowerCase()] ?? row[field.label.toLowerCase()];
          if (val !== undefined) {
             dataPayload[field.id] = String(val) || "0";
          }
        }

        const report = await prisma.$transaction(async (tx) => {
          const existing = await tx.report.findUnique({
            where: {
              facilityId_outbreakId_periodStart: {
                facilityId: user.facilityId!,
                outbreakId: outbreakId,
                periodStart: reportingDate
              }
            }
          });

          let targetReportId: string;

          if (existing) {
            targetReportId = existing.id;
            // Update mode: Clear and re-insert field values
            await tx.reportFieldValue.deleteMany({
              where: { reportId: targetReportId }
            });
          } else {
            const created = await tx.report.create({
              data: {
                facilityId: user.facilityId!,
                userId: user.id,
                outbreakId,
                periodStart: reportingDate,
                periodEnd: reportingDate,
                status: "PUBLISHED",
              }
            });
            targetReportId = created.id;
          }

          // Insert field values
          if (Object.keys(dataPayload).length > 0) {
            await tx.reportFieldValue.createMany({
              data: Object.entries(dataPayload).map(([fieldId, val]) => ({
                reportId: targetReportId,
                formFieldId: fieldId,
                value: val
              }))
            });
          }

          // Rebuild snapshot
          const snapshot = await rebuildSnapshot(targetReportId, tx);
          return await tx.report.update({
            where: { id: targetReportId },
            data: { dataSnapshot: snapshot as any }
          });
        });

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    // Create Audit Log
    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.BULK_UPLOAD,
      entityType: "Report",
      entityId: outbreakId,
      details: {
        fileName: file.name,
        totalRows: rows.length,
        successCount: results.success,
        failedCount: results.failed,
        outbreakId
      }
    });

    return NextResponse.json({
      message: `Processed ${results.success + results.failed} records`,
      success: results.success,
      failed: results.failed,
      errors: results.errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error("Bulk upload error:", error);
    return NextResponse.json({ error: "Failed to process file: " + error.message }, { status: 500 });
  }
}