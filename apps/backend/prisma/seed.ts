import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ID estable de la Organization "Plató" — el frontend lo usa en el header
// `x-organization-id` mientras no exista el módulo auth (ver lib/api.ts).
const PLATO_ORG_ID = '00000000-0000-0000-0000-000000000001';

// IDs de centros (Plató Teresas / Molinos). Coinciden con los mocks del
// frontend (apps/frontend/src/features/centers/data/mock-centers.ts).
const CENTER_TERESAS = '00000000-0000-0000-0000-0000000000c1';
const CENTER_MOLINOS = '00000000-0000-0000-0000-0000000000c2';

// Catálogo de categorías de gasto para Plató. Slugs estables — el frontend
// puede mapear etiquetas/iconos sin depender del id.
const EXPENSE_CATEGORIES: Array<{
  slug: string;
  name: string;
  isSalary: boolean;
  sortOrder: number;
}> = [
  { slug: 'lloguer', name: 'Lloguer', isSalary: false, sortOrder: 10 },
  { slug: 'autonoms', name: 'Autònoms', isSalary: false, sortOrder: 20 },
  { slug: 'nomines', name: 'Nómines', isSalary: true, sortOrder: 30 },
  { slug: 's-social', name: 'S.Social', isSalary: false, sortOrder: 40 },
  { slug: 'endesa', name: 'Endesa', isSalary: false, sortOrder: 50 },
  { slug: 'aigues', name: 'Aigües', isSalary: false, sortOrder: 60 },
  { slug: 'gestoria', name: 'Gestoría', isSalary: false, sortOrder: 70 },
  { slug: 'telefonia', name: 'Telefonía', isSalary: false, sortOrder: 80 },
  { slug: 'comision-recibos', name: 'Comisión recibos', isSalary: false, sortOrder: 90 },
  { slug: 'banco', name: 'Banco', isSalary: false, sortOrder: 100 },
  { slug: 'material', name: 'Material', isSalary: false, sortOrder: 110 },
  { slug: 'otros', name: 'Otros', isSalary: false, sortOrder: 120 },
];

// Plantillas seed con importes del PDF de referencia. Los importes "0" se
// omiten (no tiene sentido una plantilla sin importe).
type SeedTemplate = {
  slug: string; // slug de la categoría
  centerId: string;
  defaultAmount: string; // como string para no perder precisión decimal
};

const TEMPLATE_SEEDS: SeedTemplate[] = [
  { slug: 'lloguer', centerId: CENTER_TERESAS, defaultAmount: '803.62' },
  { slug: 'lloguer', centerId: CENTER_MOLINOS, defaultAmount: '1047.62' },
  { slug: 'autonoms', centerId: CENTER_TERESAS, defaultAmount: '194.10' },
  { slug: 'autonoms', centerId: CENTER_MOLINOS, defaultAmount: '194.10' },
  { slug: 's-social', centerId: CENTER_TERESAS, defaultAmount: '338.48' },
  { slug: 's-social', centerId: CENTER_MOLINOS, defaultAmount: '338.48' },
  { slug: 'endesa', centerId: CENTER_TERESAS, defaultAmount: '96.45' },
  { slug: 'endesa', centerId: CENTER_MOLINOS, defaultAmount: '54.22' },
  { slug: 'aigues', centerId: CENTER_TERESAS, defaultAmount: '111.53' },
  // Aigües c2 = 0 → sin plantilla.
  { slug: 'gestoria', centerId: CENTER_TERESAS, defaultAmount: '139.27' },
  { slug: 'gestoria', centerId: CENTER_MOLINOS, defaultAmount: '139.27' },
  { slug: 'telefonia', centerId: CENTER_TERESAS, defaultAmount: '22.99' },
  { slug: 'telefonia', centerId: CENTER_MOLINOS, defaultAmount: '31.99' },
  { slug: 'banco', centerId: CENTER_TERESAS, defaultAmount: '78.50' },
  { slug: 'banco', centerId: CENTER_MOLINOS, defaultAmount: '78.50' },
];

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

  // Centros base. Idempotente por id (alineado con los mocks del frontend).
  const centers = [
    { id: CENTER_TERESAS, slug: 'plato-teresas', name: 'Plató Teresas' },
    { id: CENTER_MOLINOS, slug: 'plato-molinos', name: 'Plató Molinos' },
  ];
  for (const c of centers) {
    await prisma.center.upsert({
      where: { id: c.id },
      update: { name: c.name },
      create: {
        id: c.id,
        organizationId: PLATO_ORG_ID,
        slug: c.slug,
        name: c.name,
      },
    });
  }
  console.log(`Centers: ${centers.length} upserted`);

  // Seed de categorías de gasto. Idempotente por (organizationId, slug).
  const categoryBySlug = new Map<string, string>();
  for (const cat of EXPENSE_CATEGORIES) {
    const row = await prisma.expenseCategory.upsert({
      where: { organizationId_slug: { organizationId: PLATO_ORG_ID, slug: cat.slug } },
      update: {
        name: cat.name,
        isSalary: cat.isSalary,
        sortOrder: cat.sortOrder,
      },
      create: {
        organizationId: PLATO_ORG_ID,
        slug: cat.slug,
        name: cat.name,
        isSalary: cat.isSalary,
        sortOrder: cat.sortOrder,
      },
    });
    categoryBySlug.set(cat.slug, row.id);
  }
  console.log(`Expense categories: ${EXPENSE_CATEGORIES.length} upserted`);

  // Seed de plantillas. Idempotente: si ya existe una plantilla activa
  // para (org, center, category) actualizamos su defaultAmount; si no, la
  // creamos. Reutilizamos findFirst porque no hay unique compuesto pensado
  // para sustituir (puede haber varias plantillas por categoría/centro en
  // el futuro, así que el seed-update se hace defensivamente).
  let tplCreated = 0;
  let tplUpdated = 0;
  let tplSkipped = 0;
  for (const seed of TEMPLATE_SEEDS) {
    const categoryId = categoryBySlug.get(seed.slug);
    if (!categoryId) {
      console.warn(`  ! Category slug "${seed.slug}" not found; skipping template`);
      tplSkipped++;
      continue;
    }
    // Comprobar que el centro existe; si no, saltarse (el seed de centers
    // todavía no se ha ejecutado en este script — TODO al añadir).
    const center = await prisma.center.findUnique({ where: { id: seed.centerId } });
    if (!center) {
      console.warn(
        `  ! Center ${seed.centerId} not found; skipping template ${seed.slug} (run centers seed first)`,
      );
      tplSkipped++;
      continue;
    }
    const existing = await prisma.expenseTemplate.findFirst({
      where: {
        organizationId: PLATO_ORG_ID,
        centerId: seed.centerId,
        categoryId,
        active: true,
      },
    });
    if (existing) {
      await prisma.expenseTemplate.update({
        where: { id: existing.id },
        data: { defaultAmount: new Prisma.Decimal(seed.defaultAmount) },
      });
      tplUpdated++;
    } else {
      await prisma.expenseTemplate.create({
        data: {
          organizationId: PLATO_ORG_ID,
          centerId: seed.centerId,
          categoryId,
          defaultAmount: new Prisma.Decimal(seed.defaultAmount),
          paymentMethod: 'sepa',
          active: true,
        },
      });
      tplCreated++;
    }
  }
  console.log(
    `Expense templates: ${tplCreated} created, ${tplUpdated} updated, ${tplSkipped} skipped`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
