import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ID estable de la Organization "Plató" — el frontend lo usa en el header
// `x-organization-id` mientras no exista el módulo auth (ver lib/api.ts).
const PLATO_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: PLATO_ORG_ID },
    update: {},
    create: {
      id: PLATO_ORG_ID,
      slug: 'plato',
      name: "Plató Centre d'estudis",
      enabledModules: 'crm,billing,scheduling,communications',
    },
  });
  console.log(`Organization "${org.name}" ready (${org.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
