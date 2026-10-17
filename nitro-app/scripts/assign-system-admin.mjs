import postgres from "postgres";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !process.env.DATABASE_URL) {
  console.error("Usage: DATABASE_URL=... node scripts/assign-system-admin.mjs <verified Google email>");
  process.exit(1);
}

const db = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const [account] = await db`
    SELECT users.id FROM users
    JOIN auth_identities ON auth_identities.user_id = users.id
    WHERE users.email = ${email} AND users.status = 'active'
      AND auth_identities.provider = 'google' AND auth_identities.email_verified = true
    LIMIT 1
  `;
  if (!account) {
    console.error("Verified Google account not found; sign in first");
    process.exitCode = 1;
  } else {
    await db.begin(async (tx) => {
      await tx`INSERT INTO user_roles (user_id, role)
        VALUES (${account.id}, 'system_admin') ON CONFLICT (user_id, role) DO NOTHING`;
      await tx`INSERT INTO audit_events (user_id, event_type, metadata)
        VALUES (${account.id}, 'role.bootstrap', ${JSON.stringify({ role: "system_admin" })}::jsonb)`;
    });
    console.log("System administrator role assigned to verified Google account");
  }
} finally {
  await db.end();
}
