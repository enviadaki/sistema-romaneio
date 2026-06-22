import { pgTable, integer, primaryKey } from "drizzle-orm/pg-core";
import { routesTable } from "./routes";
import { citiesTable } from "./cities";

export const routeCitiesTable = pgTable(
  "route_cities",
  {
    routeId: integer("route_id")
      .notNull()
      .references(() => routesTable.id, { onDelete: "cascade" }),
    cityId: integer("city_id")
      .notNull()
      .references(() => citiesTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.routeId, t.cityId] })],
);

export type RouteCity = typeof routeCitiesTable.$inferSelect;
