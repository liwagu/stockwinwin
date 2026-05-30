"use client";

import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { readAttributionParams, trackEvent } from "@/lib/analytics";
import { SUPPORTED_MARKETS } from "@/lib/markets";

export function InterestForm() {
  const [email, setEmail] = useState('');
  const [preferredAssets, setPreferredAssets] = useState<string[]>([]);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError('');
    setMessage(null);
  };

  const handleAssetToggle = (assetId: string) => {
    setPreferredAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setEmailError('');

    // Validate email
    if (!email) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate consent
    if (!consentMarketing) {
      setMessage({ type: 'error', text: 'Please consent to receive updates' });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          preferred_assets: preferredAssets.length > 0 ? preferredAssets : null,
          consent_marketing: consentMarketing,
          source: "interest_form",
          ...readAttributionParams(),
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || "Thank you! We'll notify you when custom predictions are available."
        });
        trackEvent("interest_submitted", {
          source_page: window.location.pathname,
          preferred_asset_count: preferredAssets.length,
        });
        // Reset form
        setEmail('');
        setPreferredAssets([]);
        setConsentMarketing(false);
      } else {
        setMessage({
          type: 'error',
          text: data.detail?.message || data.message || 'Failed to submit. Please try again.'
        });
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="sw-card w-full">
      <CardHeader>
        <p className="sw-label">INTEREST LIST</p>
        <CardTitle className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">Custom forecast requests</CardTitle>
        <p className="text-sm leading-6 text-[var(--color-ink-2)]">
          Join the list for custom stock and crypto prediction coverage.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={handleEmailChange}
              onFocus={() => trackEvent("interest_form_started", { source_page: window.location.pathname })}
              disabled={loading}
              className={`sw-input ${emailError ? 'border-[var(--color-negative)]' : ''}`}
            />
            {emailError && (
              <p className="text-sm text-[var(--color-negative)]">{emailError}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Interested in (optional)</Label>
            <div className="grid max-h-72 gap-2 overflow-y-auto pr-2 sm:grid-cols-2">
              {SUPPORTED_MARKETS.map((asset) => (
                <div key={asset.symbol} className="flex items-center space-x-2">
                  <Checkbox
                    id={asset.symbol}
                    checked={preferredAssets.includes(asset.symbol)}
                    onCheckedChange={() => handleAssetToggle(asset.symbol)}
                    disabled={loading}
                  />
                  <label
                    htmlFor={asset.symbol}
                  className="cursor-pointer text-sm font-medium leading-none text-[var(--color-ink-2)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {asset.displayName} ({asset.symbol})
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Marketing Consent */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="consent"
              checked={consentMarketing}
              onCheckedChange={(checked) => setConsentMarketing(checked as boolean)}
              disabled={loading}
            />
            <label
              htmlFor="consent"
              className="cursor-pointer text-sm leading-snug text-[var(--color-ink-2)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree to receive updates and marketing communications from StockWin *
            </label>
          </div>

          <button
            type="submit"
            className="sw-button-primary w-full disabled:pointer-events-none disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Notify Me'}
          </button>

          {/* Success/Error Message */}
          {message && (
            <div className={`flex gap-3 rounded-[var(--radius-input)] border p-4 ${
              message.type === 'success'
                ? 'border-[var(--color-accent-2)] bg-[color-mix(in_oklch,var(--color-accent-2)_9%,transparent)] text-[var(--color-ink)]'
                : 'border-[var(--color-negative)] bg-[color-mix(in_oklch,var(--color-negative)_9%,transparent)] text-[var(--color-negative)]'
            }`}>
              {message.type === 'success' ? (
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              )}
              <p className="text-sm font-medium">
                {message.text}
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
