import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesAPI } from '../services/api';
import { Plus, Trash2, ChevronDown, ChevronRight, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../utils';

const catSchema = z.object({ name: z.string().min(1), icon: z.string().default('tag'), color: z.string().default('#6366f1') });
const subSchema = z.object({ name: z.string().min(1), categoryId: z.string().min(1) });
type CatForm = z.infer<typeof catSchema>;
type SubForm = z.infer<typeof subSchema>;

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16'];
const ICONS = ['tag','utensils','receipt','plane','shopping-bag','heart','film','users','trending-up','zap','home','car','music','book','coffee'];

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addSubFor, setAddSubFor] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then(r => r.data.data),
  });

  const createCat = useMutation({
    mutationFn: (d: CatForm) => categoriesAPI.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category created'); setShowAdd(false); catReset(); },
    onError: () => toast.error('Failed to create'),
  });

  const deleteCat = useMutation({
    mutationFn: (id: string) => categoriesAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category deleted'); },
  });

  const createSub = useMutation({
    mutationFn: (d: SubForm) => categoriesAPI.createSub(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Subcategory added'); setAddSubFor(null); subReset(); },
    onError: () => toast.error('Failed to create'),
  });

  const deleteSub = useMutation({
    mutationFn: (id: string) => categoriesAPI.deleteSub(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Subcategory deleted'); },
  });

  const { register: catReg, handleSubmit: catSubmit, watch: catWatch, setValue: catSet, reset: catReset, formState: { errors: catErrors } } = useForm<CatForm>({
    resolver: zodResolver(catSchema), defaultValues: { color: '#6366f1', icon: 'tag' },
  });

  const { register: subReg, handleSubmit: subSubmit, reset: subReset, formState: { errors: subErrors } } = useForm<SubForm>({
    resolver: zodResolver(subSchema),
  });

  const selColor = catWatch('color');
  const toggle = (id: string) => setExpanded(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-muted mt-0.5">{categories.length} categories</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> Add Category</button>
      </div>

      <div className="space-y-2">
        {categories.map((cat: any) => (
          <div key={cat._id} className="card overflow-hidden">
            <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.03] transition-colors" onClick={() => toggle(cat._id)}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cat.color + '22', color: cat.color }}>
                <Tag size={16}/>
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">{cat.name}</div>
                <div className="text-xs text-gray-500">{cat.subcategories?.length || 0} subcategories</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); setAddSubFor(cat._id); }} className="btn-ghost p-1.5 text-xs text-brand-400 hover:text-brand-300">+ Sub</button>
                {!cat.isDefault && (
                  <button onClick={e => { e.stopPropagation(); if(confirm('Delete?')) deleteCat.mutate(cat._id); }} className="btn-ghost p-1.5 text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
                )}
                {expanded.includes(cat._id) ? <ChevronDown size={16} className="text-gray-500"/> : <ChevronRight size={16} className="text-gray-500"/>}
              </div>
            </div>

            {expanded.includes(cat._id) && cat.subcategories?.length > 0 && (
              <div className="border-t border-white/5 px-4 py-2 bg-white/[0.02]">
                <div className="flex flex-wrap gap-2 py-1">
                  {cat.subcategories.map((sub: any) => (
                    <div key={sub._id} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 group">
                      <span className="text-sm text-gray-300">{sub.name}</span>
                      <button onClick={() => { if(confirm('Delete subcategory?')) deleteSub.mutate(sub._id); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-1 transition-opacity"><Trash2 size={12}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {addSubFor === cat._id && (
              <div className="border-t border-white/5 p-4 bg-white/[0.02]">
                <form onSubmit={subSubmit(d => createSub.mutate({ ...d, categoryId: cat._id }))} className="flex gap-2">
                  <input {...subReg('name')} placeholder="Subcategory name" className="input flex-1 py-2 text-sm"/>
                  <input type="hidden" {...subReg('categoryId')} value={cat._id}/>
                  <button type="submit" disabled={createSub.isPending} className="btn-primary px-4 py-2 text-sm">Add</button>
                  <button type="button" onClick={() => setAddSubFor(null)} className="btn-secondary px-3 py-2 text-sm">Cancel</button>
                </form>
                {subErrors.name && <p className="text-xs text-red-400 mt-1">{subErrors.name.message}</p>}
              </div>
            )}
          </div>
        ))}

        {categories.length === 0 && <div className="text-center py-16 text-muted">No categories yet</div>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)}/>
          <div className="relative z-10 w-full max-w-md card p-6 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-5">New Category</h2>
            <form onSubmit={catSubmit(d => createCat.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input {...catReg('name')} placeholder="e.g. Food, Bills, Travel" className="input"/>
                {catErrors.name && <p className="text-xs text-red-400 mt-1">{catErrors.name.message}</p>}
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => catSet('color', c)}
                      className={cn('w-7 h-7 rounded-lg transition-all', selColor === c ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-[#0d0d1a] scale-110' : '')}
                      style={{ background: c }}/>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createCat.isPending} className="btn-primary flex-1">{createCat.isPending ? 'Creating…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
