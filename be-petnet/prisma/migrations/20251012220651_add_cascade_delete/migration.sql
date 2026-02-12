-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Mascota" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "sexo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamaño" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "publicacionId" INTEGER NOT NULL,
    CONSTRAINT "Mascota_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "Publicacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Mascota" ("descripcion", "id", "nombre", "publicacionId", "sexo", "tamaño", "tipo") SELECT "descripcion", "id", "nombre", "publicacionId", "sexo", "tamaño", "tipo" FROM "Mascota";
DROP TABLE "Mascota";
ALTER TABLE "new_Mascota" RENAME TO "Mascota";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
