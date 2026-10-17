'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Feedback = {
  id: string;
  rating: number;
  comment: string | null;
  customer_name: string | null;
  status: string;
  created_at: string;
};

export default function FeedbackAdminPage() {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const loadFeedback = useCallback(async () => {
    let query = supabase.from('guest_feedback').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    if (data) setFeedback(data as unknown as Feedback[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadFeedback(); }, [loadFeedback]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('guest_feedback').update({ status }).eq('id', id);
    if (error) { toast({ title: 'Error updating status', variant: 'destructive' }); return; }
    toast({ title: 'Status updated' });
    loadFeedback();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('guest_feedback').delete().eq('id', id);
    if (error) { toast({ title: 'Error deleting feedback', variant: 'destructive' }); return; }
    toast({ title: 'Feedback deleted' });
    loadFeedback();
  };

  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
    : '—';
  const newCount = feedback.filter((f) => f.status === 'new').length;

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">Private customer feedback and ratings</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-gold fill-gold" />
            <div>
              <p className="text-xs text-muted-foreground">Average Rating</p>
              <p className="font-serif text-2xl font-bold">{avgRating} / 5</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">New Feedback</p>
              <p className="font-serif text-2xl font-bold">{newCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Submissions</p>
              <p className="font-serif text-2xl font-bold">{feedback.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Feedback</SelectItem>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="reviewed">Reviewed</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
        </SelectContent>
      </Select>

      {/* Feedback list */}
      <div className="space-y-3">
        {feedback.map((fb) => (
          <Card key={fb.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${star <= fb.rating ? 'fill-gold text-gold' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{fb.customer_name || 'Anonymous'}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(fb.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {fb.comment && <p className="mt-2 text-sm text-muted-foreground">{fb.comment}</p>}
                <div className="mt-4 flex items-center gap-2">
                  <Select value={fb.status} onValueChange={(v) => updateStatus(fb.id, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(fb.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {feedback.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No feedback submissions yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
