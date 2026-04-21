import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
    const facilities = await p.facility.findMany({ select: { facilityName: true, district: true, division: true } });
    console.log(JSON.stringify(facilities, null, 2));
}
main().finally(() => p.$disconnect());
