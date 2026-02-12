-- CreateTable
CREATE TABLE "Solicitud" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "estado" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "publicacionId" INTEGER NOT NULL,
    CONSTRAINT "Solicitud_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Solicitud_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "Publicacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Solicitud_usuarioId_publicacionId_key" ON "Solicitud"("usuarioId", "publicacionId");
