'use client';
import { useState } from 'react';

interface Props {
  plan: Record<string, unknown>;
}

export default function PlanEditForm({ plan }: Props) {
  const data = (plan.data || {}) as Record<string, Record<string, unknown>>;
  const [name, setName] = useState(plan.name as string);
  const [amount, setAmount] = useState(plan.amount as number);
  const [stripeId, setStripeId] = useState((plan.stripe_id as string) || '');
  const [paddleId, setPaddleId] = useState((plan.paddle_id as string) || '');
  const [active, setActive] = useState(plan.active as boolean);
  const [deDescription, setDeDescription] = useState((data.de?.description as string) || '');
  const [deTagline, setDeTagline] = useState((data.de?.tagline as string) || '');
  const [deFeatures, setDeFeatures] = useState<string[]>((data.de?.features as string[]) || ['']);
  const [enDescription, setEnDescription] = useState((data.en?.description as string) || '');
  const [enTagline, setEnTagline] = useState((data.en?.tagline as string) || '');
  const [enFeatures, setEnFeatures] = useState<string[]>((data.en?.features as string[]) || ['']);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const planData = {
      de: { description: deDescription, tagline: deTagline, features: deFeatures.filter(Boolean) },
      en: { description: enDescription, tagline: enTagline, features: enFeatures.filter(Boolean) },
    };

    const res = await fetch(`/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount, stripe_id: stripeId, paddle_id: paddleId, active, data: planData }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage('Plan updated successfully!');
    } else {
      setMessage('Error updating plan');
    }
  };

  const updateFeature = (lang: 'de' | 'en', index: number, value: string) => {
    const setter = lang === 'de' ? setDeFeatures : setEnFeatures;
    const features = lang === 'de' ? [...deFeatures] : [...enFeatures];
    features[index] = value;
    setter(features);
  };

  const addFeature = (lang: 'de' | 'en') => {
    const setter = lang === 'de' ? setDeFeatures : setEnFeatures;
    const features = lang === 'de' ? [...deFeatures] : [...enFeatures];
    features.push('');
    setter(features);
  };

  const removeFeature = (lang: 'de' | 'en', index: number) => {
    const setter = lang === 'de' ? setDeFeatures : setEnFeatures;
    const features = lang === 'de' ? [...deFeatures] : [...enFeatures];
    features.splice(index, 1);
    setter(features);
  };

  const renderFeatures = (lang: 'de' | 'en', features: string[]) => (
    <div className="space-y-2">
      <label className="text-sm text-gray-400">Features ({lang.toUpperCase()})</label>
      {features.map((f, i) => (
        <div key={i} className="flex gap-2">
          <textarea
            value={f}
            onChange={(e) => updateFeature(lang, i, e.target.value)}
            rows={2}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
          />
          <button type="button" onClick={() => removeFeature(lang, i)}
                  className="text-red-400 hover:text-red-300 text-sm px-2">Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => addFeature(lang)}
              className="text-blue-400 hover:text-blue-300 text-sm">+ Add Feature</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && <div className={`text-sm px-3 py-2 rounded ${message.includes('Error') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>{message}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-400 block mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Amount (cents)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
                 className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Stripe ID</label>
          <input value={stripeId} onChange={(e) => setStripeId(e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Paddle ID</label>
          <input value={paddleId} onChange={(e) => setPaddleId(e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-400">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Active
      </label>

      <div className="border border-gray-700 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">German (DE)</h3>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Description</label>
          <textarea value={deDescription} onChange={(e) => setDeDescription(e.target.value)} rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Tagline</label>
          <input value={deTagline} onChange={(e) => setDeTagline(e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white" />
        </div>
        {renderFeatures('de', deFeatures)}
      </div>

      <div className="border border-gray-700 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">English (EN)</h3>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Description</label>
          <textarea value={enDescription} onChange={(e) => setEnDescription(e.target.value)} rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Tagline</label>
          <input value={enTagline} onChange={(e) => setEnTagline(e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white" />
        </div>
        {renderFeatures('en', enFeatures)}
      </div>

      <button type="submit" disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-500 disabled:opacity-50">
        {saving ? 'Saving...' : 'Update Plan'}
      </button>
    </form>
  );
}
