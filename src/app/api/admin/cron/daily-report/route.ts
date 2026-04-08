import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  // Simple check for security (In production, use a more robust secret or IP whitelist)
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const yesterday = subDays(new Date(), 1);
    const dateStr = format(yesterday, "yyyy-MM-dd");

    // 1. Fetch data
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

    // 2. Generate PDF (Server-side)
    const doc = new jsPDF();
    doc.text(`Daily Measles Outbreak Report - ${dateStr}`, 14, 20);
    const tableData = reports.map((r: any) => [r.division, r.district, r.facilityName, r.suspected24h, r.confirmed24h, r.suspectedDeath24h + r.confirmedDeath24h]);
    
    autoTable(doc, {
      startY: 30,
      head: [['Division', 'District', 'Facility', 'Suspected', 'Confirmed', 'Deaths']],
      body: tableData,
    });
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // 3. Generate Excel
    const ws = XLSX.utils.json_to_sheet(reports);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 4. Send Emails
    const emailPromises = recipients.map((recipient: any) =>
      sendEmail(
        recipient.email,
        `Daily Measles Report - ${dateStr}`,
        `<p>Dear ${recipient.designation},</p><p>Please find attached the daily measles outbreak monitoring report for ${dateStr}.</p><p>Regards,<br/>Monitoring System</p>`,
        [
          { filename: `Report_${dateStr}.pdf`, content: pdfBuffer },
          { filename: `Report_${dateStr}.xlsx`, content: excelBuffer }
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
