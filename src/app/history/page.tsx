'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, IExpense } from '@/lib/db';
import { useStore } from '@/lib/store';
import {
  Box,
  Typography,
  Container,
  Paper,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Button,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import { subDays } from 'date-fns';

function HistoryContent() {
  const searchParams = useSearchParams();
  const { currentUser } = useStore();
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | null>(null);

  // Initialize from URL params
  useEffect(() => {
    const category = searchParams.get('category');
    const paymentMethod = searchParams.get('paymentMethod');
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');

    if (category) setCategoryFilter(category);
    if (paymentMethod) setPaymentMethodFilter(paymentMethod);
    if (urlStartDate) setStartDate(new Date(urlStartDate));
    if (urlEndDate) setEndDate(new Date(urlEndDate));
  }, [searchParams]);


  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray(), []);

  const expenses = useLiveQuery(() => {
    if (!currentUser?.id) return [];
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return db.expenses
      .where('userId')
      .equals(currentUser.id)
      .and(item => {
        const dateMatch = item.date >= start && item.date <= end;
        if (!dateMatch) return false;

        // Apply category filter if set
        if (categoryFilter && categories) {
          const category = categories.find(c => c.name === categoryFilter);
          if (category && item.categoryId !== category.id) return false;
        }

        // Apply payment method filter if set
        if (paymentMethodFilter && paymentMethods) {
          const paymentMethod = paymentMethods.find(pm => pm.name === paymentMethodFilter);
          if (paymentMethod && item.paymentMethodId !== paymentMethod.id) return false;
        }

        return true;
      })
      .toArray();
  }, [currentUser, startDate, endDate, categoryFilter, paymentMethodFilter, categories, paymentMethods]);


  const getCategoryName = (id: number) => categories?.find(c => c.id === id)?.name || 'N/A';
  const getPaymentMethodName = (id: number) => paymentMethods?.find(pm => pm.id === id)?.name || 'N/A';

  const exportToCsv = () => {
    if (!expenses || expenses.length === 0) {
      alert('No expenses to export.');
      return;
    }

    const headers = ['Date', 'Description', 'Amount', 'Category', 'Payment Method', 'Place'];
    const csvContent = [
      headers.join(','),
      ...expenses.map(expense => [
        expense.date.toLocaleDateString(),
        `"${expense.description.replace(/"/g, '""')}"`, // Handle quotes
        expense.amount.toFixed(2),
        getCategoryName(expense.categoryId),
        getPaymentMethodName(expense.paymentMethodId),
        `"${(expense.place || 'N/A').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `expenses-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setCategoryFilter(null);
    setPaymentMethodFilter(null);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Expense History
        </Typography>

        <Paper sx={{ p: 2, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Filter by Date
            </Typography>
            <Button variant="contained" onClick={exportToCsv}>
              Export to CSV
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              type="date"
              label="Start Date"
              value={startDate.toISOString().split('T')[0]}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="End Date"
              value={endDate.toISOString().split('T')[0]}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          {(categoryFilter || paymentMethodFilter) && (
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ alignSelf: 'center' }}>Active Filters:</Typography>
              {categoryFilter && (
                <Chip
                  label={`Category: ${categoryFilter}`}
                  onDelete={() => setCategoryFilter(null)}
                  color="primary"
                />
              )}
              {paymentMethodFilter && (
                <Chip
                  label={`Payment Method: ${paymentMethodFilter}`}
                  onDelete={() => setPaymentMethodFilter(null)}
                  color="primary"
                />
              )}
              <Button size="small" onClick={clearFilters}>Clear All</Button>
            </Stack>
          )}
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Payment Method</TableCell>
                <TableCell>Place</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses?.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.date.toLocaleDateString()}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.amount.toFixed(2)}</TableCell>
                  <TableCell>{getCategoryName(expense.categoryId)}</TableCell>
                  <TableCell>{getPaymentMethodName(expense.paymentMethodId)}</TableCell>
                  <TableCell>{expense.place || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={
      <Container maxWidth="lg" sx={{ textAlign: 'center', my: 4 }}>
        <CircularProgress />
        <Typography>Loading history...</Typography>
      </Container>
    }>
      <HistoryContent />
    </Suspense>
  );
}
