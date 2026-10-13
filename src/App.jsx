import { useEffect, useState } from 'react'
import './App.css'

function App() {
  // ==================================================
  // PAGE NAVIGATION
  // ==================================================
  const [page, setPage] = useState('home')

  // ==================================================
  // HOSPITAL REQUEST FORM STATE
  // ==================================================
  const [submitted, setSubmitted] = useState(false)
  const [bloodGroup, setBloodGroup] = useState('')
  const [units, setUnits] = useState('')
  const [urgency, setUrgency] = useState('')
  const [hospitalName, setHospitalName] = useState('City General Hospital')
  const [requestResult, setRequestResult] = useState(null)
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [issuingBlood, setIssuingBlood] = useState(false)

  // ==================================================
  // INVENTORY & BANKS STATE
  // ==================================================
  const [inventory, setInventory] = useState([])
  const [inventoryLoading, setInventoryLoading] = useState(true)
  const [inventoryError, setInventoryError] = useState(null)
  const [stockUpdateError, setStockUpdateError] = useState(null)

  const [banks, setBanks] = useState([])

  // ==================================================
  // REDISTRIBUTION & TRANSFER STATE
  // ==================================================
  const [transferMessage, setTransferMessage] = useState('')
  const [transferError, setTransferError] = useState(null)
  const [transferring, setTransferring] = useState(false)

  // ==================================================
  // HISTORY LOGS STATE
  // ==================================================
  const [requestsHistory, setRequestsHistory] = useState([])
  const [transfersHistory, setTransfersHistory] = useState([])

  // ==================================================
  // DATA FETCHING FUNCTIONS
  // ==================================================
  const loadInventory = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/inventory')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setInventory(data)
      setInventoryError(null)
    } catch (error) {
      console.error('Failed to load inventory:', error)
      setInventoryError('Unable to load inventory. Ensure the backend server is running.')
    } finally {
      setInventoryLoading(false)
    }
  }

  const loadBanks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/banks')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setBanks(data)
    } catch (error) {
      console.error('Failed to load blood banks:', error)
    }
  }

  const loadRequests = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/requests')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setRequestsHistory(data)
    } catch (error) {
      console.error('Failed to load requests history:', error)
    }
  }

  const loadTransfers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/redistribution/history')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setTransfersHistory(data)
    } catch (error) {
      console.error('Failed to load transfer history:', error)
    }
  }

  useEffect(() => {
    let ignore = false
    const fetchInitialData = async () => {
      try {
        const [invRes, banksRes, reqRes, xferRes] = await Promise.all([
          fetch('http://localhost:5000/api/inventory'),
          fetch('http://localhost:5000/api/banks'),
          fetch('http://localhost:5000/api/requests'),
          fetch('http://localhost:5000/api/redistribution/history')
        ])
        if (!ignore) {
          if (invRes.ok) setInventory(await invRes.json())
          if (banksRes.ok) setBanks(await banksRes.json())
          if (reqRes.ok) setRequestsHistory(await reqRes.json())
          if (xferRes.ok) setTransfersHistory(await xferRes.json())
          setInventoryLoading(false)
        }
      } catch (err) {
        if (!ignore) {
          console.error('Initial data load error:', err)
          setInventoryError('Unable to load initial data. Ensure the backend server is running.')
          setInventoryLoading(false)
        }
      }
    }
    fetchInitialData()
    return () => {
      ignore = true
    }
  }, [])

  // ==================================================
  // TEST BACKEND CONNECTION
  // ==================================================
  const testBackend = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health')
      const data = await response.json()
      console.log('Backend response:', data)
      alert(`Backend connected successfully! Status: ${data.status} - ${data.message}`)
    } catch (error) {
      console.error('Backend connection failed:', error)
      alert('Backend connection failed. Make sure the backend server is running on http://localhost:5000.')
    }
  }

  // ==================================================
  // UPDATE BLOOD BANK STOCK
  // ==================================================
  const updateStock = async (group, newStock) => {
    if (newStock === '') return

    const stockValue = Number(newStock)

    if (isNaN(stockValue) || stockValue < 0 || !Number.isInteger(stockValue)) {
      setStockUpdateError(`Invalid stock for ${group}. Must be a whole non-negative integer.`)
      return
    }

    setStockUpdateError(null)

    // Optimistic update for immediate UI response
    setInventory((prev) =>
      prev.map((item) =>
        item.group === group ? { ...item, stock: stockValue } : item
      )
    )

    try {
      const response = await fetch(
        `http://localhost:5000/api/inventory/${encodeURIComponent(group)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            stock: stockValue
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setStockUpdateError(data.message || 'Failed to update blood stock.')
        await loadInventory()
        return
      }

      await loadBanks()
      setTransferMessage('')
      console.log('Backend updated successfully:', data)
    } catch (error) {
      console.error('Failed to update blood stock:', error)
      setStockUpdateError('Network error while updating blood stock.')
      await loadInventory()
    }
  }

  // ==================================================
  // CONFIRM REDISTRIBUTION (BACKEND API)
  // ==================================================
  const confirmTransfer = async (shortage, bank) => {
    const transferUnits = shortage.minimum - shortage.stock

    const confirmed = window.confirm(
      `Confirm prototype transfer of ${transferUnits} units of ${shortage.group} blood from ${bank.name} to Blood Bank A?`
    )
    if (!confirmed) return

    setTransferring(true)
    setTransferError(null)

    try {
      const response = await fetch('http://localhost:5000/api/redistribution/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceBank: bank.name,
          destinationBank: 'Blood Bank A',
          group: shortage.group,
          units: transferUnits,
          note: `Redistribution to resolve ${shortage.group} shortage`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setTransferError(data.message || 'Transfer failed.')
        return
      }

      setTransferMessage(
        `✅ Prototype transfer completed: ${transferUnits} units of ${shortage.group} blood transferred from ${bank.name} to Blood Bank A.`
      )

      // Refresh data
      await loadInventory()
      await loadBanks()
      await loadTransfers()
    } catch (error) {
      console.error('Failed to execute redistribution transfer:', error)
      setTransferError('Network error while executing redistribution transfer.')
    } finally {
      setTransferring(false)
    }
  }

  // ==================================================
  // HOSPITAL BLOOD REQUEST (POST /api/requests)
  // ==================================================
  const handleBloodRequest = async () => {
    if (!bloodGroup || !units || !urgency) {
      setSubmitted(false)
      setRequestResult({
        type: 'error',
        message: 'Please fill all the required fields.'
      })
      return
    }

    const requiredUnits = Number(units)
    if (isNaN(requiredUnits) || requiredUnits <= 0 || !Number.isInteger(requiredUnits)) {
      setSubmitted(false)
      setRequestResult({
        type: 'error',
        message: 'Required units must be a positive whole integer.'
      })
      return
    }

    setSubmittingRequest(true)
    setRequestResult(null)

    try {
      const response = await fetch('http://localhost:5000/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bloodGroup,
          units: requiredUnits,
          urgency,
          hospitalName: hospitalName || 'City General Hospital'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setRequestResult({
          type: 'error',
          message: data.message || 'Failed to submit blood request'
        })
        return
      }

      const createdReq = data.request

      // Check availability across loaded banks
      const primaryBank = banks.find((b) => b.isPrimary) || banks[0]
      const primaryItem =
        inventory.find((i) => i.group === bloodGroup) ||
        primaryBank?.inventory?.find((i) => i.group === bloodGroup)
      const primaryStock = primaryItem ? primaryItem.stock : 0

      if (primaryStock >= requiredUnits) {
        setSubmitted(true)
        setRequestResult({
          type: 'available',
          requestId: createdReq.id,
          requestStatus: createdReq.status,
          bankName: primaryBank ? primaryBank.name : 'Blood Bank A',
          bankId: primaryBank ? primaryBank.id : 'bank-a',
          available: primaryStock,
          requiredUnits
        })
      } else {
        // Check other blood banks
        const donorBank = banks
          .filter((b) => !b.isPrimary)
          .find((b) => {
            const item = b.inventory?.find((i) => i.group === bloodGroup)
            return item && item.stock >= requiredUnits
          })

        if (donorBank) {
          const donorItem = donorBank.inventory.find((i) => i.group === bloodGroup)
          setSubmitted(true)
          setRequestResult({
            type: 'available',
            requestId: createdReq.id,
            requestStatus: createdReq.status,
            bankName: donorBank.name,
            bankId: donorBank.id,
            available: donorItem ? donorItem.stock : 0,
            requiredUnits
          })
        } else {
          setSubmitted(true)
          setRequestResult({
            type: 'unavailable',
            requestId: createdReq.id,
            requestStatus: createdReq.status,
            requiredUnits
          })
        }
      }

      await loadRequests()
    } catch (error) {
      console.error('Failed to submit blood request:', error)
      setRequestResult({
        type: 'error',
        message: 'Network error submitting request. Make sure backend is running.'
      })
    } finally {
      setSubmittingRequest(false)
    }
  }

  // ==================================================
  // CONFIRM BLOOD ISSUE TO HOSPITAL (POST /api/requests/:id/issue)
  // ==================================================
  const confirmBloodIssue = async () => {
    if (!requestResult || requestResult.type !== 'available' || !requestResult.requestId) {
      return
    }

    setIssuingBlood(true)

    try {
      const response = await fetch(
        `http://localhost:5000/api/requests/${requestResult.requestId}/issue`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bankId: requestResult.bankId,
            bankName: requestResult.bankName
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || 'Failed to issue blood request')
        return
      }

      setRequestResult({
        type: 'issued',
        requestId: data.request.id,
        bankName: data.request.issuedFromBank || requestResult.bankName,
        issued: data.request.unitsIssued || requestResult.requiredUnits
      })

      // Refresh inventory, banks, and request history
      await loadInventory()
      await loadBanks()
      await loadRequests()
    } catch (error) {
      console.error('Failed to issue blood request:', error)
      alert('Network error while confirming blood issue.')
    } finally {
      setIssuingBlood(false)
    }
  }

  // ==================================================
  // CONFIRM BLOOD ISSUE FROM HISTORY TABLE
  // ==================================================
  const issueRequestFromHistory = async (req) => {
    setIssuingBlood(true)

    try {
      const primaryBank = banks.find((b) => b.isPrimary) || banks[0]
      const primaryItem =
        inventory.find((i) => i.group === req.bloodGroup) ||
        primaryBank?.inventory?.find((i) => i.group === req.bloodGroup)

      let supplyingBank = primaryBank

      if (!primaryItem || primaryItem.stock < req.units) {
        const donorBank = banks
          .filter((b) => !b.isPrimary)
          .find((b) => {
            const item = b.inventory?.find((i) => i.group === req.bloodGroup)
            return item && item.stock >= req.units
          })
        if (donorBank) {
          supplyingBank = donorBank
        }
      }

      const response = await fetch(
        `http://localhost:5000/api/requests/${req.id}/issue`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bankId: supplyingBank?.id || 'bank-a',
            bankName: supplyingBank?.name || 'Blood Bank A'
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || 'Failed to issue blood request')
        return
      }

      alert(
        `✅ Blood issued successfully from ${data.bank?.name || supplyingBank?.name} for Request ${req.id}.`
      )

      await loadInventory()
      await loadBanks()
      await loadRequests()
    } catch (error) {
      console.error('Failed to issue blood request from history:', error)
      alert('Network error while issuing blood request.')
    } finally {
      setIssuingBlood(false)
    }
  }

  // ==================================================
  // LOGIN PAGE
  // ==================================================
  if (page === 'login') {
    return (
      <div className="login-page">
        <h1>🩸 Blood in Time</h1>
        <p className="login-subtitle">
          Choose how you want to access the system
        </p>

        <div className="role-container">
          {/* Hospital */}
          <div className="role-card">
            <div className="role-icon">🏥</div>
            <h2>Hospital</h2>
            <p>Request blood and check available blood sources.</p>
            <button
              className="primary-button"
              onClick={() => setPage('hospital')}
            >
              Continue as Hospital
            </button>
          </div>

          {/* Blood Bank */}
          <div className="role-card">
            <div className="role-icon">🩸</div>
            <h2>Blood Bank</h2>
            <p>Manage inventory, shortages and blood transfers.</p>
            <button
              className="primary-button"
              onClick={() => setPage('bloodbank')}
            >
              Continue as Blood Bank
            </button>
          </div>
        </div>

        <button className="back-button" onClick={() => setPage('home')}>
          ← Back to Home
        </button>
      </div>
    )
  }

  // ==================================================
  // HOSPITAL PAGE
  // ==================================================
  if (page === 'hospital') {
    return (
      <div className="dashboard">
        <h1>🏥 Hospital Dashboard</h1>
        <p className="dashboard-subtitle">
          Request blood when it is urgently required.
        </p>

        <div className="request-card">
          <h2>Blood Request</h2>

          {/* Hospital Name */}
          <label>Hospital Name</label>
          <input
            type="text"
            placeholder="Enter hospital name"
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
          />

          {/* Blood Group */}
          <label>Blood Group</label>
          <select
            value={bloodGroup}
            onChange={(e) => {
              setBloodGroup(e.target.value)
              setSubmitted(false)
              setRequestResult(null)
            }}
          >
            <option value="">Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>

          {/* Required Units */}
          <label>Required Units</label>
          <input
            type="number"
            placeholder="Enter number of units"
            min="1"
            value={units}
            onChange={(e) => {
              setUnits(e.target.value)
              setSubmitted(false)
              setRequestResult(null)
            }}
          />

          {/* Urgency */}
          <label>Urgency</label>
          <select
            value={urgency}
            onChange={(e) => {
              setUrgency(e.target.value)
              setSubmitted(false)
              setRequestResult(null)
            }}
          >
            <option value="">Select urgency</option>
            <option value="Emergency">Emergency</option>
            <option value="Urgent">Urgent</option>
            <option value="Normal">Normal</option>
          </select>

          {/* Submit */}
          <button
            className="primary-button"
            onClick={handleBloodRequest}
            disabled={submittingRequest}
          >
            {submittingRequest ? 'Submitting to Backend...' : 'Submit Blood Request'}
          </button>

          {/* Missing fields / Error */}
          {requestResult?.type === 'error' && (
            <div className="request-unavailable">
              <h3>⚠️ Request Error</h3>
              <p>{requestResult.message}</p>
            </div>
          )}

          {/* Request submitted */}
          {submitted && requestResult && (
            <div className="success-message">
              <h3>✅ Blood Request Submitted</h3>
              {requestResult.requestId && (
                <p>
                  <strong>Tracking ID:</strong> <code>{requestResult.requestId}</code>
                </p>
              )}
              <p>
                <strong>Blood Group:</strong> {bloodGroup}
              </p>
              <p>
                <strong>Units Required:</strong> {units}
              </p>
              <p>
                <strong>Urgency:</strong> {urgency}
              </p>

              {/* Blood Available */}
              {requestResult.type === 'available' && (
                <div className="request-result">
                  <h3>🔍 Availability Found</h3>
                  <p>
                    <strong>Recommended Source:</strong>
                  </p>
                  <p>🩸 {requestResult.bankName}</p>
                  <p>
                    Available Stock:
                    <strong> {requestResult.available} units</strong>
                  </p>

                  <button
                    className="primary-button"
                    onClick={confirmBloodIssue}
                    disabled={issuingBlood}
                  >
                    {issuingBlood ? 'Confirming with Backend...' : 'Confirm Blood Issue'}
                  </button>
                  <p className="info-note">
                    * Stock will be deducted from {requestResult.bankName} only upon confirmation.
                  </p>
                </div>
              )}

              {/* Blood issued */}
              {requestResult.type === 'issued' && (
                <div className="request-result">
                  <h3>✅ Blood Issue Confirmed</h3>
                  <p>
                    <strong>Source Bank:</strong> {requestResult.bankName}
                  </p>
                  <p>
                    <strong>Units Issued:</strong> {requestResult.issued}
                  </p>
                  <p>
                    Inventory has been updated in backend storage.
                  </p>
                </div>
              )}

              {/* Blood unavailable */}
              {requestResult.type === 'unavailable' && (
                <div className="request-unavailable">
                  <h3>⚠️ Blood Not Currently Available</h3>
                  <p>
                    No suitable blood bank currently has enough {bloodGroup} blood for
                    the requested {units} units.
                  </p>
                  <p>
                    Request ID <code>{requestResult.requestId}</code> is logged as Pending. The system will continue monitoring inventory.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RECENT HOSPITAL REQUESTS HISTORY */}
        <div className="history-card">
          <h2>📋 Recent Hospital Blood Requests</h2>
          {requestsHistory.length === 0 ? (
            <p className="empty-state">No hospital blood requests recorded yet.</p>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Hospital</th>
                  <th>Group</th>
                  <th>Units</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requestsHistory.slice(0, 10).map((req) => (
                  <tr key={req.id}>
                    <td><code>{req.id}</code></td>
                    <td>{req.hospitalName}</td>
                    <td><strong>{req.bloodGroup}</strong></td>
                    <td>{req.units}</td>
                    <td>
                      <span className={`status-badge status-badge-${(req.urgency || '').toLowerCase()}`}>
                        {req.urgency}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-badge-${(req.status || '').toLowerCase()}`}>
                        {req.status}
                      </span>
                    </td>
                    <td>
                      {new Date(req.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      {req.status === 'Pending' ? (
                        <button
                          className="table-action-button"
                          onClick={() => issueRequestFromHistory(req)}
                          disabled={issuingBlood}
                        >
                          Confirm Issue
                        </button>
                      ) : (
                        <span style={{ color: '#166534', fontSize: '13px', fontWeight: 'bold' }}>Issued</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="info-note">
            * Demonstration records saved in backend data store.
          </p>
        </div>

        <button className="back-button" onClick={() => setPage('home')}>
          ← Back to Home
        </button>
      </div>
    )
  }

  // ==================================================
  // BLOOD BANK PAGE
  // ==================================================
  if (page === 'bloodbank') {
    const shortageItems = inventory.filter((item) => item.stock < item.minimum)

    return (
      <div className="dashboard">
        <h1>🩸 Blood Bank Dashboard</h1>
        <p className="dashboard-subtitle">
          Monitor blood inventory and identify possible shortages.
        </p>

        {stockUpdateError && (
          <div className="error-banner">
            ⚠️ {stockUpdateError}
          </div>
        )}

        {inventoryError && (
          <div className="error-banner">
            ⚠️ {inventoryError}
          </div>
        )}

        {/* Inventory */}
        <div className="inventory-card">
          <h2>Blood Inventory (Blood Bank A)</h2>

          {inventoryLoading && <p className="info-note">Loading inventory from backend...</p>}

          <table className="inventory-table">
            <thead>
              <tr>
                <th>Blood Group</th>
                <th>Current Stock</th>
                <th>AI Minimum</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isShortage = item.stock < item.minimum

                return (
                  <tr
                    key={item.group}
                    className={isShortage ? 'shortage-row' : ''}
                  >
                    <td>
                      <strong>{item.group}</strong>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={item.stock}
                        onChange={(e) => updateStock(item.group, e.target.value)}
                        className="stock-input"
                        title="Click to edit and persist stock"
                      />
                    </td>
                    <td>{item.minimum}</td>
                    <td
                      className={
                        isShortage ? 'status-shortage' : 'status-sufficient'
                      }
                    >
                      {isShortage ? '⚠️ Shortage' : '✅ Sufficient'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Shortage Alerts */}
          {shortageItems.length > 0 && (
            <div className="shortage-alert">
              <h3>⚠️ Shortage Detected</h3>

              {shortageItems.map((item) => (
                <div key={item.group}>
                  <p>
                    <strong>{item.group}</strong> blood stock is below the AI-recommended minimum.
                  </p>
                  <p>
                    Current Stock: <strong>{item.stock} units</strong>
                  </p>
                  <p>
                    AI Minimum: <strong>{item.minimum} units</strong>
                  </p>
                  <p>
                    Shortage: <strong>{item.minimum - item.stock} units</strong>
                  </p>
                  <hr />
                </div>
              ))}
            </div>
          )}

          {/* Redistribution Recommendations */}
          {shortageItems.length > 0 && (
            <div className="transfer-recommendation">
              <h3>💡 Redistribution Recommendation</h3>

              {transferError && (
                <div className="error-banner">
                  ⚠️ {transferError}
                </div>
              )}

              {shortageItems.map((shortage) => {
                const requiredUnits = shortage.minimum - shortage.stock

                // Search nearby banks from backend
                const donorBanks = banks.filter((b) => !b.isPrimary)
                const suitableBank = donorBanks.find((bank) => {
                  const bItem = bank.inventory?.find((i) => i.group === shortage.group)
                  return bItem && bItem.stock >= requiredUnits
                })

                const donorItem = suitableBank?.inventory?.find((i) => i.group === shortage.group)
                const donorStock = donorItem ? donorItem.stock : 0

                return (
                  <div key={shortage.group}>
                    <h4>{shortage.group} Blood</h4>

                    {suitableBank ? (
                      <>
                        <p>
                          <strong>{suitableBank.name}</strong> has sufficient {shortage.group} stock.
                        </p>
                        <p>
                          Available Stock: <strong>{donorStock} units</strong>
                        </p>
                        <p>
                          Recommended Transfer: <strong>{requiredUnits} units</strong>
                        </p>
                        <button
                          className="primary-button"
                          onClick={() => confirmTransfer(shortage, suitableBank)}
                          disabled={transferring}
                        >
                          {transferring ? 'Executing Transfer...' : 'Confirm Transfer'}
                        </button>
                      </>
                    ) : (
                      <p>
                        ❌ No suitable nearby blood bank found with &gt;= {requiredUnits} units of {shortage.group}.
                      </p>
                    )}
                    <hr />
                  </div>
                )
              })}
            </div>
          )}

          {/* Transfer success message */}
          {transferMessage && (
            <div className="success-message">
              <h3>{transferMessage}</h3>
              <p>Inventory balances have been synchronized in the backend.</p>
            </div>
          )}

          {/* Normal status */}
          {shortageItems.length === 0 && (
            <div className="success-message">
              <h3>✅ Inventory Status Normal</h3>
              <p>
                All blood groups are currently above the AI-recommended minimum.
              </p>
            </div>
          )}
        </div>

        {/* CONFIRMED REDISTRIBUTION TRANSFER HISTORY */}
        <div className="history-card">
          <h2>🔄 Redistribution Transfer History</h2>
          {transfersHistory.length === 0 ? (
            <p className="empty-state">No redistribution transfers recorded yet.</p>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Transfer ID</th>
                  <th>Source Bank</th>
                  <th>Destination</th>
                  <th>Blood Group</th>
                  <th>Units</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {transfersHistory.slice(0, 10).map((t) => (
                  <tr key={t.id}>
                    <td><code>{t.id}</code></td>
                    <td>{t.sourceBankName}</td>
                    <td>{t.destinationBankName}</td>
                    <td><strong>{t.group}</strong></td>
                    <td>{t.units}</td>
                    <td>
                      <span className="status-badge status-badge-completed">
                        {t.status}
                      </span>
                    </td>
                    <td>
                      {new Date(t.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="info-note">
            * Demonstration transfers logged in backend data store.
          </p>
        </div>

        <button className="back-button" onClick={() => setPage('home')}>
          ← Back to Home
        </button>
      </div>
    )
  }

  // ==================================================
  // HOME PAGE
  // ==================================================
  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">🩸 Blood in Time</div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#how-it-works">How It Works</a>
          <button onClick={() => setPage('login')}>Login</button>
        </div>
      </nav>

      {/* Hero */}
      <section id="home" className="hero-section">
        <div className="hero-content">
          <p className="tagline">AI-POWERED BLOOD MANAGEMENT</p>
          <h1>
            Blood Availability,<br />
            <span>When It Matters Most.</span>
          </h1>

          <p className="description">
            Blood in Time monitors blood-bank inventory, detects shortages and
            recommends redistribution between blood banks to support timely
            blood availability.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-button"
              onClick={() => setPage('login')}
            >
              Hospital Login
            </button>

            <button
              className="secondary-button"
              onClick={() => setPage('login')}
            >
              Blood Bank Login
            </button>

            {/* BACKEND CONNECTION TEST */}
            <button
              className="secondary-button"
              onClick={testBackend}
            >
              Test Backend
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="hero-card">
          <div className="blood-icon">🩸</div>
          <h2>Smart Blood Inventory</h2>
          <p>
            AI analyzes demand and inventory patterns to identify potential shortages.
          </p>
        </div>
      </section>

      {/* About */}
      <section id="about" className="section">
        <p className="section-label">ABOUT THE SYSTEM</p>
        <h2>What is Blood in Time?</h2>
        <p>
          Blood in Time is an AI-based blood inventory and redistribution
          system designed to help blood banks monitor stock levels and identify
          shortages.
        </p>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="section">
        <p className="section-label">HOW IT WORKS</p>
        <h2>From Inventory to Timely Availability</h2>

        <div className="steps">
          {/* Step 1 */}
          <div className="step">
            <span>01</span>
            <h3>Monitor Inventory</h3>
            <p>Track blood units available for each blood group.</p>
          </div>

          {/* Step 2 */}
          <div className="step">
            <span>02</span>
            <h3>AI Analysis</h3>
            <p>Analyze historical demand and usage patterns.</p>
          </div>

          {/* Step 3 */}
          <div className="step">
            <span>03</span>
            <h3>Detect Shortage</h3>
            <p>Identify when stock falls below the required level.</p>
          </div>

          {/* Step 4 */}
          <div className="step">
            <span>04</span>
            <h3>Recommend Redistribution</h3>
            <p>Recommend transfer of blood units from a suitable surplus blood bank.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <h3>🩸 Blood in Time</h3>
        <p>AI-Based Blood Inventory & Redistribution System</p>
      </footer>
    </div>
  )
}

export default App