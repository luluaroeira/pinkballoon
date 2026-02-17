import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// PUT /api/admin/exercises/[id] - Update exercise
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const exerciseId = parseInt(id);
        const body = await request.json();
        const { type, contestId, problemIndex, title, description, points, publishedAt } = body;

        // Build update data
        const updateData: Record<string, unknown> = {};

        if (type) updateData.type = type;
        if (contestId) updateData.contestId = parseInt(contestId);
        if (problemIndex) updateData.problemIndex = problemIndex.toUpperCase();
        if (title !== undefined) updateData.title = title || null;
        if (description !== undefined) updateData.description = description || null;
        if (points) updateData.points = parseInt(points);

        // If publishedAt or type changed, recalculate expiresAt
        if (publishedAt || type) {
            const existingExercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
            if (existingExercise) {
                const pubDate = publishedAt ? new Date(publishedAt) : existingExercise.publishedAt;
                const exType = type || existingExercise.type;

                updateData.publishedAt = pubDate;
                const expiresAt = new Date(pubDate);
                if (exType === 'daily') {
                    expiresAt.setHours(expiresAt.getHours() + 24);
                } else {
                    expiresAt.setDate(expiresAt.getDate() + 7);
                }
                updateData.expiresAt = expiresAt;
            }
        }

        const exercise = await prisma.exercise.update({
            where: { id: exerciseId },
            data: updateData,
        });

        await prisma.auditLog.create({
            data: {
                action: 'EXERCISE_UPDATED',
                details: `Admin updated exercise #${exerciseId}`,
                userId: session.userId,
                exerciseId: exerciseId,
            }
        });

        return NextResponse.json({ exercise, message: 'Exercício atualizado!' });
    } catch (error) {
        console.error('Update exercise error:', error);
        return NextResponse.json({ error: 'Erro ao atualizar exercício' }, { status: 500 });
    }
}

// DELETE /api/admin/exercises/[id] - Delete exercise
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const exerciseId = parseInt(id);

        // Delete completions first
        await prisma.exerciseCompletion.deleteMany({
            where: { exerciseId }
        });

        await prisma.exercise.delete({
            where: { id: exerciseId }
        });

        await prisma.auditLog.create({
            data: {
                action: 'EXERCISE_DELETED',
                details: `Admin deleted exercise #${exerciseId}`,
                userId: session.userId,
                exerciseId: exerciseId,
            }
        });

        return NextResponse.json({ message: 'Exercício removido!' });
    } catch (error) {
        console.error('Delete exercise error:', error);
        return NextResponse.json({ error: 'Erro ao remover exercício' }, { status: 500 });
    }
}
