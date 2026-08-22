import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesAPI } from '../services/api';
import { Plus, Trash2, ChevronDown, ChevronRight, Tag, Pencil, ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../utils';

const catSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['expense', 'income', 'investment']).default('expense'),
  icon: z.string().default('tag'),
  color: z.string().default('#6366f1'),
});

const subSchema = z.object({
  name: z.string().min(1, 'Subcategory name is required'),
  categoryId: z.string().min(1),
});

const subEditSchema = z.object({
  name: z.string().min(1, 'Subcategory name is required'),
});

type CatForm = z.infer<typeof catSchema>;
type SubForm = z.infer<typeof subSchema>;
type SubEditForm = z.infer<typeof subEditSchema>;

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];

const TABS = [
  { id: 'expense', label: 'Expense', icon: ArrowDownRight, color: 'text-red-400', activeBg: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { id: 'income', label: 'Income', icon: ArrowUpRight, color: 'text-emerald-400', activeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { id: 'investment', label: 'Investment', icon: TrendingUp, color: 'text-purple-400', activeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
] as const;

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'investment'>('expense');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addSubFor, setAddSubFor] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<any>(null);
  const [editSub, setEditSub] = useState<any>(null);

  const { data: allCategories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then(r => r.data.data),
  });

  const categories = allCategories.filter((c: any) => (c.type || 'expense') === activeTab);

  const counts = {
    expense: allCategories.filter((c: any) => (c.type || 'expense') === 'expense').length,
    income: allCategories.filter((c: any) => c.type === 'income').length,
    investment: allCategories.filter((c: any) => c.type === 'investment').length,
  };

  const createCat = useMutation({
    mutationFn: (d: CatForm) => categoriesAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created');
      setShowAdd(false);
      catReset();
    },
    onError: () => toast.error('Failed to create category'),
  });

  const updateCat = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CatForm }) => categoriesAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated');
      setEditCat(null);
      editCatReset();
    },
    onError: () => toast.error('Failed to update category'),
  });

  const deleteCat = useMutation({
    mutationFn: (id: string) => categoriesAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
    onError: () => toast.error('Failed to delete category'),
  });

  const createSub = useMutation({
    mutationFn: (d: SubForm) => categoriesAPI.createSub(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Subcategory added');
      setAddSubFor(null);
      subReset();
    },
    onError: () => toast.error('Failed to create subcategory'),
  });

  const updateSub = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubEditForm }) => categoriesAPI.updateSub(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Subcategory updated');
      setEditSub(null);
    },
    onError: () => toast.error('Failed to update subcategory'),
  });

  const deleteSub = useMutation({
    mutationFn: (id: string) => categoriesAPI.deleteSub(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Subcategory deleted');
    },
    onError: () => toast.error('Failed to delete subcategory'),
  });

  const { register: catReg, handleSubmit: catSubmit, watch: catWatch, setValue: catSet, reset: catReset, formState: { errors: catErrors } } = useForm<CatForm>({
    resolver: zodResolver(catSchema),
    defaultValues: { type: activeTab, color: '#6366f1', icon: 'tag' },
  });

  const { register: editCatReg, handleSubmit: editCatSubmit, watch: editCatWatch, setValue: editCatSet, reset: editCatReset, formState: { errors: editCatErrors } } = useForm<CatForm>({
    resolver: zodResolver(catSchema),
  });

  const { register: subReg, handleSubmit: subSubmit, reset: subReset, formState: { errors: subErrors } } = useForm<SubForm>({
    resolver: zodResolver(subSchema),
  });

  const { register: editSubReg, handleSubmit: editSubSubmit, reset: editSubReset, formState: { errors: editSubErrors } } = useForm<SubEditForm>({
    resolver: zodResolver(subEditSchema),
  });

  const selColor = catWatch('color');
  const selType = catWatch('type');
  const editSelColor = editCatWatch('color');
  const toggle = (id: string) => setExpanded(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const openAddModal = () => {
    catReset({ name: '', type: activeTab, color: '#6366f1', icon: 'tag' });
    setShowAdd(true);
  };

  const openEditCat = (cat: any) => {
    editCatReset({ name: cat.name, type: cat.type || 'expense', icon: cat.icon || 'tag', color: cat.color || '#6366f1' });
    setEditCat(cat);
  };

  const openEditSub = (sub: any) => {
    editSubReset({ name: sub.name });
    setEditSub(sub);
  };

  const getPlaceholder = (type: string) => {
    if (type === 'income') return 'e.g. Salary, Freelance, Consulting, Rental';
    if (type === 'investment') return 'e.g. Mutual Funds, SIP, Stocks, FD';
    return 'e.g. Food, Bills, Travel, Shopping';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-muted mt-0.5">Manage expense, income, and investment categories & subcategories</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                isActive
                  ? tab.activeBg
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon size={16} className={tab.color} />
              <span>{tab.label}</span>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-mono',
                isActive ? 'bg-white/10' : 'bg-white/5 text-gray-500'
              )}>
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Categories List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-16 text-muted">Loading categories…</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 card">
            <p className="text-base text-gray-300 font-medium mb-1">No {activeTab} categories found</p>
            <p className="text-xs text-muted mb-4">Add custom {activeTab} categories to organize your transactions better</p>
            <button onClick={openAddModal} className="btn-primary text-xs inline-flex items-center gap-1.5">
              <Plus size={14} /> Add {TABS.find(t => t.id === activeTab)?.label} Category
            </button>
          </div>
        ) : (
          categories.map((cat: any) => (
            <div key={cat._id} className="card overflow-hidden transition-all">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() => toggle(cat._id)}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-medium"
                  style={{ background: cat.color + '22', color: cat.color }}
                >
                  <Tag size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white flex items-center gap-2 truncate">
                    <span>{cat.name}</span>
                    {cat.isDefault && (
                      <span className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.2 rounded font-normal">Default</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{cat.subcategories?.length || 0} subcategories</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); setAddSubFor(cat._id); }}
                    className="btn-ghost p-1.5 text-xs text-brand-400 hover:text-brand-300"
                  >
                    + Sub
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); openEditCat(cat); }}
                    className="btn-ghost p-1.5 text-blue-400 hover:text-blue-300"
                  >
                    <Pencil size={14} />
                  </button>
                  {!cat.isDefault && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`Delete "${cat.name}" category and its subcategories?`)) {
                          deleteCat.mutate(cat._id);
                        }
                      }}
                      className="btn-ghost p-1.5 text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {expanded.includes(cat._id) ? (
                    <ChevronDown size={16} className="text-gray-500" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-500" />
                  )}
                </div>
              </div>

              {/* Subcategories list */}
              {expanded.includes(cat._id) && cat.subcategories?.length > 0 && (
                <div className="border-t border-white/5 px-4 py-2.5 bg-white/[0.02]">
                  <div className="flex flex-wrap gap-2 py-1">
                    {cat.subcategories.map((sub: any) => (
                      <div
                        key={sub._id}
                        className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 group"
                      >
                        <span className="text-sm text-gray-300">{sub.name}</span>
                        <button
                          onClick={() => openEditSub(sub)}
                          className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 ml-1 transition-opacity"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete subcategory "${sub.name}"?`)) {
                              deleteSub.mutate(sub._id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add subcategory input inline */}
              {addSubFor === cat._id && (
                <div className="border-t border-white/5 p-4 bg-white/[0.02]">
                  <form
                    onSubmit={subSubmit(d => createSub.mutate({ ...d, categoryId: cat._id }))}
                    className="flex gap-2"
                  >
                    <input
                      {...subReg('name')}
                      placeholder={`Add subcategory for ${cat.name}…`}
                      className="input flex-1 py-2 text-sm"
                    />
                    <input type="hidden" {...subReg('categoryId')} value={cat._id} />
                    <button type="submit" disabled={createSub.isPending} className="btn-primary px-4 py-2 text-sm">
                      {createSub.isPending ? 'Adding…' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddSubFor(null)}
                      className="btn-secondary px-3 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </form>
                  {subErrors.name && <p className="text-xs text-red-400 mt-1">{subErrors.name.message}</p>}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Category Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#131326] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-4">New Category</h2>
            <form onSubmit={catSubmit(d => createCat.mutate(d))} className="space-y-4">
              {/* Category Type selector */}
              <div>
                <label className="label">Category Group</label>
                <div className="grid grid-cols-3 gap-2">
                  {TABS.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => catSet('type', t.id)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-all',
                        selType === t.id
                          ? t.activeBg
                          : 'border-white/10 text-gray-400 hover:text-white bg-white/5'
                      )}
                    >
                      <t.icon size={14} className={t.color} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="label">Category Name</label>
                <input
                  {...catReg('name')}
                  placeholder={getPlaceholder(selType)}
                  className="input"
                />
                {catErrors.name && <p className="text-xs text-red-400 mt-1">{catErrors.name.message}</p>}
              </div>

              {/* Color */}
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => catSet('color', c)}
                      className={cn(
                        'w-7 h-7 rounded-lg transition-all',
                        selColor === c ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-[#0d0d1a] scale-110' : ''
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={createCat.isPending} className="btn-primary flex-1">
                  {createCat.isPending ? 'Creating…' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditCat(null)} />
          <div className="relative z-10 w-full max-w-md bg-[#131326] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Category</h2>
            <form onSubmit={editCatSubmit(d => updateCat.mutate({ id: editCat._id, data: d }))} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input {...editCatReg('name')} className="input" />
                {editCatErrors.name && <p className="text-xs text-red-400 mt-1">{editCatErrors.name.message}</p>}
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => editCatSet('color', c)}
                      className={cn(
                        'w-7 h-7 rounded-lg transition-all',
                        editSelColor === c ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-[#0d0d1a] scale-110' : ''
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditCat(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={updateCat.isPending} className="btn-primary flex-1">
                  {updateCat.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subcategory Modal */}
      {editSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditSub(null)} />
          <div className="relative z-10 w-full max-w-sm bg-[#131326] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Subcategory</h2>
            <form onSubmit={editSubSubmit(d => updateSub.mutate({ id: editSub._id, data: d }))} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input {...editSubReg('name')} className="input" />
                {editSubErrors.name && <p className="text-xs text-red-400 mt-1">{editSubErrors.name.message}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditSub(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={updateSub.isPending} className="btn-primary flex-1">
                  {updateSub.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
