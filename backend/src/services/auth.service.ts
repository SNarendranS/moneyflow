import crypto from 'crypto';
import User, { IUser } from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { Category } from '../models/Category';
import { Subcategory } from '../models/Category';
import Account from '../models/Account';

const DEFAULT_CATEGORIES = [
  // Expense Categories
  { name: 'Food', type: 'expense', icon: 'utensils', color: '#f59e0b', subcategories: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Outside Food', 'Home Food'] },
  { name: 'Bills', type: 'expense', icon: 'receipt', color: '#ef4444', subcategories: ['WiFi', 'Mobile Recharge', 'Electricity', 'Water', 'Gas'] },
  { name: 'Travel', type: 'expense', icon: 'plane', color: '#3b82f6', subcategories: ['Flight', 'Hotel', 'Transport', 'Fuel'] },
  { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#8b5cf6', subcategories: ['Clothing', 'Electronics', 'Groceries', 'Online'] },
  { name: 'Healthcare', type: 'expense', icon: 'heart', color: '#ec4899', subcategories: ['Medicine', 'Doctor', 'Hospital'] },
  { name: 'Entertainment', type: 'expense', icon: 'film', color: '#f97316', subcategories: ['Movies', 'Subscriptions', 'Games'] },
  { name: 'Family Support', type: 'expense', icon: 'users', color: '#10b981', subcategories: ['Mother', 'Father', 'Sibling'] },

  // Income Categories
  { name: 'Salary', type: 'income', icon: 'briefcase', color: '#10b981', subcategories: ['Monthly Salary', 'Bonus', 'Overtime', 'Incentives'] },
  { name: 'Freelance', type: 'income', icon: 'laptop', color: '#06b6d4', subcategories: ['Client Work', 'Consulting', 'Projects'] },
  { name: 'Business', type: 'income', icon: 'store', color: '#3b82f6', subcategories: ['Revenue', 'Profit Share', 'Services'] },
  { name: 'Investments & Returns', type: 'income', icon: 'trending-up', color: '#8b5cf6', subcategories: ['Dividends', 'Interest', 'Capital Gains', 'Rental Income'] },
  { name: 'Other Income', type: 'income', icon: 'gift', color: '#f59e0b', subcategories: ['Gift', 'Cashback', 'Refund', 'Reimbursement'] },

  // Investment Categories
  { name: 'Mutual Funds', type: 'investment', icon: 'pie-chart', color: '#8b5cf6', subcategories: ['Equity MF', 'Debt MF', 'Hybrid MF', 'Index Fund'] },
  { name: 'SIP', type: 'investment', icon: 'refresh-cw', color: '#06b6d4', subcategories: ['Monthly SIP', 'Top-up SIP', 'Flexi SIP'] },
  { name: 'Stocks & Equity', type: 'investment', icon: 'trending-up', color: '#10b981', subcategories: ['Large Cap', 'Mid Cap', 'Small Cap', 'US Stocks'] },
  { name: 'Fixed Deposits (FD/RD)', type: 'investment', icon: 'landmark', color: '#f59e0b', subcategories: ['Bank FD', 'Corporate FD', 'RD', 'PPF'] },
  { name: 'Gold & Commodities', type: 'investment', icon: 'coins', color: '#eab308', subcategories: ['Digital Gold', 'Sovereign Gold Bonds', 'Physical Gold', 'Silver'] },
  { name: 'Real Estate & Other', type: 'investment', icon: 'home', color: '#ec4899', subcategories: ['Property', 'REITs', 'P2P Lending', 'Crypto'] },
];

export const seedUserDefaults = async (userId: string) => {
  for (const cat of DEFAULT_CATEGORIES) {
    const category = await Category.create({
      userId,
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
    });
    for (const sub of cat.subcategories) {
      await Subcategory.create({ userId, categoryId: category._id, name: sub });
    }
  }
  await Account.create({
    userId,
    name: 'Savings Account',
    type: 'savings',
    openingBalance: 0,
    currentBalance: 0,
    color: '#10b981',
    icon: 'piggy-bank',
  });
};

export const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  currency?: string;
  timezone?: string;
}) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw new Error('Email already registered');

  const user = await User.create(data);
  await seedUserDefaults(user._id.toString());

  const accessToken = generateAccessToken({ id: user._id.toString(), email: user.email });
  const refreshToken = generateRefreshToken({ id: user._id.toString() });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt });

  return { user, accessToken, refreshToken };
};

export const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new Error('Invalid email or password');
  }

  const accessToken = generateAccessToken({ id: user._id.toString(), email: user.email });
  const refreshToken = generateRefreshToken({ id: user._id.toString() });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt });

  return { user, accessToken, refreshToken };
};

export const refreshTokens = async (token: string) => {
  const stored = await RefreshToken.findOne({ token });
  if (!stored) throw new Error('Invalid refresh token');

  const decoded = verifyRefreshToken(token) as { id: string };
  const user = await User.findById(decoded.id);
  if (!user) throw new Error('User not found');

  await RefreshToken.deleteOne({ _id: stored._id });

  const accessToken = generateAccessToken({ id: user._id.toString(), email: user.email });
  const newRefreshToken = generateRefreshToken({ id: user._id.toString() });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await RefreshToken.create({ userId: user._id, token: newRefreshToken, expiresAt });

  return { accessToken, refreshToken: newRefreshToken };
};

export const logoutUser = async (refreshToken: string) => {
  await RefreshToken.deleteOne({ token: refreshToken });
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new Error('User not found');
  if (!(await user.comparePassword(currentPassword))) throw new Error('Current password is incorrect');
  user.password = newPassword;
  await user.save();
};

export const updateProfile = async (userId: string, data: Partial<IUser>) => {
  return User.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
};
