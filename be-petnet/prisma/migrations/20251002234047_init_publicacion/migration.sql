-- CreateTable
CREATE TABLE "Publicacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "foto" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    CONSTRAINT "Publicacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mascota" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "sexo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamaño" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "publicacionId" INTEGER NOT NULL,
    CONSTRAINT "Mascota_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "Publicacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
