'use client';

import { useState } from 'react';
import { Star, ExternalLink, MessageCircle, Check, Send } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';
import { restaurantInfo } from '@/lib/data';
import { useRestaurant } from '@/components/providers/restaurant-provider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { CustomerHeader } from '@/components/shared/customer-header';
import { CustomerFooter } from '@/components/shared/customer-footer';
import { cn } from '@/lib/utils';

export default function FeedbackPage() {
  const { settings: restaurantInfo } = useRestaurant();
  const { t, locale } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const name_restaurant = locale === 'ar' ? restaurantInfo.nameAr : locale === 'fr' ? restaurantInfo.nameFr : restaurantInfo.name;

  const [sending, setSending] = useState(false);
  const handlePrivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || sending) return;
    setSending(true);
    const { error } = await supabase.from('guest_feedback').insert({ rating, customer_name: name.trim().slice(0,100) || null, comment: comment.trim().slice(0,2000) || null });
    setSending(false);
    if (error) { toast.error('We couldn’t save your feedback. Please try again or contact our team.'); return; }
    setSubmitted(true);
  };

  const whatsappMessage = encodeURIComponent(
    `Hello ${name_restaurant}, I recently visited your restaurant and would like to share my experience.\n\nRating: ${rating}/5${comment ? `\nFeedback: ${comment}` : ''}${name ? `\nName: ${name}` : ''}`
  );

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader page="feedback" />

      {/* Hero */}
      <div className="relative h-48 overflow-hidden sm:h-56">
        <img
          src="/images/8856555.jpg"
          alt="Feedback"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl animate-fade-in-up">
            {t('howWasExperience')}
          </h1>
          <p className="mt-3 max-w-lg px-4 text-sm text-white/70 animate-fade-in-up delay-100">
            {t('feedbackWelcome')}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {submitted ? (
          /* Thank you screen */
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold bg-gold/10 animate-scale-in">
              <Check className="h-10 w-10 text-gold" />
            </div>
            <h2 className="mt-6 font-serif text-3xl font-semibold">{t('feedbackThanks')}</h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              {t('feedbackThanksDesc')}
            </p>

            {/* Still show both options after submission */}
            <div className="mt-8 w-full max-w-md space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                    <Star className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-lg font-medium">{t('publicGoogleReview')}</h3>
                    <p className="text-xs text-muted-foreground">{t('publicGoogleReviewDesc')}</p>
                  </div>
                </div>
                <a
                  href={restaurantInfo.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-all hover:opacity-90"
                >
                  {t('leaveReview')}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-lg font-medium">{t('privateWhatsapp')}</h3>
                    <p className="text-xs text-muted-foreground">{t('privateWhatsappDesc')}</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${restaurantInfo.whatsapp}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-full border border-green-600 bg-green-600/5 px-6 py-3 text-sm font-medium text-green-700 transition-all hover:bg-green-600 hover:text-white dark:text-green-400"
                >
                  {t('contactWhatsapp')}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Rating */}
            <div className="rounded-2xl border border-border/40 bg-card p-8 shadow-sm animate-fade-in-up">
              <label className="mb-4 block text-center font-serif text-lg font-medium">
                {t('rateExperience')}
              </label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-all hover:scale-110"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={cn(
                        'h-10 w-10 transition-colors sm:h-12 sm:w-12',
                        (hoveredRating || rating) >= star
                          ? 'fill-gold text-gold'
                          : 'text-muted-foreground/30'
                      )}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="mt-4 text-center text-sm text-muted-foreground animate-fade-in">
                  {rating === 1 && 'We\'re sorry to hear that. Let us make it right.'}
                  {rating === 2 && 'We appreciate your feedback and will improve.'}
                  {rating === 3 && 'Thank you! We\'d love to hear more.'}
                  {rating === 4 && 'Thank you! We\'re glad you enjoyed your visit.'}
                  {rating === 5 && 'Wonderful! We\'re thrilled you had a great experience.'}
                </p>
              )}
            </div>

            {/* Feedback form */}
            <form onSubmit={handlePrivateSubmit} className="mt-6 space-y-4 animate-fade-in-up delay-100">
              <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">
                      {t('yourName')}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/40"
                      placeholder="..."
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">
                      {t('yourFeedback')}
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                      placeholder="..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={rating === 0 || sending}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                    {t('submitFeedback')}
                  </button>
                </div>
              </div>
            </form>

            {/* Both options - always visible regardless of rating */}
            <div className="mt-8 space-y-4 animate-fade-in-up delay-200">
              <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>{t('bothOptionsAvailable')}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Google Review */}
              <div className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-gold/30 hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-110">
                    <Star className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-xl font-medium">{t('publicGoogleReview')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t('publicGoogleReviewDesc')}</p>
                  </div>
                </div>
                <a
                  href={restaurantInfo.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-all hover:opacity-90"
                >
                  {t('leaveReview')}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {/* WhatsApp */}
              <div className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-green-600/30 hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-500 transition-transform group-hover:scale-110">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-xl font-medium">{t('privateWhatsapp')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t('privateWhatsappDesc')}</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${restaurantInfo.whatsapp}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-full border border-green-600 bg-green-600/5 px-6 py-3 text-sm font-medium text-green-700 transition-all hover:bg-green-600 hover:text-white dark:text-green-400"
                >
                  {t('contactWhatsapp')}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      <CustomerFooter />
    </div>
  );
}
