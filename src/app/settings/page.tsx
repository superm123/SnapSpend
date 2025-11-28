'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, ISetting } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useStore } from '@/lib/store';
import { getCurrencySymbol, currencySymbolMap } from '@/lib/utils/currency';

export default function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get(1)); // Assuming a single settings entry with ID 1
  const [billingCycleStart, setBillingCycleStart] = useState<string>('20');
  const { currency, setCurrency } = useStore();

  useEffect(() => {
    if (settings) {
      setBillingCycleStart(settings.billingCycleStart.toString());
    }
  }, [settings]);

  const handleBillingCycleChange = async (value: string) => {
    const day = parseInt(value);
    if (!isNaN(day) && day >= 1 && day <= 31) {
      await db.settings.update(1, { billingCycleStart: day });
      setBillingCycleStart(value);
    }
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">User Management</h2>
        <p className="mb-2">Add or remove users for family mode.</p>
        <Link href="/settings/users">
          <Button>Manage Users</Button>
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Billing Cycle</h2>
        <p className="mb-2">Set the start day of your billing cycle (1-31).</p>
        <div className="flex items-center space-x-2">
          <Label htmlFor="billingCycleStart">Cycle starts on day:</Label>
          <Select value={billingCycleStart} onValueChange={handleBillingCycleChange}>
            <SelectTrigger id="billingCycleStart" className="w-[100px]">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Currency Settings</h2>
        <p className="mb-2">Select your preferred currency.</p>
        <div className="flex items-center space-x-2">
          <Label htmlFor="currency">Current Currency:</Label>
          <Select value={currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(currencySymbolMap).map((currencyCode) => (
                <SelectItem key={currencyCode} value={currencyCode}>
                  {currencyCode} ({getCurrencySymbol(currencyCode)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}