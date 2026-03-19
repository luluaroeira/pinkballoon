import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'admin@pinkballoon.com';
    // Forcing manual overwrite locally or in Vercel.
    const adminPassword = 'PinkInCommand';
    const adminName = process.env.ADMIN_NAME || 'Admin PinkBalloon';
    const adminHandle = process.env.ADMIN_CF_HANDLE || 'tourist';

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
        console.log('Admin already exists. Updating password...', adminEmail);
        await prisma.user.update({
            where: { email: adminEmail },
            data: { password: hashedPassword, role: 'admin' }
        });
        return;
    }

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
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
