import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching all facility users...");
  const users = await prisma.user.findMany({
    where: { facilityId: { not: null } },
    select: { 
      email: true, 
      facility: { 
        select: { division: true, district: true } 
      } 
    }
  });

  if (users.length === 0) {
    console.warn("No facility users found in database. Using dummy data.");
  }

  const reportingDate = "2026-04-18";
  const data = users.map(u => ({
    email: u.email,
    reportingDate: reportingDate,
    division: u.facility?.division || "N/A",
    district: u.facility?.district || "N/A",
    suspected24h: Math.floor(Math.random() * 20),
    confirmed24h: Math.floor(Math.random() * 10),
    suspectedDeath24h: Math.floor(Math.random() * 2),
    confirmedDeath24h: 0,
    admitted24h: Math.floor(Math.random() * 15),
    discharged24h: Math.floor(Math.random() * 10)
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reports");

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const filePath = path.join(publicDir, 'sample-reports.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`Sample Excel generated with ${data.length} users at: ${filePath}`);

  const csvFilePath = path.join(publicDir, 'sample-reports.csv');
  const headers = "email,reportingdate,division,district,suspected24h,confirmed24h,suspecteddeath24h,confirmeddeath24h,admitted24h,discharged24h\n";
  const csvRows = data.map(d => `${d.email},${d.reportingDate},${d.division},${d.district},${d.suspected24h},${d.confirmed24h},${d.suspectedDeath24h},${d.confirmedDeath24h},${d.admitted24h},${d.discharged24h}`);
  fs.writeFileSync(csvFilePath, headers + csvRows.join("\n"));
  console.log(`Sample CSV generated with ${data.length} users at: ${csvFilePath}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
