import { placeSynceeOrder } from "./synceeBrowser.js";

export async function testSynceeBrowser(req, res) {
  try {
    const supplierOrderId = await placeSynceeOrder({});

    res.json({
      ok: true,
      supplierOrderId
    });

  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
