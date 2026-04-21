import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { facilityId: { not: null } },
    select: { email: true, facility: { select: { facilityName: true, division: true, district: true } } },
    take: 10
  });
  const normalizedUsers = users.map(u => ({
    email: u.email,
    facilityName: u.facility?.facilityName,
    division: u.facility?.division,
    district: u.facility?.district
  }));
  console.log(JSON.stringify(normalizedUsers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
