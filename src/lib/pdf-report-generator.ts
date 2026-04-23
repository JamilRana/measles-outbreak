import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export async function generateGovtPDF(reports: any[], filterDate: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const dateObj = new Date(filterDate);
  const formattedDate = format(dateObj, "dd MMMM yyyy");
  const fileNameDate = format(dateObj, "dd_MM_yyyy");

  doc.setTextColor(240, 240, 240);
  doc.setFontSize(60);
  doc.text("DGHS Bangladesh", 40, 150, { angle: 45 });
  
  doc.setTextColor(0);
  
  doc.setFontSize(10);
  doc.text("Government of the People's Republic of Bangladesh", 105, 15, { align: "center" });
  doc.text("Ministry of Health and Family Welfare", 105, 20, { align: "center" });
  doc.text("Health Services Division", 105, 25, { align: "center" });
  doc.text("Disease Control Centre", 105, 30, { align: "center" });
  doc.text("Directorate General of Health Services, Mohakhali, Dhaka-1212", 105, 35, { align: "center" });
  doc.text("Email: dghs.monitoring@gmail.com", 105, 40, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MEASLES OUTBREAK SITUATION", 105, 52, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(formattedDate, 105, 60, { align: "center" });
  
  doc.setFontSize(11);
  doc.text("DGHS Daily Health News Bulletin", 105, 68, { align: "center" });

  const totals = reports.reduce((acc, r) => ({
    s24: acc.s24 + (r.suspected24h || 0),
    c24: acc.c24 + (r.confirmed24h || 0),
    deaths: acc.deaths + (r.suspectedDeath24h || 0) + (r.confirmedDeath24h || 0),
    admitted: acc.admitted + (r.admitted24h || 0),
    discharged: acc.discharged + (r.discharged24h || 0),
  }), { s24: 0, c24: 0, deaths: 0, admitted: 0, discharged: 0 });

  autoTable(doc, {
    startY: 75,
    head: [['Suspected (24h)', 'Confirmed (24h)', 'Deaths (24h)', 'Admitted (24h)', 'Discharged (24h)']],
    body: [[
      totals.s24, totals.c24, totals.deaths, totals.admitted, totals.discharged
    ]],
    theme: 'grid',
    styles: { halign: 'center', fontSize: 9, textColor: 0, lineColor: 0, lineWidth: 0.1 },
    headStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' }
  });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Division-wise Mortality Data:", 14, (doc as any).lastAutoTable.finalY + 10);

  const divisionMortality = Object.values(reports.reduce((acc, r) => {
    const division = r.user?.division || 'Unknown';
    if (!acc[division]) acc[division] = { name: division, deaths: 0, confirmedDeaths: 0 };
    acc[division].deaths += (r.suspectedDeath24h || 0);
    acc[division].confirmedDeaths += (r.confirmedDeath24h || 0);
    return acc;
  }, {} as any)).map((m: any) => [
    m.name, m.deaths, m.confirmedDeaths
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['Division', 'Deaths (Suspected) 24h', 'Deaths (Confirmed) 24h']],
    body: divisionMortality,
    theme: 'grid',
    styles: { halign: 'center', fontSize: 9, textColor: 0, lineColor: 0, lineWidth: 0.1 },
    headStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' }
  });

  doc.addPage();
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Division-wise Detailed Data:", 14, 20);

  const divisionDetailed = Object.values(reports.reduce((acc, r) => {
    const division = r.user?.division || 'Unknown';
    if (!acc[division]) acc[division] = { 
      name: division, 
      s24: 0, a24: 0, dis24: 0, sd24: 0, c24: 0, cd24: 0 
    };
    acc[division].s24 += (r.suspected24h || 0);
    acc[division].a24 += (r.admitted24h || 0);
    acc[division].dis24 += (r.discharged24h || 0);
    acc[division].sd24 += (r.suspectedDeath24h || 0);
    acc[division].c24 += (r.confirmed24h || 0);
    acc[division].cd24 += (r.confirmedDeath24h || 0);
    return acc;
  }, {} as any)).map((d: any) => [
    d.name, d.s24, d.a24, d.dis24, d.sd24, d.c24, d.cd24
  ]);

  autoTable(doc, {
    startY: 25,
    head: [['Division', 'Susp(24h)', 'Admitted', 'Discharged', 'Death(S)', 'Conf(24h)', 'Death(C)']],
    body: divisionDetailed,
    theme: 'grid',
    styles: { halign: 'center', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.1, cellPadding: 1.5 },
    headStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [252, 252, 252] }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("*** Data is subject to correction ***", 14, finalY);
  doc.text(format(new Date(), "dd-MM-yyyy"), 196, finalY, { align: "right" });

  const sigY = finalY + 30;
  doc.text("Signature", 185, sigY, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("Authority", 185, sigY + 5, { align: "center" });
  doc.text("Directorate General of Health Services", 185, sigY + 10, { align: "center" });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: "center" });
  }

  doc.save(`measles_report_${fileNameDate}.pdf`);
}

export async function generateGovtPDFBuffer(summary: any, cumulative: any, filterDate: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const dateObj = new Date(filterDate);
  const formattedDate = format(dateObj, "dd MMMM yyyy");

  // Logo & Header
  doc.setFontSize(10);
  doc.text("Government of the People's Republic of Bangladesh", 105, 15, { align: "center" });
  doc.text("Ministry of Health and Family Welfare", 105, 20, { align: "center" });
  doc.text("Directorate General of Health Services, Mohakhali, Dhaka-1212", 105, 25, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("NATIONAL MEASLES SITREP", 105, 40, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(formattedDate, 105, 48, { align: "center" });

  // Summary Table
  const totals = summary?.totals || {};
  autoTable(doc, {
    startY: 60,
    head: [['Indicator', 'Last 24 Hours', 'Cumulative Volume']],
    body: [
      ['Suspected Cases', totals.suspected24h || 0, cumulative.totals?.suspected24h || 0],
      ['Confirmed Cases', totals.confirmed24h || 0, cumulative.totals?.confirmed24h || 0],
      ['Admitted', totals.admitted24h || 0, cumulative.totals?.admitted24h || 0],
      ['Total Deaths', (Number(totals.suspectedDeath24h) || 0) + (Number(totals.confirmedDeath24h) || 0), (Number(cumulative.totals?.suspectedDeath24h) || 0) + (Number(cumulative.totals?.confirmedDeath24h) || 0)],
    ],
    theme: 'grid',
    styles: { halign: 'center', fontSize: 10 },
    headStyles: { fillColor: [30, 41, 59] }
  });

  // Division breakdown
  doc.setFont("helvetica", "bold");
  doc.text("Division-wise breakdown:", 14, (doc as any).lastAutoTable.finalY + 15);

  const breakdown = summary?.breakdown || {};
  const cumBreakdown = cumulative?.breakdown || {};
  const rows = Object.keys(breakdown).map(div => [
    div,
    breakdown[div].suspected24h || 0,
    breakdown[div].confirmed24h || 0,
    (Number(breakdown[div].suspectedDeath24h) || 0) + (Number(breakdown[div].confirmedDeath24h) || 0),
    cumBreakdown[div]?.suspected24h || 0,
    (Number(cumBreakdown[div]?.suspectedDeath24h) || 0) + (Number(cumBreakdown[div]?.confirmedDeath24h) || 0)
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['Division', 'Susp(24h)', 'Conf(24h)', 'Death(24h)', 'Susp(Cum)', 'Death(Cum)']],
    body: rows,
    theme: 'grid',
    styles: { halign: 'center', fontSize: 8 },
    headStyles: { fillColor: [51, 65, 85] }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(8);
  doc.text(`Report generated on: ${format(new Date(), "PPpp")}`, 14, finalY);

  return doc.output("arraybuffer");
}