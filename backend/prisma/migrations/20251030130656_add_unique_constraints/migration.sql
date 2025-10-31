/*
  Warnings:

  - A unique constraint covering the columns `[name,eventId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,categoryId]` on the table `Lot` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Category_name_eventId_key" ON "Category"("name", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_name_categoryId_key" ON "Lot"("name", "categoryId");
