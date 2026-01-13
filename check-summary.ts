import { drizzle } from 'drizzle-orm/mysql2';
import { debateSessions } from './drizzle/schema';
import { desc } from 'drizzle-orm';

async function checkSummary() {
  const db = drizzle(process.env.DATABASE_URL!);

  const sessions = await db.select().from(debateSessions).orderBy(desc(debateSessions.createdAt)).limit(1);

  if (sessions.length > 0) {
    const session = sessions[0];
    console.log('Latest session:');
    console.log('ID:', session.id);
    console.log('Topic:', session.topic);
    console.log('Status:', session.status);
    console.log('Summary:', JSON.stringify(session.summary, null, 2));
    console.log('Summary type:', typeof session.summary);
    console.log('Summary is null?', session.summary === null);
  } else {
    console.log('No sessions found');
  }

  process.exit(0);
}

checkSummary();
