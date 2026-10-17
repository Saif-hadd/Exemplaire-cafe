'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, Star, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { minor } from '@/lib/restaurant';
import { useRestaurant } from '@/components/providers/restaurant-provider';

type Product = {
  id: string;
  category_id: string;
  name: string;
  name_fr: string | null;
  name_ar: string | null;
  description: string;
  description_fr: string | null;
  description_ar: string | null;
  price: number;
  image: string | null;
  available: boolean;
  featured: boolean;
  bestseller: boolean;
  ingredients: string[];
  allergens: string[];
  dietary: string[];
};

type Category = { id: string; name: string };

export default function ProductsPage() {
  const { refresh } = useRestaurant();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    category_id: '',
    name: '', name_fr: '', name_ar: '',
    description: '', description_fr: '', description_ar: '',
    price: '0', image: '',
    available: true, featured: false, bestseller: false,
    ingredients: '', allergens: '', dietary: '',
  });

  const loadData = useCallback(async () => {
    const [prodRes, catRes] = await Promise.all([
      supabase.from('menu_products').select('*').eq('archived', false).order('created_at', { ascending: false }),
      supabase.from('menu_categories').select('id, name').order('sort_order'),
    ]);
    if (prodRes.data) setProducts(prodRes.data as unknown as Product[]);
    if (catRes.data) setCategories(catRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredProducts = products.filter((p) => {
    if (filterCat !== 'all' && p.category_id !== filterCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      category_id: categories[0]?.id || '',
      name: '', name_fr: '', name_ar: '',
      description: '', description_fr: '', description_ar: '',
      price: '0', image: '',
      available: true, featured: false, bestseller: false,
      ingredients: '', allergens: '', dietary: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      category_id: p.category_id,
      name: p.name, name_fr: p.name_fr || '', name_ar: p.name_ar || '',
      description: p.description, description_fr: p.description_fr || '', description_ar: p.description_ar || '',
      price: String(p.price), image: p.image || '',
      available: p.available, featured: p.featured, bestseller: p.bestseller,
      ingredients: p.ingredients?.join(', ') || '', allergens: p.allergens?.join(', ') || '', dietary: p.dietary?.join(', ') || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    if (!form.category_id) { toast({ title: 'Category is required', variant: 'destructive' }); return; }
    let price: number;
    try { price = minor(form.price) / 100; } catch { toast({ title: 'Enter a valid nonnegative price with at most two decimals', variant: 'destructive' }); return; }

    const payload = {
      category_id: form.category_id,
      name: form.name,
      name_fr: form.name_fr || null,
      name_ar: form.name_ar || null,
      description: form.description,
      description_fr: form.description_fr || null,
      description_ar: form.description_ar || null,
      price,
      image: form.image || null,
      available: form.available,
      featured: form.featured,
      bestseller: form.bestseller,
      ingredients: form.ingredients ? form.ingredients.split(',').map((s) => s.trim()).filter(Boolean) : [],
      allergens: form.allergens ? form.allergens.split(',').map((s) => s.trim()).filter(Boolean) : [],
      dietary: form.dietary ? form.dietary.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };

    if (editing) {
      const { error } = await supabase.from('menu_products').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
      if (error) { toast({ title: 'Error updating product', variant: 'destructive' }); return; }
      toast({ title: 'Product updated' });
    } else {
      const { error } = await supabase.from('menu_products').insert(payload);
      if (error) { toast({ title: 'Error creating product', variant: 'destructive' }); return; }
      toast({ title: 'Product created' });
    }
    setDialogOpen(false);
    loadData();
    refresh();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('menu_products').update({ archived: true, available: false }).eq('id', id);
    if (error) { toast({ title: 'Error archiving product', variant: 'destructive' }); return; }
    toast({ title: 'Product archived. Historical orders are preserved.' });
    loadData();
    refresh();
  };

  const toggleAvailable = async (p: Product) => {
    const { error } = await supabase.from('menu_products').update({ available: !p.available }).eq('id', p.id);
    if (error) { toast({ title: error.message, variant: 'destructive' }); return; }
    loadData();
    refresh();
  };

  const catName = (id: string) => categories.find((c) => c.id === id)?.name || 'Unknown';

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your menu items</p>
        </div>
        <Button onClick={openNew} className="bg-gold hover:bg-gold/90 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="pl-10" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-secondary">
              {p.image ? (
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                  <span className="text-sm">No image</span>
                </div>
              )}
              <div className="absolute left-2 top-2 flex gap-1">
                {p.featured && <span className="rounded-full bg-foreground/80 px-2 py-0.5 text-xs text-white backdrop-blur-sm">Featured</span>}
                {p.bestseller && <span className="rounded-full bg-gold px-2 py-0.5 text-xs text-white">Bestseller</span>}
              </div>
              {!p.available && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold">Unavailable</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-lg font-medium">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{catName(p.category_id)}</p>
                </div>
                <span className="font-serif text-lg font-semibold text-gold">{p.price} DH</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => toggleAvailable(p)} title={p.available ? 'Set unavailable' : 'Set available'}>
                  {p.available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No products found. Click "Add Product" to get started.</p>
        </Card>
      )}

      {/* Product dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Name (EN)</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Name (FR)</Label>
                <Input value={form.name_fr} onChange={(e) => setForm({ ...form, name_fr: e.target.value })} />
              </div>
              <div>
                <Label>Name (AR)</Label>
                <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} dir="rtl" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Description (EN)</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>Description (FR)</Label>
                <Textarea value={form.description_fr} onChange={(e) => setForm({ ...form, description_fr: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>Description (AR)</Label>
                <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={2} dir="rtl" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Price</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
                <input aria-label="Upload product photograph" className="mt-3 block w-full text-xs" type="file" accept="image/jpeg,image/png,image/webp" onChange={async e => {
                  const file = e.target.files?.[0]; if (!file) return;
                  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { toast({ title: 'Use a JPEG, PNG, or WebP photograph under 5 MB.', variant: 'destructive' }); return; }
                  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
                  const path = `${crypto.randomUUID()}.${ext}`;
                  const { error } = await supabase.storage.from('menu-images').upload(path, file, { contentType: file.type, upsert: false });
                  if (error) { toast({ title: error.message, variant: 'destructive' }); return; }
                  const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
                  setForm(old => ({ ...old, image: data.publicUrl }));
                  toast({ title: 'Photograph uploaded' });
                }} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Ingredients (comma-separated)</Label>
                <Input value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} placeholder="Flour, Butter, Sugar" />
              </div>
              <div>
                <Label>Allergens (comma-separated)</Label>
                <Input value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} placeholder="Gluten, Dairy" />
              </div>
              <div>
                <Label>Dietary (comma-separated)</Label>
                <Input value={form.dietary} onChange={(e) => setForm({ ...form, dietary: e.target.value })} placeholder="Vegan, Gluten-free" />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} />
                <Label>Available</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
                <Label>Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.bestseller} onCheckedChange={(v) => setForm({ ...form, bestseller: v })} />
                <Label>Bestseller</Label>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-gold hover:bg-gold/90 text-white">
              {editing ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
