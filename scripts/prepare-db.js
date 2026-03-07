const { Client } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for db:prepare");
  }

  const isLocalhost =
    connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  const client = new Client({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    console.log("Database extension check complete (pgcrypto).");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("db:prepare failed:", error);
  process.exit(1);
});
