
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

console.log('Loading env from:', envPath);
console.log('Parsed DATABASE_URL:', process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing!');
} else {
    console.log('DATABASE_URL is present.');
}
