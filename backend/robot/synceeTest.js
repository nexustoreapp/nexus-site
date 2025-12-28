import { placeSynceeOrder } from "./synceeBrowser.js";

export async function testSynceeBrowser(req, res) {
  try {
    const fakeOrder = {
      supplier: {
        supplierSku: "RAM DDR5"
      }
    };

    const supplierOrderId = await placeSynceeOrder(fakeOrder);

    res.json({
      ok: true,
      supplierOrderId
    });

  } catch (err) {
    console.error("[SYNCEE TEST ERROR]", err);
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
