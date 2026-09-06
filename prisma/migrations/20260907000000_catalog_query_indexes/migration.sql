-- CreateIndex
CREATE INDEX `Product_status_storeIndustry_idx` ON `Product`(`status`, `storeIndustry`);

-- CreateIndex
CREATE INDEX `OrderItem_productId_idx` ON `OrderItem`(`productId`);
