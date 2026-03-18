import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';

const tiers = [
  {
    name: 'Small Gym',
    id: 'small_gym',
    href: '#',
    priceMonthly: '€69',
    description: 'Perfect for small gyms starting to manage their fighters.',
    features: [
      'Up to 2 Administrators/Coaches',
      'Up to 50 Athletes',
      'Document Management & Expiry Alerts',
      'Performance Tracking',
      'Basic Support',
    ],
    mostPopular: false,
  },
  {
    name: 'Unlimited',
    id: 'unlimited',
    href: '#',
    priceMonthly: '€150',
    description: 'For established gyms with a large roster of fighters.',
    features: [
      'Unlimited Administrators/Coaches',
      'Unlimited Athletes',
      'Advanced Analytics & Reporting',
      'Priority Support',
      'Custom Branding (Coming Soon)',
    ],
    mostPopular: true,
  },
];

export default function Pricing() {
  const { user, profile } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (tierId: string) => {
    if (!user) {
      setError('You must be logged in to subscribe.');
      return;
    }
    
    setLoadingTier(tierId);
    setError(null);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: tierId,
          userId: user.uid,
          email: user.email,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err: any) {
      setError(err.message);
      setLoadingTier(null);
    }
  };

  const currentPlan = profile?.subscription?.plan;
  const isSubscribed = profile?.subscription?.status === 'active';

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-emerald-400">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Choose the right plan for your gym
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-zinc-300">
          Whether you're a small local gym or a large fight team, we have a plan that fits your needs.
        </p>

        {error && (
          <div className="mx-auto mt-8 max-w-2xl rounded-xl bg-red-500/10 p-4 border border-red-500/20 text-center text-red-400">
            {error}
          </div>
        )}

        {isSubscribed && (
          <div className="mx-auto mt-8 max-w-2xl rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20 text-center text-emerald-400">
            You are currently subscribed to the <strong>{currentPlan === 'small_gym' ? 'Small Gym' : 'Unlimited'}</strong> plan.
          </div>
        )}

        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:gap-x-8 xl:gap-x-12">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={clsx(
                tier.mostPopular ? 'ring-2 ring-emerald-500' : 'ring-1 ring-zinc-800',
                'rounded-3xl p-8 xl:p-10 bg-zinc-900'
              )}
            >
              <div className="flex items-center justify-between gap-x-4">
                <h3
                  id={tier.id}
                  className={clsx(
                    tier.mostPopular ? 'text-emerald-400' : 'text-white',
                    'text-lg font-semibold leading-8'
                  )}
                >
                  {tier.name}
                </h3>
                {tier.mostPopular ? (
                  <p className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold leading-5 text-emerald-400">
                    Most popular
                  </p>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-300">{tier.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-white">{tier.priceMonthly}</span>
                <span className="text-sm font-semibold leading-6 text-zinc-300">/month</span>
              </p>
              <button
                onClick={() => handleSubscribe(tier.id)}
                disabled={loadingTier !== null || (isSubscribed && currentPlan === tier.id)}
                aria-describedby={tier.id}
                className={clsx(
                  tier.mostPopular
                    ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-400'
                    : 'bg-white/10 text-white hover:bg-white/20',
                  'mt-6 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2'
                )}
              >
                {loadingTier === tier.id && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubscribed && currentPlan === tier.id ? 'Current Plan' : 'Subscribe'}
              </button>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-zinc-300 xl:mt-10">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-emerald-400" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
