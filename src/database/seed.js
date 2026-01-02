import { query } from '../config/database.js';
import bcrypt from 'bcrypt';

export const seed = async () => {
  try {
    console.log('Starting database seed...');

    // Insert test users
    const testUsers = [
      {
        firebase_uid: 'test_user_1',
        real_name: 'Alice Johnson',
        phone_e164: '+1234567890',
        avatar_url: 'https://example.com/avatars/alice.jpg'
      },
      {
        firebase_uid: 'test_user_2',
        real_name: 'Bob Smith',
        phone_e164: '+1234567891',
        avatar_url: 'https://example.com/avatars/bob.jpg'
      },
      {
        firebase_uid: 'test_user_3',
        real_name: 'Carol Williams',
        phone_e164: '+1234567892',
        google_sub: 'google_carol_123',
        avatar_url: 'https://example.com/avatars/carol.jpg'
      }
    ];

    for (const user of testUsers) {
      await query(
        `INSERT INTO users (firebase_uid, real_name, phone_e164, google_sub, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (firebase_uid) DO NOTHING`,
        [user.firebase_uid, user.real_name, user.phone_e164, user.google_sub || null, user.avatar_url]
      );
      console.log(`Inserted user: ${user.real_name}`);
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  }
};

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
