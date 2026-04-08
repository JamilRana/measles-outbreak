import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

const BENGALI_NUMERALS: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

const toBengaliNumber = (num: number | string): string => {
  return String(num).split('').map(char => BENGALI_NUMERALS[char] || char).join('');
};

async function loadFont(doc: jsPDF) {
  try {
    const response = await fetch('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansbengali/NotoSansBengali-Regular.ttf');
    const buffer = await response.arrayBuffer();
    const binary = new Uint8Array(buffer);
    let base64 = "";
    for (let i = 0; i < binary.length; i++) { base64 += String.fromCharCode(binary[i]); }
    const fontBase64 = btoa(base64);
    doc.addFileToVFS('NotoSansBengali.ttf', fontBase64);
    doc.addFont('NotoSansBengali.ttf', 'NotoSansBengali', 'normal');
    doc.setFont('NotoSansBengali');
    return true;
  } catch (error) {
    console.error("Font loading error:", error);
    return false;
  }
}

export async function generateGovtPDF(reports: any[], filterDate: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const hasFont = await loadFont(doc);
  const fontName = hasFont ? 'NotoSansBengali' : 'helvetica';
  
  const dateObj = new Date(filterDate);
  const formattedDateBn = format(dateObj, "d MMMM yyyy", { locale: bn });
  const fileNameDate = format(dateObj, "dd_MM_yyyy");

  // WATERMARK
  doc.setTextColor(240, 240, 240);
  doc.setFontSize(60);
  doc.text("DGHS Bangladesh", 40, 150, { angle: 45 });
  
  doc.setTextColor(0);
  
  // HEADER (Government of Bangladesh style)
  doc.setFontSize(10);
  doc.text("গণপ্রজাতন্ত্রী বাংলাদেশ সরকার", 105, 15, { align: "center" });
  doc.text("স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়", 105, 20, { align: "center" });
  doc.text("স্বাস্থ্য সেবা বিভাগ", 105, 25, { align: "center" });
  doc.text("রোগ নিয়ন্ত্রণ কেন্দ্র", 105, 30, { align: "center" });
  doc.text("স্বাস্থ্য অধিদপ্তর, মহাখালী, ঢাকা-১২১২", 105, 35, { align: "center" });
  doc.text("ইমেইল: dghs.monitoring@gmail.com", 105, 40, { align: "center" });

  doc.setFont(fontName, "bold");
  doc.setFontSize(16);
  doc.text("হাম সংক্রান্ত পরিস্থিতি", 105, 52, { align: "center" });
  
  doc.setFont(fontName, "normal");
  doc.setFontSize(12);
  doc.text(toBengaliNumber(formattedDateBn), 105, 60, { align: "center" });
  
  doc.setFontSize(11);
  doc.text("স্বাস্থ্য অধিদপ্তরের আজকের স্বাস্থ্য সংবাদ বিজ্ঞপ্তি", 105, 68, { align: "center" });

  // SUMMARY SECTION
  const totals = reports.reduce((acc, r) => ({
    s24: acc.s24 + (r.suspected24h || 0),
    sYTD: acc.sYTD + (r.suspectedYTD || 0),
    c24: acc.c24 + (r.confirmed24h || 0),
    cYTD: acc.cYTD + (r.confirmedYTD || 0),
    aYTD: acc.aYTD + (r.admittedYTD || 0),
    dYTD: acc.dYTD + (r.dischargedYTD || 0),
  }), { s24: 0, sYTD: 0, c24: 0, cYTD: 0, aYTD: 0, dYTD: 0 });

  autoTable(doc, {
    startY: 75,
    head: [['গত ২৪ ঘণ্টায় সন্দেহজনক', 'মোট সন্দেহজনক (YTD)', 'গত ২৪ ঘণ্টায় নিশ্চিত', 'মোট নিশ্চিত (YTD)', 'মোট ভর্তি', 'মোট সুস্থ']],
    body: [[
      toBengaliNumber(totals.s24), toBengaliNumber(totals.sYTD),
      toBengaliNumber(totals.c24), toBengaliNumber(totals.cYTD),
      toBengaliNumber(totals.aYTD), toBengaliNumber(totals.dYTD)
    ]],
    theme: 'grid',
    styles: { halign: 'center', fontSize: 9, font: fontName, textColor: 0, lineColor: 0, lineWidth: 0.1 },
    headStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' }
  });

  // MORTALITY SECTION
  doc.setFontSize(12);
  doc.setFont(fontName, "bold");
  doc.text("বিভাগভিত্তিক মৃত্যুর তথ্য:", 14, (doc as any).lastAutoTable.finalY + 10);

  const divisionMortality = Object.values(reports.reduce((acc, r) => {
    if (!acc[r.division]) acc[r.division] = { name: r.division, s24: 0, sYTD: 0, c24: 0, cYTD: 0 };
    acc[r.division].s24 += (r.suspectedDeath24h || 0);
    acc[r.division].sYTD += (r.suspectedDeathYTD || 0);
    acc[r.division].c24 += (r.confirmedDeath24h || 0);
    acc[r.division].cYTD += (r.confirmedDeathYTD || 0);
    return acc;
  }, {} as any)).map((m: any) => [
      m.name, toBengaliNumber(m.s24), toBengaliNumber(m.sYTD), toBengaliNumber(m.c24), toBengaliNumber(m.cYTD)
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['বিভাগ', 'গত ২৪ ঘণ্টায় মৃত্যু (সঃ)', 'মোট মৃত্যু (সঃ/YTD)', 'গত ২৪ ঘণ্টায় মৃত্যু (নিঃ)', 'মোট মৃত্যু (নিঃ/YTD)']],
    body: divisionMortality,
    theme: 'grid',
    styles: { halign: 'center', fontSize: 9, font: fontName, textColor: 0, lineColor: 0, lineWidth: 0.1 },
    headStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' }
  });

  // MAIN DIVISION-WISE TABLE
  doc.addPage();
  doc.setFontSize(12);
  doc.setFont(fontName, "bold");
  doc.text("বিভাগভিত্তিক বিস্তারিত তথ্য:", 14, 20);

  const divisionDetailed = Object.values(reports.reduce((acc, r) => {
    if (!acc[r.division]) acc[r.division] = { name: r.division, s24: 0, a24: 0, dis24: 0, sd24: 0, c24: 0, cd24: 0, sY: 0, aY: 0, dY: 0, sdY: 0, cY: 0, cdY: 0 };
    acc[r.division].s24 += (r.suspected24h || 0);
    acc[r.division].a24 += (r.admitted24h || 0);
    acc[r.division].dis24 += (r.discharged24h || 0);
    acc[r.division].sd24 += (r.suspectedDeath24h || 0);
    acc[r.division].c24 += (r.confirmed24h || 0);
    acc[r.division].cd24 += (r.confirmedDeath24h || 0);
    acc[r.division].sY += (r.suspectedYTD || 0);
    acc[r.division].aY += (r.admittedYTD || 0);
    acc[r.division].dY += (r.dischargedYTD || 0);
    acc[r.division].sdY += (r.suspectedDeathYTD || 0);
    acc[r.division].cY += (r.confirmedYTD || 0);
    acc[r.division].cdY += (r.confirmedDeathYTD || 0);
    return acc;
  }, {} as any)).map((d: any) => [
      d.name, toBengaliNumber(d.s24), toBengaliNumber(d.a24), toBengaliNumber(d.dis24), toBengaliNumber(d.sd24), toBengaliNumber(d.c24), toBengaliNumber(d.cd24),
      toBengaliNumber(d.sY), toBengaliNumber(d.aY), toBengaliNumber(d.dY), toBengaliNumber(d.sdY), toBengaliNumber(d.cY), toBengaliNumber(d.cdY)
  ]);

  autoTable(doc, {
    startY: 25,
    head: [['বিভাগ', 'সঃ(২৪ঘ)', 'ভর্তি', 'ছুটি', 'মৃত্যু(সঃ)', 'নিঃ(২৪ঘ)', 'মৃত্যু(নিঃ)', 'মোট সঃ', 'মোট ভর্তি', 'মোট ছুটি', 'মোট মৃ(সঃ)', 'মোট নিঃ', 'মোট মৃ(নিঃ)']],
    body: divisionDetailed,
    theme: 'grid',
    styles: { halign: 'center', fontSize: 7, font: fontName, textColor: 0, lineColor: 0, lineWidth: 0.1, cellPadding: 1.5 },
    headStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [252, 252, 252] }
  });

  // FOOTER
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(9);
  doc.setFont(fontName, "normal");
  doc.text("*** তথ্য হালনাগাদের ভিত্তিতে ***", 14, finalY);
  doc.text(toBengaliNumber(format(new Date(), "dd-MM-yyyy")), 196, finalY, { align: "right" });

  const sigY = finalY + 30;
  doc.text("স্বাক্ষর", 185, sigY, { align: "center" });
  doc.setFont(fontName, "bold");
  doc.text("মেডিকেল অফিসার", 185, sigY + 5, { align: "center" });
  doc.text("স্বাস্থ্য অধিদপ্তর", 185, sigY + 10, { align: "center" });

  // Page Numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`পৃষ্ঠা - ${toBengaliNumber(i)}`, 105, 285, { align: "center" });
  }

  doc.save(`measles_report_${fileNameDate}.pdf`);
}
