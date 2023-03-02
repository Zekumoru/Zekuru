import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const usage = {
  characterUsed: 200,
  characterLimit: 400000,
};

(async () => {
  const uri = process.env.MONGO_DB_URI || '';

  const client = new MongoClient(uri);

  try {
    await client.connect();

    await updateUsageCount(client, 'Google', usage);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
})();

async function updateUsageCount(
  client: MongoClient,
  translator: string,
  usage: any
) {
  const result = await client
    .db('Zekuru')
    .collection('TranslationUsage')
    .updateOne(
      {
        translator: translator,
      },
      {
        $set: usage,
      },
      {
        upsert: true,
      }
    );

  if (result.upsertedCount > 0) {
    console.log('A new entry has been created: ' + translator);
  } else {
    console.log('An entry has been updated: ' + translator);
  }
}
