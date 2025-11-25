
'use client';

import React, { useState } from 'react';
import { db, IUser } from '../../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Trash2, Edit2 } from 'lucide-react';
import Link from 'next/link';

export default function UsersPage() {
  const users = useLiveQuery(() => db.users.toArray(), []);
  const [newUserName, setNewUserName] = useState('');
  const [editingUser, setEditingUser] = useState<IUser | null>(null);

  const handleAddUser = async () => {
    if (newUserName.trim()) {
      await db.users.add({ name: newUserName.trim() });
      setNewUserName('');
    }
  };

  const handleDeleteUser = async (id: number) => {
    await db.users.delete(id);
  };

  const handleEditUser = (user: IUser) => {
    setEditingUser(user);
    setNewUserName(user.name);
  };

  const handleUpdateUser = async () => {
    if (editingUser && newUserName.trim()) {
      await db.users.update(editingUser.id!, { name: newUserName.trim() });
      setEditingUser(null);
      setNewUserName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setNewUserName('');
  };

  return (
    <div className="container mx-auto p-4">
      <Link href="/settings" className="text-blue-500 hover:underline mb-4 block">
        &larr; Back to Settings
      </Link>
      <h1 className="text-2xl font-bold mb-4">Manage Users</h1>

      <div className="flex space-x-2 mb-4">
        <Input
          type="text"
          placeholder={editingUser ? 'Edit user name' : 'New user name'}
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
          className="flex-grow"
        />
        {editingUser ? (
          <>
            <Button onClick={handleUpdateUser}>Update User</Button>
            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
          </>
        ) : (
          <Button onClick={handleAddUser}>Add User</Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id!)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
