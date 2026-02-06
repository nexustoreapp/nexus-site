import { SUPPLIERS } from "./suppliers.config.js";

export function getActiveSuppliers() {
  return SUPPLIERS.filter(s => s.active);
}

export function getSupplierById(id) {
  return SUPPLIERS.find(s => s.id === id);
}