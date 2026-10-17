'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useRestaurant } from '@/components/providers/restaurant-provider';

type Category = {
  id: string;
  name: string;
  name_fr: string | null;
  name_ar: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

const iconOptions = ['Coffee', 'Leaf', 'CupSoda', 'Wine', 'Croissant', 'Salad', 'UtensilsCrossed', 'Beef', 'Pizza', 'CakeSlice'];

export default function CategoriesPage() {
  const { refresh } = useRestaurant();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', name_fr: '', name_ar: '', icon: 'Coffee' });

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (!error && data) setCategories(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
    refresh();
  }, [loadCategories]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    if (editing) {
      const { error } = await supabase
        .from('menu_categories')
        .update({ name: form.name, name_fr: form.name_fr || null, name_ar: form.name_ar || null, icon: form.icon, updated_at: new Date().toISOString() })
        .eq('id', editing.id);
      if (error) { toast({ title: 'Error updating category', variant: 'destructive' }); return; }
      toast({ title: 'Category updated' });
    } else {
      const { error } = await supabase
        .from('menu_categories')
        .insert({ name: form.name, name_fr: form.name_fr || null, name_ar: form.name_ar || null, icon: form.icon, sort_order: categories.length });
      if (error) { toast({ title: 'Error creating category', variant: 'destructive' }); return; }
      toast({ title: 'Category created' });
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: '', name_fr: '', name_ar: '', icon: 'Coffee' });
    loadCategories();
  };

  const handleEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, name_fr: cat.name_fr || '', name_ar: cat.name_ar || '', icon: cat.icon });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('menu_categories').update({ is_active: false }).eq('id', id);
    if (error) { toast({ title: 'Error deleting category', variant: 'destructive' }); return; }
    toast({ title: 'Category archived. Products and order history are preserved.' });
    loadCategories();
    refresh();
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;
    const cat = categories[index];
    const swapCat = categories[swapIndex];
    await Promise.all([
      supabase.from('menu_categories').update({ sort_order: swapCat.sort_order }).eq('id', cat.id),
      supabase.from('menu_categories').update({ sort_order: cat.sort_order }).eq('id', swapCat.id),
    ]);
    loadCategories();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your menu categories</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm({ name: '', name_fr: '', name_ar: '', icon: 'Coffee' }); }} className="bg-gold hover:bg-gold/90 text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name (English)</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Coffee" />
              </div>
              <div>
                <Label>Name (French)</Label>
                <Input value={form.name_fr} onChange={(e) => setForm({ ...form, name_fr: e.target.value })} placeholder="ex. Café" />
              </div>
              <div>
                <Label>Name (Arabic)</Label>
                <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} placeholder="مثال: قهوة" dir="rtl" />
              </div>
              <div>
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setForm({ ...form, icon })}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        form.icon === icon ? 'border-gold bg-gold/10 text-gold' : 'border-border hover:bg-secondary'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleSave} className="w-full bg-gold hover:bg-gold/90 text-white">
                {editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {categories.map((cat, index) => (
          <Card key={cat.id} className="flex items-center gap-4 p-4">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleReorder(cat.id, 'up')}
                disabled={index === 0}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleReorder(cat.id, 'down')}
                disabled={index === categories.length - 1}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 bg-gold/5">
              <span className="text-xs font-medium text-gold">{cat.sort_order + 1}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-lg font-medium">{cat.name}</h3>
              <div className="flex gap-3 text-xs text-muted-foreground">
                {cat.name_fr && <span>FR: {cat.name_fr}</span>}
                {cat.name_ar && <span dir="rtl">AR: {cat.name_ar}</span>}
                <span>Icon: {cat.icon}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => handleEdit(cat)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleDelete(cat.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {categories.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No categories yet. Click "Add Category" to get started.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
