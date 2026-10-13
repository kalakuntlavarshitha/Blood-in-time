const express = require("express");
const cors = require("cors");
const storage = require("./storage");

const app = express();

app.use(cors());
app.use(express.json());

const VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const VALID_URGENCIES = ["Emergency", "Urgent", "Normal"];

// ==================================================
// HOME ROUTE
// ==================================================
app.get("/", (req, res) => {
  res.send("Blood in Time Backend is running!");
});

// ==================================================
// 1. HEALTH CHECK
// ==================================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "Backend is connected successfully"
  });
});

// ==================================================
// 2. GET BLOOD INVENTORY
// ==================================================
app.get("/api/inventory", (req, res) => {
  try {
    const inventory = storage.getPrimaryInventory();
    res.json(inventory);
  } catch (error) {
    console.error("Failed to get inventory:", error);
    res.status(500).json({ message: "Internal server error retrieving inventory" });
  }
});

// ==================================================
// 3. UPDATE BLOOD STOCK
// ==================================================
app.put("/api/inventory/:group", (req, res) => {
  const { group } = req.params;
  const { stock } = req.body;

  if (stock === undefined || stock === null || stock === "") {
    return res.status(400).json({
      message: "Stock value is required"
    });
  }

  const numericStock = Number(stock);
  if (!Number.isFinite(numericStock) || numericStock < 0 || !Number.isInteger(numericStock)) {
    return res.status(400).json({
      message: "Stock must be a non-negative whole integer"
    });
  }

  const updatedItem = storage.updatePrimaryStock(group, numericStock);

  if (!updatedItem) {
    return res.status(404).json({
      message: `Blood group "${group}" not found in inventory`
    });
  }

  res.json({
    message: "Blood stock updated successfully",
    inventory: updatedItem
  });
});

// ==================================================
// 4. GET ALL BLOOD BANKS WITH INVENTORIES
// ==================================================
app.get("/api/banks", (req, res) => {
  try {
    const banks = storage.getAllBanks();
    res.json(banks);
  } catch (error) {
    console.error("Failed to get banks:", error);
    res.status(500).json({ message: "Internal server error retrieving banks" });
  }
});

// ==================================================
// 5. CREATE HOSPITAL BLOOD REQUEST
// ==================================================
app.post("/api/requests", (req, res) => {
  const { bloodGroup, units, requestedUnits, urgency, hospitalName } = req.body;
  const unitsToRequest = units !== undefined ? units : requestedUnits;

  if (!bloodGroup || typeof bloodGroup !== "string") {
    return res.status(400).json({
      message: "Blood group is required"
    });
  }

  const normalizedGroup = bloodGroup.trim().toUpperCase();
  if (!VALID_BLOOD_GROUPS.includes(normalizedGroup)) {
    return res.status(400).json({
      message: `Invalid blood group "${bloodGroup}". Must be one of: ${VALID_BLOOD_GROUPS.join(", ")}`
    });
  }

  const numericUnits = Number(unitsToRequest);
  if (!Number.isInteger(numericUnits) || numericUnits <= 0) {
    return res.status(400).json({
      message: "Units must be a positive integer greater than 0"
    });
  }

  if (urgency && !VALID_URGENCIES.map((u) => u.toLowerCase()).includes(String(urgency).toLowerCase())) {
    return res.status(400).json({
      message: `Invalid urgency. Allowed values: ${VALID_URGENCIES.join(", ")}`
    });
  }

  const newRequest = storage.createRequest({
    bloodGroup: normalizedGroup,
    units: numericUnits,
    urgency: urgency || "Normal",
    hospitalName: hospitalName || "City General Hospital"
  });

  res.status(201).json({
    message: "Blood request created successfully",
    request: newRequest
  });
});

// ==================================================
// 6. GET HOSPITAL BLOOD REQUEST HISTORY
// ==================================================
app.get("/api/requests", (req, res) => {
  try {
    const requests = storage.getAllRequests();
    res.json(requests);
  } catch (error) {
    console.error("Failed to get requests:", error);
    res.status(500).json({ message: "Internal server error retrieving requests" });
  }
});

// ==================================================
// 7. CONFIRM BLOOD ISSUE TO HOSPITAL
// ==================================================
app.post("/api/requests/:id/issue", (req, res) => {
  const { id } = req.params;
  const { bankId, bankName, sourceBank } = req.body || {};
  const supplyingBank = bankId || bankName || sourceBank;

  const result = storage.issueBloodRequest(id, supplyingBank);

  if (result.error) {
    return res.status(result.statusCode || 400).json({
      message: result.error
    });
  }

  res.json({
    message: "Blood request issued successfully",
    request: result.request,
    bank: result.bank
  });
});

// ==================================================
// 8. REDISTRIBUTION TRANSFER
// ==================================================
app.post("/api/redistribution/transfer", (req, res) => {
  const {
    sourceBank,
    sourceBankId,
    destinationBank,
    destinationBankId,
    group,
    bloodGroup,
    units,
    quantity,
    note
  } = req.body;

  const source = sourceBank || sourceBankId;
  const destination = destinationBank || destinationBankId;
  const blood = group || bloodGroup;
  const amount = units !== undefined ? units : quantity;

  if (!source) {
    return res.status(400).json({
      message: "Source bank is required"
    });
  }

  if (!destination) {
    return res.status(400).json({
      message: "Destination bank is required"
    });
  }

  if (!blood) {
    return res.status(400).json({
      message: "Blood group is required"
    });
  }

  const normalizedGroup = String(blood).trim().toUpperCase();
  if (!VALID_BLOOD_GROUPS.includes(normalizedGroup)) {
    return res.status(400).json({
      message: `Invalid blood group "${blood}". Must be one of: ${VALID_BLOOD_GROUPS.join(", ")}`
    });
  }

  if (amount === undefined || amount === null) {
    return res.status(400).json({
      message: "Transfer units are required"
    });
  }

  const numericUnits = Number(amount);
  if (!Number.isInteger(numericUnits) || numericUnits <= 0) {
    return res.status(400).json({
      message: "Transfer units must be a positive integer greater than 0"
    });
  }

  const result = storage.executeTransfer({
    source,
    destination,
    group: normalizedGroup,
    units: numericUnits,
    note
  });

  if (result.error) {
    return res.status(result.statusCode || 400).json({
      message: result.error
    });
  }

  res.json({
    message: "Prototype redistribution transfer recorded successfully",
    transfer: result.transfer,
    sourceBank: result.sourceBank,
    destinationBank: result.destinationBank
  });
});

// ==================================================
// 9. REDISTRIBUTION TRANSFER HISTORY
// ==================================================
app.get("/api/redistribution/history", (req, res) => {
  try {
    const history = storage.getAllTransfers();
    res.json(history);
  } catch (error) {
    console.error("Failed to get transfer history:", error);
    res.status(500).json({ message: "Internal server error retrieving transfer history" });
  }
});

// ==================================================
// START SERVER
// ==================================================
const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;