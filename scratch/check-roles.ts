import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
    const user = await p.user.findFirst();
    console.log('Sample user:', user);
    const roles = await p.user.findMany({ select: { role: true } });
    console.log('Unique roles:', new Set(roles.map(r => r.role)));
}
main().finally(() => p.$disconnect());
