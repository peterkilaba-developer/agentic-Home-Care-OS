import React, { useState } from 'react';
import { Shield, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

export default function TrialBanner({ homeData }) {
  const [loading, setLoading] = useState(false);

  if (!homeData) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const response = await createCheckoutSession({
        homeName: homeData.homeName,
        address: homeData.address || '',
        licenseNumber: homeData.licenseNumber || '',
        capacity: homeData.capacity || 4,
        careType: homeData.careType || '',
        refId: homeData.refId || null
      });
      if (response.data && response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      console.error("Stripe Checkout Error:", err);
      setLoading(false);
    }
  };

  const isSuspended = homeData.paymentSuspendedUntil && new Date(homeData.paymentSuspendedUntil) > new Date();
  
  if (isSuspended) {
    return (
      <div className="mb-8 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
           <Shield className="w-5 h-5 text-indigo-400" />
           <div>
             <h4 className="font-bold text-sm">Extended Grace Period Active</h4>
             <p className="text-indigo-400/80 text-xs mt-0.5">Your platform billing has been temporarily suspended by an administrator.</p>
           </div>
        </div>
      </div>
    );
  }

  if (homeData.subscriptionStatus === 'incubation') {
    return (
      <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
           <Zap className="w-5 h-5 text-emerald-500" />
           <div>
             <h4 className="font-bold text-sm">Incubation Mode Active</h4>
             <p className="text-emerald-500/80 text-xs mt-0.5">Your OS is 100% free until you admit your first resident. Build your facility with confidence.</p>
           </div>
        </div>
      </div>
    );
  }

  if (homeData.subscriptionStatus === 'trial') {
    let diffDays = 14;
    if (homeData.trialEndsAt) {
      const endsAt = homeData.trialEndsAt.toDate ? homeData.trialEndsAt.toDate() : new Date(homeData.trialEndsAt);
      diffDays = Math.max(0, Math.ceil((endsAt - new Date()) / (1000 * 60 * 60 * 24)));
    } else if (homeData.createdAt) {
      const createdDate = homeData.createdAt.toDate ? homeData.createdAt.toDate() : new Date(homeData.createdAt);
      const endsAt = new Date(createdDate);
      endsAt.setDate(endsAt.getDate() + 14);
      diffDays = Math.max(0, Math.ceil((endsAt - new Date()) / (1000 * 60 * 60 * 24)));
    }

    return (
      <div className="mb-8 p-4 bg-accent/10 border border-accent/30 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
           <AlertTriangle className="w-5 h-5 text-accent" />
           <div>
             <h4 className="font-bold text-sm">Free Trial Active</h4>
             <p className="text-accent/80 text-xs mt-0.5">You have {diffDays} days remaining in your freemium access period.</p>
           </div>
        </div>
        <button onClick={handleSubscribe} disabled={loading} className="bg-accent hover:bg-emerald-500 text-background px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            homeData?.careType === 'Assisted Living Facility > 10 Beds' 
              ? "Activate Premium ($497/mo + $97/staff)" 
              : "Activate Premium ($497/mo)"
          )}
        </button>
      </div>
    );
  }

  return null;
}
