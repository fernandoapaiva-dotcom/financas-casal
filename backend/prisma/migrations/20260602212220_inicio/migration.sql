-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "telefone" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    "deletadoEm" DATETIME
);

-- CreateTable
CREATE TABLE "Casal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "orcamentoMensal" REAL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    "deletadoEm" DATETIME
);

-- CreateTable
CREATE TABLE "MembroCasal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "casalId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'MEMBRO',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembroCasal_casalId_fkey" FOREIGN KEY ("casalId") REFERENCES "Casal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MembroCasal_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "casalId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "pluggyItemId" TEXT,
    "pluggyContaId" TEXT,
    "nome" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "saldoAtual" REAL NOT NULL DEFAULT 0,
    "ultimoSync" DATETIME,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    "deletadoEm" DATETIME,
    CONSTRAINT "Conta_casalId_fkey" FOREIGN KEY ("casalId") REFERENCES "Casal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Conta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contaId" TEXT,
    "casalId" TEXT NOT NULL,
    "pluggyTransacaoId" TEXT,
    "descricao" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT,
    "subcategoria" TEXT,
    "estabelecimento" TEXT,
    "data" DATETIME NOT NULL,
    "parcelada" BOOLEAN NOT NULL DEFAULT false,
    "parcelaAtual" INTEGER,
    "parcelasTotal" INTEGER,
    "lancadaManualmente" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    "deletadoEm" DATETIME,
    CONSTRAINT "Transacao_casalId_fkey" FOREIGN KEY ("casalId") REFERENCES "Casal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transacao_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContaFixa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "casalId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    "deletadoEm" DATETIME,
    CONSTRAINT "ContaFixa_casalId_fkey" FOREIGN KEY ("casalId") REFERENCES "Casal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrcamentoCategoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "casalId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "limiteValor" REAL NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "OrcamentoCategoria_casalId_fkey" FOREIGN KEY ("casalId") REFERENCES "Casal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MembroCasal_casalId_usuarioId_key" ON "MembroCasal"("casalId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Transacao_pluggyTransacaoId_key" ON "Transacao"("pluggyTransacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "OrcamentoCategoria_casalId_mes_ano_categoria_key" ON "OrcamentoCategoria"("casalId", "mes", "ano", "categoria");
