import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function listInvoices() {
	const data = await sql`
    SELECT invoices.amount, customers.name
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE invoices.amount = 666;
  `;

	return data;
}

async function listUsers() {
  const data = await sql`
    SELECT *
    FROM users
  `
  return data;
} 

async function dropDatabase() {
  await sql`DROP TABLE IF EXISTS invoices`;
  await sql`DROP TABLE IF EXISTS customers`;
  await sql`DROP TABLE IF EXISTS users`;
  await sql`DROP TABLE IF EXISTS revenue`;

  return { message: 'Database dropped successfully' };
}

export async function GET() {
  // return Response.json({
  //   message:
  //     'Uncomment this file and remove this line. You can delete this file when you are finished.',
  // });
  try {
  	return Response.json(await listUsers());
  } catch (error) {
  	return Response.json({ error }, { status: 500 });
  }
}
