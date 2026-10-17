'use client';

import { useState } from 'react';
import { Wifi, Eye, EyeOff, Copy, Check, QrCode, Info } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';
import { useRestaurant } from '@/components/providers/restaurant-provider';
import { QrCodeImage } from '@/components/shared/qr-code';
import { CustomerHeader } from '@/components/shared/customer-header';
import { CustomerFooter } from '@/components/shared/customer-footer';
import { cn } from '@/lib/utils';

export default function WifiPage() {
  const { wifi: wifiSettings } = useRestaurant();
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedSsid, setCopiedSsid] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const enabled = wifiSettings.enabled;

  const copyToClipboard = async (text: string, type: 'ssid' | 'pass') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'ssid') {
        setCopiedSsid(true);
        setTimeout(() => setCopiedSsid(false), 2000);
      } else {
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 2000);
      }
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (type === 'ssid') {
        setCopiedSsid(true);
        setTimeout(() => setCopiedSsid(false), 2000);
      } else {
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 2000);
      }
    }
  };

  // Generate Wi-Fi QR code string
  // Format: WIFI:T:WPA;S:SSID;P:PASSWORD;H:false;;
  const escapeWifi = (str: string) => str.replace(/([\\;,:"])/g, '\\$1');
  const wifiQrString = `WIFI:T:${wifiSettings.security};S:${escapeWifi(wifiSettings.ssid)};P:${escapeWifi(wifiSettings.password)};H:${wifiSettings.hidden};;`;

  // Generate QR code using a free QR API as data URL
  // We'll use a server-side QR generation approach via canvas
  // Generate locally so network credentials never leave this device for QR generation.

  if (!enabled) {
    return (
      <div className="min-h-screen bg-background">
        <CustomerHeader page="wifi" />
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-secondary">
            <Wifi className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            {t('wifiDisabled')}
          </p>
        </div>
        <CustomerFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader page="wifi" />

      {/* Hero */}
      <div className="relative h-40 overflow-hidden sm:h-48">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground to-accent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Wifi className="h-32 w-32 text-gold/10" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
          <Wifi className="h-10 w-10 text-gold animate-fade-in" />
          <h1 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl animate-fade-in-up">
            {t('wifiAccess')}
          </h1>
          <p className="mt-2 text-sm text-white/60 animate-fade-in-up delay-100">
            {t('wifiInstructions')}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {/* Credentials card */}
        <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm animate-fade-in-up sm:p-8">
          {/* Network Name */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              {t('networkName')}
            </label>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
              <span className="font-serif text-lg font-medium">{wifiSettings.ssid}</span>
              <button
                onClick={() => copyToClipboard(wifiSettings.ssid, 'ssid')}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-all hover:bg-secondary"
              >
                {copiedSsid ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    {t('copy')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="mt-5 space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              {t('password')}
            </label>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
              <span className="font-mono text-lg font-medium tracking-wider">
                {showPassword ? wifiSettings.password : '•'.repeat(wifiSettings.password.length)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-all hover:bg-secondary"
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => copyToClipboard(wifiSettings.password, 'pass')}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-all hover:bg-secondary"
                >
                  {copiedPass ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      {t('copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      {t('copy')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code card */}
        <div className="mt-6 rounded-2xl border border-border/40 bg-card p-6 shadow-sm animate-fade-in-up delay-100 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-gold" />
              <h2 className="font-serif text-xl font-medium">{t('scanToConnect')}</h2>
            </div>
            <div className="rounded-2xl border-2 border-gold/20 bg-white p-6 shadow-sm">
              <QrCodeImage value={wifiQrString} size={224} className="h-56 w-56" />
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {t('connectionInstructions')}
            </p>
          </div>
        </div>

        {/* Info card */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 animate-fade-in-up delay-200">
          <Info className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            {t('connectionInstructions')} For devices that don\'t support QR Wi-Fi, manually connect using the credentials above.
          </p>
        </div>
      </div>

      <CustomerFooter />
    </div>
  );
}
