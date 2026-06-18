import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { Category, Subcategory } from '../models/Category';
import Tag from '../models/Tag';
import { Goal, GoalContribution } from '../models/Goal';
import RecurringTransaction from '../models/RecurringTransaction';
import Notification from '../models/Notification';
import * as analyticsService from '../services/analytics.service';
import { sendSuccess, sendError } from '../utils/response';

// ── CATEGORIES ──────────────────────────────────────────────
export const getCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find({ userId: req.user!.id, isArchived: false }).sort({ name: 1 });
    const subcategories = await Subcategory.find({ userId: req.user!.id });
    const withSubs = categories.map((c: any) => ({
      ...c.toObject(),
      subcategories: subcategories.filter((s: any) => s.categoryId.toString() === c._id.toString()),
    }));
    sendSuccess(res, withSubs);
  } catch (err) { next(err); }
};

export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cat = await Category.create({ ...req.body, userId: req.user!.id });
    sendSuccess(res, cat, 'Category created', 201);
  } catch (err) { next(err); }
};

export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cat = await Category.findOneAndUpdate({ _id: req.params.id, userId: req.user!.id }, req.body, { new: true });
    if (!cat) return sendError(res, 'Category not found', 404);
    sendSuccess(res, cat);
  } catch (err) { next(err); }
};

export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Category.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    await Subcategory.deleteMany({ categoryId: req.params.id, userId: req.user!.id });
    sendSuccess(res, null, 'Category deleted');
  } catch (err) { next(err); }
};

export const createSubcategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sub = await Subcategory.create({ ...req.body, userId: req.user!.id });
    sendSuccess(res, sub, 'Subcategory created', 201);
  } catch (err) { next(err); }
};

export const deleteSubcategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Subcategory.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    sendSuccess(res, null, 'Subcategory deleted');
  } catch (err) { next(err); }
};

// ── TAGS ──────────────────────────────────────────────────
export const getTags = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tags = await Tag.find({ userId: req.user!.id }).sort({ name: 1 });
    sendSuccess(res, tags);
  } catch (err) { next(err); }
};

export const createTag = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tag = await Tag.create({ ...req.body, userId: req.user!.id });
    sendSuccess(res, tag, 'Tag created', 201);
  } catch (err) { next(err); }
};

export const deleteTag = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Tag.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    sendSuccess(res, null, 'Tag deleted');
  } catch (err) { next(err); }
};

// ── GOALS ──────────────────────────────────────────────────
export const getGoals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const goals = await Goal.find({ userId: req.user!.id }).sort({ targetDate: 1 });
    sendSuccess(res, goals);
  } catch (err) { next(err); }
};

export const createGoal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const goal = await Goal.create({ ...req.body, userId: req.user!.id });
    sendSuccess(res, goal, 'Goal created', 201);
  } catch (err) { next(err); }
};

export const updateGoal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const goal = await Goal.findOneAndUpdate({ _id: req.params.id, userId: req.user!.id }, req.body, { new: true });
    if (!goal) return sendError(res, 'Goal not found', 404);
    sendSuccess(res, goal);
  } catch (err) { next(err); }
};

export const deleteGoal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    await GoalContribution.deleteMany({ goalId: req.params.id });
    sendSuccess(res, null, 'Goal deleted');
  } catch (err) { next(err); }
};

export const addGoalContribution = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!goal) return sendError(res, 'Goal not found', 404);

    const contribution = await GoalContribution.create({
      ...req.body,
      goalId: req.params.id,
      userId: req.user!.id,
    });

    goal.savedAmount += req.body.amount;
    if (goal.savedAmount >= goal.targetAmount) goal.isCompleted = true;
    await goal.save();

    sendSuccess(res, { goal, contribution }, 'Contribution added', 201);
  } catch (err) { next(err); }
};

export const getGoalContributions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const contributions = await GoalContribution.find({ goalId: req.params.id, userId: req.user!.id }).sort({ date: -1 });
    sendSuccess(res, contributions);
  } catch (err) { next(err); }
};

// ── RECURRING ──────────────────────────────────────────────
export const getRecurring = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const upcoming = new Date();
    upcoming.setDate(upcoming.getDate() + 7);

    const recurring = await RecurringTransaction.find({ userId: req.user!.id, isActive: true })
      .populate('accountId', 'name icon color')
      .populate('categoryId', 'name icon color')
      .sort({ nextDueDate: 1 });

    const withStatus = recurring.map((r: any) => {
      const due = new Date(r.nextDueDate);
      let status = 'upcoming';
      if (due < now) status = 'overdue';
      else if (due <= upcoming) status = 'due_soon';
      return { ...r.toObject(), status };
    });

    sendSuccess(res, withStatus);
  } catch (err) { next(err); }
};

export const createRecurring = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rec = await RecurringTransaction.create({ ...req.body, userId: req.user!.id });
    sendSuccess(res, rec, 'Recurring transaction created', 201);
  } catch (err) { next(err); }
};

export const updateRecurring = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rec = await RecurringTransaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      req.body,
      { new: true }
    );
    if (!rec) return sendError(res, 'Recurring transaction not found', 404);
    sendSuccess(res, rec);
  } catch (err) { next(err); }
};

export const deleteRecurring = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await RecurringTransaction.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    sendSuccess(res, null, 'Recurring transaction deleted');
  } catch (err) { next(err); }
};

// ── ANALYTICS & DASHBOARD ──────────────────────────────────
export const getDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getDashboardData(req.user!.id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getMonthlyAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const months = parseInt((req.query.months as string) || '6');
    const data = await analyticsService.getMonthlyAnalytics(req.user!.id, months);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getCategoryBreakdown = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query as any;
    const data = await analyticsService.getCategoryBreakdown(req.user!.id, startDate, endDate);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getSavingsTrend = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const months = parseInt((req.query.months as string) || '6');
    const data = await analyticsService.getSavingsTrend(req.user!.id, months);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getInsights = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const insights = await analyticsService.generateInsights(req.user!.id);
    sendSuccess(res, insights);
  } catch (err) { next(err); }
};

export const getFamilySupport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getFamilySupportStats(req.user!.id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

// ── NOTIFICATIONS ──────────────────────────────────────────
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await Notification.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50);
    sendSuccess(res, notifications);
  } catch (err) { next(err); }
};

export const markNotificationRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user!.id }, { isRead: true });
    sendSuccess(res, null, 'Notification marked as read');
  } catch (err) { next(err); }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany({ userId: req.user!.id, isRead: false }, { isRead: true });
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
};

// ── SEARCH ──────────────────────────────────────────────────
export const globalSearch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q) return sendSuccess(res, { transactions: [], categories: [], accounts: [], tags: [], goals: [] });

    const regex = { $regex: q, $options: 'i' };
    const userId = req.user!.id;

    const [transactions, categories, accounts, tags, goals] = await Promise.all([
      (await import('../models/Transaction')).default.find({
        userId,
        $or: [{ notes: regex }, { incomeSource: regex }, { toExternal: regex }, { investmentName: regex }],
      }).limit(10).populate('accountId', 'name').populate('categoryId', 'name'),
      Category.find({ userId, name: regex, isArchived: false }).limit(5),
      (await import('../models/Account')).default.find({ userId, name: regex, isArchived: false }).limit(5),
      Tag.find({ userId, name: regex }).limit(5),
      Goal.find({ userId, title: regex }).limit(5),
    ]);

    sendSuccess(res, { transactions, categories, accounts, tags, goals });
  } catch (err) { next(err); }
};
