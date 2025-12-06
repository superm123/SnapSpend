'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getBillingCycleDates } from '@/lib/utils/customMonth';
import { useStore } from '@/lib/store';
import { getCurrencySymbol } from '@/lib/utils/currency';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Container,
  Grid,
  Box,
  CircularProgress
} from '@mui/material';
import { format } from 'date-fns';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#A28DFF',
  '#FF6384',
  '#36A2EB',
  '#FFCE56',
];

export default function SummaryPage() {
  const router = useRouter();
  const { currentUser, currency } = useStore();
  const settings = useLiveQuery(() => db.settings.toArray());

  const [billingCycleDates, setBillingCycleDates] = useState<{
    cycleStartDate: Date;
    cycleEndDate: Date;
  } | null>(null);

  useEffect(() => {
    if (settings && settings.length > 0) {
      const billingCycleStartDay = settings[0].billingCycleStart;
      setBillingCycleDates(getBillingCycleDates(billingCycleStartDay));
    }
  }, [settings]);

  const expenses = useLiveQuery(async () => {
    if (!billingCycleDates) return [];
    const expensesInCycle = await db.expenses
      .where('date')
      .between(
        billingCycleDates.cycleStartDate,
        billingCycleDates.cycleEndDate,
        true,
        true
      )
      .toArray();
    return currentUser ? expensesInCycle.filter(exp => exp.userId === currentUser.id) : expensesInCycle;
  }, [billingCycleDates, currentUser]);

  const categories = useLiveQuery(() => db.categories.toArray());
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());

  const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
  const currencySymbol = getCurrencySymbol(currency);

  const categoryData = categories
    ?.map((cat) => ({
      name: cat.name,
      value: expenses?.filter((exp) => exp.categoryId === cat.id).reduce((sum, exp) => sum + exp.amount, 0) || 0,
    }))
    .filter((data) => data.value > 0);

  const paymentMethodData = paymentMethods
    ?.map((pm) => ({
      name: pm.name,
      value: expenses?.filter((exp) => exp.paymentMethodId === pm.id).reduce((sum, exp) => sum + exp.amount, 0) || 0,
    }))
    .filter((data) => data.value > 0);

  if (!billingCycleDates || expenses === undefined) {
    return (
      <Container sx={{ textAlign: 'center', my: 4 }}>
        <CircularProgress />
        <Typography>Loading summary...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ my: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Expense Summary
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardHeader
          title="Current Billing Cycle"
          subheader={`${format(billingCycleDates.cycleStartDate, 'MMM dd, yyyy')} - ${format(billingCycleDates.cycleEndDate, 'MMM dd, yyyy')}`}
        />
        <CardContent>
          <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
            Total: {currencySymbol}{totalExpenses.toFixed(2)}
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {categoryData && categoryData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Category Breakdown" />
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => percent ? `${name} ${(percent * 100).toFixed(0)}%` : name}
                      onClick={(data) => {
                        if (data && billingCycleDates) {
                          const startDate = format(billingCycleDates.cycleStartDate, 'yyyy-MM-dd');
                          const endDate = format(billingCycleDates.cycleEndDate, 'yyyy-MM-dd');
                          router.push(`/history?category=${encodeURIComponent(data.name)}&startDate=${startDate}&endDate=${endDate}`);
                        }
                      }}
                      cursor="pointer"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {paymentMethodData && paymentMethodData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Payment Method Breakdown" />
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={paymentMethodData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${currencySymbol}${value}`} />
                    <Tooltip formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`} />
                    <Legend />
                    <Bar
                      dataKey="value"
                      onClick={(data) => {
                        if (data && billingCycleDates) {
                          const startDate = format(billingCycleDates.cycleStartDate, 'yyyy-MM-dd');
                          const endDate = format(billingCycleDates.cycleEndDate, 'yyyy-MM-dd');
                          router.push(`/history?paymentMethod=${encodeURIComponent(data.name)}&startDate=${startDate}&endDate=${endDate}`);
                        }
                      }}
                      cursor="pointer"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {(!expenses || expenses.length === 0) && (
        <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
          No expenses found for this billing cycle.
        </Typography>
      )}
    </Container>
  );
}