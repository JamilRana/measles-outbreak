import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const yesterday = subDays(new Date(), 1);
    const dateStr = format(yesterday, "yyyy-MM-dd");

    const reports = await prisma.report.findMany({
      where: {
        reportingDate: {
          gte: startOfDay(yesterday),
          lte: endOfDay(yesterday),
        },
      },
      orderBy: { division: "asc" },
    });

    if (reports.length === 0) {
      return NextResponse.json({ message: "No reports to send for yesterday." });
    }

    const recipients = await prisma.emailRecipient.findMany();
    if (recipients.length === 0) {
      return NextResponse.json({ message: "No recipients configured." });
    }

    // Generate PDF with comprehensive format
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text("Daily Measles Outbreak Monitoring Report", 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Report Date: ${dateStr}`, 14, 28);
    doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 14, 34);
    doc.text(`Total Facilities Reported: ${reports.length}`, 14, 40);

    // Summary section
    const totalSuspected = reports.reduce((sum: number, r: any) => sum + (r.suspected24h || 0), 0);
    const totalConfirmed = reports.reduce((sum: number, r: any) => sum + (r.confirmed24h || 0), 0);
    const totalDeaths = reports.reduce((sum: number, r: any) => sum + ((r.suspectedDeath24h || 0) + (r.confirmedDeath24h || 0)), 0);
    const totalAdmitted = reports.reduce((sum: number, r: any) => sum + (r.admitted24h || 0), 0);
    const totalDischarged = reports.reduce((sum: number, r: any) => sum + (r.discharged24h || 0), 0);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Daily Summary:", 14, 50);
    doc.setFontSize(10);
    doc.text(`Total Suspected Cases: ${totalSuspected}`, 14, 58);
    doc.text(`Total Confirmed Cases: ${totalConfirmed}`, 14, 64);
    doc.text(`Total Deaths: ${totalDeaths}`, 14, 70);
    doc.text(`Total Admitted: ${totalAdmitted}`, 14, 76);
    doc.text(`Total Discharged: ${totalDischarged}`, 14, 82);

    // Main table
    const tableData = reports.map((r: any) => [
      r.division || "-",
      r.district || "-",
      r.facilityName || "-",
      r.suspected24h || 0,
      r.confirmed24h || 0,
      (r.suspectedDeath24h || 0) + (r.confirmedDeath24h || 0),
      r.admitted24h || 0,
      r.discharged24h || 0,
    ]);

    autoTable(doc, {
      startY: 90,
      head: [['Division', 'District', 'Facility', 'Susp.', 'Conf.', 'Deaths', 'Adm.', 'Disch.']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 40 },
      },
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Generate Excel with all fields
    const excelData = reports.map((r: any) => ({
      Division: r.division,
      District: r.district,
      Facility: r.facilityName,
      'Suspected (24h)': r.suspected24h,
      'Confirmed (24h)': r.confirmed24h,
      'Suspected (YTD)': r.suspectedYTD,
      'Confirmed (YTD)': r.confirmedYTD,
      'Suspected Deaths (24h)': r.suspectedDeath24h,
      'Confirmed Deaths (24h)': r.confirmedDeath24h,
      'Suspected Deaths (YTD)': r.suspectedDeathYTD,
      'Confirmed Deaths (YTD)': r.confirmedDeathYTD,
      'Admitted (24h)': r.admitted24h,
      'Admitted (YTD)': r.admittedYTD,
      'Discharged (24h)': r.discharged24h,
      'Discharged (YTD)': r.dischargedYTD,
      'Serum Sent (YTD)': r.serumSentYTD,
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Send Emails
    const emailPromises = recipients.map((recipient: any) =>
      sendEmail(
        recipient.email,
        `Daily Measles Report - ${dateStr}`,
        `<p>Dear ${recipient.designation},</p>
        <p>Please find attached the daily measles outbreak monitoring report for ${dateStr}.</p>
        <h3>Summary:</h3>
        <ul>
          <li>Total Suspected Cases: ${totalSuspected}</li>
          <li>Total Confirmed Cases: ${totalConfirmed}</li>
          <li>Total Deaths: ${totalDeaths}</li>
          <li>Total Admitted: ${totalAdmitted}</li>
          <li>Total Discharged: ${totalDischarged}</li>
          <li>Facilities Reported: ${reports.length}</li>
        </ul>
        <p>Regards,<br/>Monitoring System</p>`,
        [
          { filename: `Measles_Daily_Report_${dateStr}.pdf`, content: pdfBuffer },
          { filename: `Measles_Daily_Report_${dateStr}.xlsx`, content: excelBuffer }
        ]
      )
    );

    await Promise.all(emailPromises);

    return NextResponse.json({ message: `Daily report sent to ${recipients.length} recipients.` });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Failed to process daily report" }, { status: 500 });
  }
}
