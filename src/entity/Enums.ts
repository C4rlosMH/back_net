export enum ClientStatus {
  ACTIVO = "ACTIVO",
  SUSPENDIDO = "SUSPENDIDO",
  RETIRADO = "RETIRADO"
}

export enum EquipmentType {
  ROUTER = "ROUTER",
  ANTENA = "ANTENA",
  MODEM = "MODEM"
}

export enum EquipmentStatus {
  BODEGA = "BODEGA",
  INSTALADO = "INSTALADO",
  AVERIADO = "AVERIADO",
  RETIRADO = "RETIRADO"
}

export enum PaymentMethod {
  EFECTIVO = "EFECTIVO",
  TRANSFERENCIA = "TRANSFERENCIA",
  DEPOSITO = "DEPOSITO"
}

export enum PaymentType {
    FULL = "FULL",         // Pago completo de la mensualidad
    PARTIAL = "PARTIAL",   // Pago de una parte (genera saldo pendiente)
    DEFERRED = "DEFERRED"  // Pago aplazado (se compromete a pagar después)
}