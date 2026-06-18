import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  icon: string;
  color: string;
  isArchived: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: 'tag' },
    color: { type: String, default: '#6366f1' },
    isArchived: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, isArchived: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema);

export interface ISubcategory extends Document {
  userId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const subcategorySchema = new Schema<ISubcategory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

subcategorySchema.index({ userId: 1, categoryId: 1 });

export const Subcategory = mongoose.model<ISubcategory>('Subcategory', subcategorySchema);
