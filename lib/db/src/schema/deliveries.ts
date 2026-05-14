import { pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveriesTable = pgTable(
  "deliveries",
  {
    id: serial("id").primaryKey(),
    trackingNumber: text("tracking_number").notNull(),
    city: text("city").notNull(),
    route: text("route").notNull(),
    deliveryDate: text("delivery_date").notNull(),
    deliveredBy: text("delivered_by"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("deliveries_tracking_number_delivery_date_unique").on(
      table.trackingNumber,
      table.deliveryDate,
    ),
  ],
);

export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({
  id: true,
  deliveredAt: true,
});
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;
