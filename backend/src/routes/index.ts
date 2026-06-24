import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller';
import * as accountCtrl from '../controllers/account.controller';
import * as txCtrl from '../controllers/transaction.controller';
import * as miscCtrl from '../controllers/misc.controller';
import * as lendingCtrl from '../controllers/lending.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  registerSchema, loginSchema, refreshSchema, changePasswordSchema, updateProfileSchema,
} from '../validators/auth.validator';
import {
  createAccountSchema, updateAccountSchema, createCategorySchema, createSubcategorySchema,
  createTagSchema, createGoalSchema, goalContributionSchema, createRecurringSchema,
} from '../validators/index.validator';
import { createTransactionSchema, updateTransactionSchema } from '../validators/transaction.validator';
import { createLendingSchema, updateLendingSchema, settleLendingSchema } from '../validators/lending.validator';

const router = Router();

// ── AUTH ──────────────────────────────────────────────────
router.post('/auth/register', validate(registerSchema), authCtrl.register);
router.post('/auth/login', validate(loginSchema), authCtrl.login);
router.post('/auth/refresh', validate(refreshSchema), authCtrl.refresh);
router.post('/auth/logout', authCtrl.logout);
router.get('/auth/profile', authenticate, authCtrl.getProfile);
router.put('/auth/profile', authenticate, validate(updateProfileSchema), authCtrl.updateProfile);
router.put('/auth/change-password', authenticate, validate(changePasswordSchema), authCtrl.changePassword);

// ── ACCOUNTS ─────────────────────────────────────────────
router.get('/accounts', authenticate, accountCtrl.getAccounts);
router.post('/accounts', authenticate, validate(createAccountSchema), accountCtrl.createAccount);
router.put('/accounts/:id', authenticate, validate(updateAccountSchema), accountCtrl.updateAccount);
router.patch('/accounts/:id/archive', authenticate, accountCtrl.archiveAccount);
router.get('/accounts/:id/history', authenticate, accountCtrl.getAccountHistory);

// ── CATEGORIES ────────────────────────────────────────────
router.get('/categories', authenticate, miscCtrl.getCategories);
router.post('/categories', authenticate, validate(createCategorySchema), miscCtrl.createCategory);
router.put('/categories/:id', authenticate, miscCtrl.updateCategory);
router.delete('/categories/:id', authenticate, miscCtrl.deleteCategory);
router.post('/subcategories', authenticate, validate(createSubcategorySchema), miscCtrl.createSubcategory);
router.put('/subcategories/:id', authenticate, miscCtrl.updateSubcategory);
router.delete('/subcategories/:id', authenticate, miscCtrl.deleteSubcategory);

// ── TRANSACTIONS ──────────────────────────────────────────
router.get('/transactions', authenticate, txCtrl.getTransactions);
router.post('/transactions', authenticate, validate(createTransactionSchema), txCtrl.createTransaction);
router.get('/transactions/:id', authenticate, txCtrl.getTransaction);
router.put('/transactions/:id', authenticate, validate(updateTransactionSchema), txCtrl.updateTransaction);
router.delete('/transactions/:id', authenticate, txCtrl.deleteTransaction);

// ── TAGS ─────────────────────────────────────────────────
router.get('/tags', authenticate, miscCtrl.getTags);
router.post('/tags', authenticate, validate(createTagSchema), miscCtrl.createTag);
router.delete('/tags/:id', authenticate, miscCtrl.deleteTag);

// ── GOALS ────────────────────────────────────────────────
router.get('/goals', authenticate, miscCtrl.getGoals);
router.post('/goals', authenticate, validate(createGoalSchema), miscCtrl.createGoal);
router.put('/goals/:id', authenticate, miscCtrl.updateGoal);
router.delete('/goals/:id', authenticate, miscCtrl.deleteGoal);
router.post('/goals/:id/contribute', authenticate, validate(goalContributionSchema), miscCtrl.addGoalContribution);
router.get('/goals/:id/contributions', authenticate, miscCtrl.getGoalContributions);
router.delete('/goals/:id/contributions/:contributionId', authenticate, miscCtrl.deleteGoalContribution);

// ── RECURRING ────────────────────────────────────────────
router.get('/recurring', authenticate, miscCtrl.getRecurring);
router.post('/recurring', authenticate, validate(createRecurringSchema), miscCtrl.createRecurring);
router.put('/recurring/:id', authenticate, miscCtrl.updateRecurring);
router.delete('/recurring/:id', authenticate, miscCtrl.deleteRecurring);
router.post('/recurring/:id/done', authenticate, miscCtrl.markRecurringDone);
router.post('/recurring/:id/snooze', authenticate, miscCtrl.snoozeRecurring);

// ── LENDING (IOU tracker — money lent to or borrowed from people) ──
router.get('/lending', authenticate, lendingCtrl.getLendings);
router.get('/lending/summary', authenticate, lendingCtrl.getLendingSummary);
router.post('/lending', authenticate, validate(createLendingSchema), lendingCtrl.createLending);
router.put('/lending/:id', authenticate, validate(updateLendingSchema), lendingCtrl.updateLending);
router.post('/lending/:id/settle', authenticate, validate(settleLendingSchema), lendingCtrl.settleLending);
router.delete('/lending/:id', authenticate, lendingCtrl.deleteLending);

// ── ANALYTICS ────────────────────────────────────────────
router.get('/dashboard', authenticate, miscCtrl.getDashboard);
router.get('/analytics/monthly', authenticate, miscCtrl.getMonthlyAnalytics);
router.get('/analytics/categories', authenticate, miscCtrl.getCategoryBreakdown);
router.get('/analytics/savings', authenticate, miscCtrl.getSavingsTrend);
router.get('/analytics/insights', authenticate, miscCtrl.getInsights);
router.get('/analytics/family', authenticate, miscCtrl.getFamilySupport);
router.get('/analytics/subcategories', authenticate, miscCtrl.getSubcategoryBreakdown);
router.get('/analytics/investments', authenticate, miscCtrl.getInvestmentTrend);
router.get('/analytics/goals', authenticate, miscCtrl.getGoalsAnalytics);
router.get('/analytics/accounts', authenticate, miscCtrl.getAccountDistribution);
router.get('/analytics/lending', authenticate, miscCtrl.getLendingAnalytics);

// ── NOTIFICATIONS ─────────────────────────────────────────
router.get('/notifications', authenticate, miscCtrl.getNotifications);
router.patch('/notifications/:id/read', authenticate, miscCtrl.markNotificationRead);
router.patch('/notifications/read-all', authenticate, miscCtrl.markAllNotificationsRead);

// ── SEARCH ───────────────────────────────────────────────
router.get('/search', authenticate, miscCtrl.globalSearch);

export default router;
