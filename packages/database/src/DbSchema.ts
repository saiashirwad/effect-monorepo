import * as Drizzle from "drizzle-orm";
import * as pg from "drizzle-orm/pg-core";

export const usersTable = pg.pgTable("users", {
  id: pg.uuid("id").primaryKey().defaultRandom(),
  username: pg.text("username").notNull().unique(),
  createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pg.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const todosTable = pg.pgTable("todos", {
  id: pg.uuid("id").primaryKey().defaultRandom(),
  title: pg.text("title").notNull(),
  completed: pg.boolean("completed").notNull().default(false),
  createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pg.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  userId: pg.uuid("user_id").references(() => usersTable.id),
});

export const usersRelations = Drizzle.relations(usersTable, ({ many }) => ({
  todos: many(todosTable),
}));

export const todosRelations = Drizzle.relations(todosTable, ({ one }) => ({
  user: one(usersTable, { fields: [todosTable.userId], references: [usersTable.id] }),
}));
