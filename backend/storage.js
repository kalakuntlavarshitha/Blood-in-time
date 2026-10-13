const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const INITIAL_DATA = {
  banks: [
    {
      id: "bank-a",
      name: "Blood Bank A",
      isPrimary: true,
      inventory: [
        { group: "A+", stock: 20, minimum: 15 },
        { group: "A-", stock: 5, minimum: 8 },
        { group: "B+", stock: 18, minimum: 12 },
        { group: "B-", stock: 4, minimum: 7 },
        { group: "AB+", stock: 10, minimum: 8 },
        { group: "AB-", stock: 3, minimum: 5 },
        { group: "O+", stock: 6, minimum: 10 },
        { group: "O-", stock: 8, minimum: 6 }
      ]
    },
    {
      id: "bank-b",
      name: "Blood Bank B",
      isPrimary: false,
      inventory: [
        { group: "A+", stock: 15, minimum: 10 },
        { group: "A-", stock: 8, minimum: 5 },
        { group: "B+", stock: 12, minimum: 8 },
        { group: "B-", stock: 6, minimum: 5 },
        { group: "AB+", stock: 8, minimum: 5 },
        { group: "AB-", stock: 4, minimum: 3 },
        { group: "O+", stock: 20, minimum: 10 },
        { group: "O-", stock: 5, minimum: 5 }
      ]
    },
    {
      id: "bank-c",
      name: "Blood Bank C",
      isPrimary: false,
      inventory: [
        { group: "A+", stock: 10, minimum: 10 },
        { group: "A-", stock: 15, minimum: 5 },
        { group: "B+", stock: 8, minimum: 8 },
        { group: "B-", stock: 5, minimum: 5 },
        { group: "AB+", stock: 6, minimum: 5 },
        { group: "AB-", stock: 3, minimum: 3 },
        { group: "O+", stock: 12, minimum: 10 },
        { group: "O-", stock: 10, minimum: 5 }
      ]
    },
    {
      id: "bank-d",
      name: "Blood Bank D",
      isPrimary: false,
      inventory: [
        { group: "A+", stock: 12, minimum: 10 },
        { group: "A-", stock: 4, minimum: 5 },
        { group: "B+", stock: 14, minimum: 8 },
        { group: "B-", stock: 12, minimum: 5 },
        { group: "AB+", stock: 7, minimum: 5 },
        { group: "AB-", stock: 2, minimum: 3 },
        { group: "O+", stock: 15, minimum: 10 },
        { group: "O-", stock: 7, minimum: 5 }
      ]
    },
    {
      id: "bank-e",
      name: "Blood Bank E",
      isPrimary: false,
      inventory: [
        { group: "A+", stock: 9, minimum: 10 },
        { group: "A-", stock: 6, minimum: 5 },
        { group: "B+", stock: 10, minimum: 8 },
        { group: "B-", stock: 4, minimum: 5 },
        { group: "AB+", stock: 16, minimum: 5 },
        { group: "AB-", stock: 10, minimum: 3 },
        { group: "O+", stock: 11, minimum: 10 },
        { group: "O-", stock: 6, minimum: 5 }
      ]
    }
  ],
  requests: [
    {
      id: "req_demo_1",
      bloodGroup: "O+",
      units: 4,
      urgency: "Emergency",
      hospitalName: "City General Hospital",
      status: "Pending",
      createdAt: "2026-10-12T10:00:00.000Z"
    }
  ],
  transfers: [
    {
      id: "xfer_demo_1",
      sourceBankId: "bank-b",
      sourceBankName: "Blood Bank B",
      destinationBankId: "bank-a",
      destinationBankName: "Blood Bank A",
      group: "O+",
      units: 5,
      timestamp: "2026-10-12T09:30:00.000Z",
      status: "Completed",
      note: "Prototype redistribution transfer"
    }
  ]
};

function ensureInitialized() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
  }
}

function readStore() {
  ensureInitialized();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading data store, resetting to initial data:', err);
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }
}

function writeStore(data) {
  ensureInitialized();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// -------------------------------------------------------------
// INVENTORY & BANKS
// -------------------------------------------------------------

function getPrimaryBank(store) {
  return store.banks.find((b) => b.isPrimary) || store.banks[0];
}

function getPrimaryInventory() {
  const store = readStore();
  const primary = getPrimaryBank(store);
  return primary ? primary.inventory : [];
}

function updatePrimaryStock(group, newStock) {
  const store = readStore();
  const primary = getPrimaryBank(store);
  if (!primary) return null;

  const item = primary.inventory.find(
    (i) => i.group.toUpperCase() === group.toUpperCase()
  );
  if (!item) return null;

  item.stock = Number(newStock);
  writeStore(store);
  return item;
}

function getAllBanks() {
  const store = readStore();
  return store.banks;
}

function findBank(store, identifier) {
  if (!identifier) return null;
  const cleanId = String(identifier).trim().toLowerCase();
  return store.banks.find(
    (b) =>
      b.id.toLowerCase() === cleanId ||
      b.name.toLowerCase() === cleanId
  );
}

// -------------------------------------------------------------
// REQUESTS
// -------------------------------------------------------------

function getAllRequests() {
  const store = readStore();
  return store.requests || [];
}

function createRequest({ bloodGroup, units, urgency, hospitalName }) {
  const store = readStore();
  const newReq = {
    id: `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    bloodGroup: bloodGroup.toUpperCase(),
    units: Number(units),
    urgency: urgency || "Normal",
    hospitalName: hospitalName || "City General Hospital",
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  if (!store.requests) {
    store.requests = [];
  }
  store.requests.unshift(newReq);
  writeStore(store);
  return newReq;
}

function getRequestById(id) {
  const store = readStore();
  return (store.requests || []).find((r) => r.id === id);
}

function issueBloodRequest(requestId, bankIdentifier) {
  const store = readStore();
  const request = (store.requests || []).find((r) => r.id === requestId);

  if (!request) {
    return { error: "Request not found", statusCode: 404 };
  }

  if (request.status === "Issued") {
    return {
      error: "Request has already been issued. Inventory cannot be deducted twice.",
      statusCode: 409
    };
  }

  // Find the supplying bank (default to primary bank if not specified)
  let bank = null;
  if (bankIdentifier) {
    bank = findBank(store, bankIdentifier);
  }
  if (!bank) {
    bank = getPrimaryBank(store);
  }

  if (!bank) {
    return { error: "Supplying blood bank not found", statusCode: 404 };
  }

  const bloodItem = bank.inventory.find(
    (i) => i.group.toUpperCase() === request.bloodGroup.toUpperCase()
  );

  if (!bloodItem) {
    return {
      error: `Blood group ${request.bloodGroup} not stocked at ${bank.name}`,
      statusCode: 404
    };
  }

  if (bloodItem.stock < request.units) {
    return {
      error: `Insufficient stock at ${bank.name}. Requested: ${request.units}, Available: ${bloodItem.stock}`,
      statusCode: 400
    };
  }

  // Deduct stock only upon successful issue
  bloodItem.stock -= request.units;
  request.status = "Issued";
  request.issuedAt = new Date().toISOString();
  request.issuedFromBank = bank.name;
  request.issuedBankId = bank.id;
  request.unitsIssued = request.units;

  writeStore(store);

  return {
    success: true,
    request,
    bank: {
      id: bank.id,
      name: bank.name,
      inventory: bank.inventory
    }
  };
}

// -------------------------------------------------------------
// REDISTRIBUTION TRANSFERS
// -------------------------------------------------------------

function getAllTransfers() {
  const store = readStore();
  return store.transfers || [];
}

function executeTransfer({ source, destination, group, units, note }) {
  const store = readStore();

  const sourceBank = findBank(store, source);
  const destBank = findBank(store, destination);

  if (!sourceBank) {
    return { error: `Source bank "${source}" not found`, statusCode: 404 };
  }

  if (!destBank) {
    return { error: `Destination bank "${destination}" not found`, statusCode: 404 };
  }

  if (sourceBank.id === destBank.id) {
    return {
      error: "Cannot transfer blood to the same blood bank",
      statusCode: 400
    };
  }

  const transferUnits = Number(units);
  if (!Number.isInteger(transferUnits) || transferUnits <= 0) {
    return {
      error: "Transfer units must be a positive whole integer",
      statusCode: 400
    };
  }

  const cleanGroup = String(group).trim().toUpperCase();
  const sourceItem = sourceBank.inventory.find(
    (i) => i.group.toUpperCase() === cleanGroup
  );

  if (!sourceItem) {
    return {
      error: `Blood group ${cleanGroup} not found at source bank ${sourceBank.name}`,
      statusCode: 404
    };
  }

  if (sourceItem.stock < transferUnits) {
    return {
      error: `Transfer exceeds available stock at ${sourceBank.name}. Available: ${sourceItem.stock}, Requested: ${transferUnits}`,
      statusCode: 400
    };
  }

  // Deduct from source
  sourceItem.stock -= transferUnits;

  // Add to destination
  let destItem = destBank.inventory.find(
    (i) => i.group.toUpperCase() === cleanGroup
  );
  if (destItem) {
    destItem.stock += transferUnits;
  } else {
    destBank.inventory.push({
      group: cleanGroup,
      stock: transferUnits,
      minimum: 5
    });
  }

  const transferRecord = {
    id: `xfer_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    sourceBankId: sourceBank.id,
    sourceBankName: sourceBank.name,
    destinationBankId: destBank.id,
    destinationBankName: destBank.name,
    group: cleanGroup,
    units: transferUnits,
    timestamp: new Date().toISOString(),
    status: "Completed",
    note: note || "Prototype redistribution transfer"
  };

  if (!store.transfers) {
    store.transfers = [];
  }
  store.transfers.unshift(transferRecord);

  writeStore(store);

  return {
    success: true,
    transfer: transferRecord,
    sourceBank: {
      id: sourceBank.id,
      name: sourceBank.name,
      inventory: sourceBank.inventory
    },
    destinationBank: {
      id: destBank.id,
      name: destBank.name,
      inventory: destBank.inventory
    }
  };
}

module.exports = {
  getPrimaryInventory,
  updatePrimaryStock,
  getAllBanks,
  findBank,
  getAllRequests,
  createRequest,
  getRequestById,
  issueBloodRequest,
  getAllTransfers,
  executeTransfer
};
