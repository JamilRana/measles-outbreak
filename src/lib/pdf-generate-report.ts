import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportData {
  reportingDate: string;
  division: string;
  district: string;
  facilityName: string;
  suspected24h: number;
  suspectedYTD: number;
  confirmed24h: number;
  confirmedYTD: number;
  suspectedDeath24h: number;
  suspectedDeathYTD: number;
  confirmedDeath24h: number;
  confirmedDeathYTD: number;
  admitted24h: number;
  admittedYTD: number;
  discharged24h: number;
  dischargedYTD: number;
  serumSentYTD: number;
}

interface Totals {
  suspected: number;
  confirmed: number;
  deaths: number;
  hospitalized: number;
  discharged: number;
}

export function generatePDF(data: ReportData[], totals: Totals, filterDate: string, facilityName?: string): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text("Measles Outbreak Monitoring Report", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Report Date: ${filterDate}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
  if (facilityName) {
    doc.text(`Facility: ${facilityName}`, 14, 42);
  }

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Summary:", 14, 52);
  doc.setFontSize(10);
  
  const cfr = totals.confirmed > 0 ? ((totals.deaths / totals.confirmed) * 100).toFixed(2) : "0.00";
  const confirmationRate = totals.suspected > 0 ? ((totals.confirmed / totals.suspected) * 100).toFixed(2) : "0.00";
  const admissionRate = totals.suspected > 0 ? ((totals.hospitalized / totals.suspected) * 100).toFixed(2) : "0.00";

  doc.text(`Total Suspected Cases (YTD): ${totals.suspected.toLocaleString()}`, 14, 60);
  doc.text(`Total Confirmed Cases (YTD): ${totals.confirmed.toLocaleString()}`, 14, 66);
  doc.text(`Total Deaths (YTD): ${totals.deaths.toLocaleString()}`, 14, 72);
  doc.text(`Total Admitted (YTD): ${totals.hospitalized.toLocaleString()}`, 14, 78);
  doc.text(`Total Discharged (YTD): ${totals.discharged.toLocaleString()}`, 14, 84);

  doc.setFontSize(11);
  doc.text("Indicators:", 14, 94);
  doc.setFontSize(10);
  doc.text(`Case Fatality Rate (CFR): ${cfr}%`, 14, 100);
  doc.text(`Confirmation Rate: ${confirmationRate}%`, 14, 106);
  doc.text(`Hospitalization Efficiency: ${admissionRate}%`, 14, 112);

  const tableData = data.map(r => [
    r.division,
    r.district,
    r.facilityName,
    r.suspected24h,
    r.confirmed24h,
    r.suspectedDeath24h + r.confirmedDeath24h,
    r.admitted24h,
    r.discharged24h,
  ]);

  autoTable(doc, {
    startY: 122,
    head: [['Division', 'District', 'Facility', 'Susp.', 'Conf.', 'Deaths', 'Adm.', 'Disch.']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 40 },
    },
  });

  return doc;
}

export function generateUserReportPDF(data: ReportData[], filterDate: string, facilityName: string): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text("My Submitted Reports", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Facility: ${facilityName}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

  const totalSuspected = data.reduce((sum, r) => sum + r.suspected24h, 0);
  const totalConfirmed = data.reduce((sum, r) => sum + r.confirmed24h, 0);
  const totalDeaths = data.reduce((sum, r) => sum + r.suspectedDeath24h + r.confirmedDeath24h, 0);
  const totalAdmitted = data.reduce((sum, r) => sum + r.admitted24h, 0);
  const totalDischarged = data.reduce((sum, r) => sum + r.discharged24h, 0);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Summary:", 14, 46);
  doc.setFontSize(10);
  doc.text(`Total Reports: ${data.length}`, 14, 54);
  doc.text(`Total Suspected (24h): ${totalSuspected}`, 14, 60);
  doc.text(`Total Confirmed (24h): ${totalConfirmed}`, 14, 66);
  doc.text(`Total Deaths (24h): ${totalDeaths}`, 14, 72);
  doc.text(`Total Admitted (24h): ${totalAdmitted}`, 14, 78);
  doc.text(`Total Discharged (24h): ${totalDischarged}`, 14, 84);

  const cfr = totalConfirmed > 0 ? ((totalDeaths / totalConfirmed) * 100).toFixed(2) : "0.00";
  const confirmationRate = totalSuspected > 0 ? ((totalConfirmed / totalSuspected) * 100).toFixed(2) : "0.00";
  const admissionRate = totalSuspected > 0 ? ((totalAdmitted / totalSuspected) * 100).toFixed(2) : "0.00";

  doc.setFontSize(11);
  doc.text("Indicators:", 14, 94);
  doc.setFontSize(10);
  doc.text(`Case Fatality Rate (CFR): ${cfr}%`, 14, 100);
  doc.text(`Confirmation Rate: ${confirmationRate}%`, 14, 106);
  doc.text(`Hospitalization Efficiency: ${admissionRate}%`, 14, 112);

  const tableData = data.map(r => [
    new Date(r.reportingDate).toLocaleDateString(),
    r.division,
    r.district,
    r.suspected24h,
    r.confirmed24h,
    r.suspectedDeath24h + r.confirmedDeath24h,
  ]);

  autoTable(doc, {
    startY: 122,
    head: [['Date', 'Division', 'District', 'Susp.', 'Conf.', 'Deaths']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9 },
  });

  return doc;
}