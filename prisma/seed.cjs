require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');

// For Prisma 7 with SQLite, we need to provide the full path
const dbPath = path.resolve(__dirname, 'dev.db');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: `file:${dbPath}`
        }
    }
});

async function main() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pinkballoon.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'PinkInCommand';
    const adminName = process.env.ADMIN_NAME || 'Admin PinkBalloon';
    const adminHandle = process.env.ADMIN_CF_HANDLE || 'tourist';

    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
        console.log('Admin already exists:', adminEmail);
        await prisma.$disconnect();
        return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.create({
        data: {
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            codeforcesHandle: adminHandle,
            role: 'admin',
        }
    });

    console.log('Admin created:', admin.email);

    await prisma.announcement.create({
        data: {
            content: 'Bem-vindas ao PinkBalloon! Vamos juntas evoluir em programacao competitiva!'
        }
    });

    console.log('Sample announcement created');
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
