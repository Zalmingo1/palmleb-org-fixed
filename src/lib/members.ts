import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
 
export async function getMemberById(id: string) {
  const { db } = await connectToDatabase();
  const member = await db.collection('users').findOne({ _id: new ObjectId(id) });
  return member;
} 