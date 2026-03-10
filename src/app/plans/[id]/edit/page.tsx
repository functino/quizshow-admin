import { query } from '@/lib/db';
import Link from 'next/link';
import PlanEditForm from './PlanEditForm';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPlanPage({ params }: Props) {
  const { id } = await params;
  const [plan] = await query('SELECT * FROM plans WHERE id = $1', [id]);

  if (!plan) {
    return <div className="text-red-400">Plan not found</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/plans" className="text-gray-400 hover:text-white text-sm">&larr; Back to Plans</Link>
        <h1 className="text-lg font-bold text-white">Edit Plan: {plan.name as string}</h1>
      </div>

      <PlanEditForm plan={plan} />
    </div>
  );
}
