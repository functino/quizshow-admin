'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

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
      <Label>Features ({lang.toUpperCase()})</Label>
      {features.map((f, i) => (
        <div key={i} className="flex gap-2">
          <textarea
            value={f}
            onChange={(e) => updateFeature(lang, i, e.target.value)}
            rows={2}
            className="flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
          <Button type="button" variant="destructive" size="sm" onClick={() => removeFeature(lang, i)}>Remove</Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => addFeature(lang)}>+ Add Feature</Button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className={`text-sm px-4 py-2 rounded-lg ${message.includes('Error') ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Amount (cents)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Stripe ID</Label>
          <Input value={stripeId} onChange={(e) => setStripeId(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Paddle ID</Label>
          <Input value={paddleId} onChange={(e) => setPaddleId(e.target.value)} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded" />
        Active
      </label>

      <Card>
        <CardHeader>
          <CardTitle>German (DE)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea value={deDescription} onChange={(e) => setDeDescription(e.target.value)} rows={2}
                      className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label>Tagline</Label>
            <Input value={deTagline} onChange={(e) => setDeTagline(e.target.value)} />
          </div>
          {renderFeatures('de', deFeatures)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>English (EN)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea value={enDescription} onChange={(e) => setEnDescription(e.target.value)} rows={2}
                      className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label>Tagline</Label>
            <Input value={enTagline} onChange={(e) => setEnTagline(e.target.value)} />
          </div>
          {renderFeatures('en', enFeatures)}
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Update Plan'}
      </Button>
    </form>
  );
}
