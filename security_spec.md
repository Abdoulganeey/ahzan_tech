# Ahzan Tech Ltd — Firestore Security Specification (Phase 0 — Lithium Intel 2-Way Sync Upgrade)

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every buyer-submitted `/buyers/{buyerId}` profile, `/rfqs/{rfqId}`, `/shipments/{shipmentId}`, `/tradeDocuments/{docId}`, and `/priceAlerts/{alertId}` record belongs exclusively to a single authenticated Firebase UID (`buyerUid == request.auth.uid`).
2. **Verified Multi-Admin Command Center Access**: Administrative reads and mutations across CRM, Trade Book, Tasks, RFQs, Shipments, Trade Documents, Price Alerts, and `/siteConfig/market` are restricted to verified executive admin accounts (`abdoulganeey@gmail.com`, `ahzantechltd@gmail.com`, `abdoul@ahzantechltd.com` with `request.auth.token.email_verified == true`, or `/admins/{uid}`).
3. **Email Verification Enforcement**: All client and admin mutations (`create`, `update`, `delete`) require `request.auth.token.email_verified == true`.
4. **Immutable Ownership & Creation Timestamps**: `buyerUid`/`ownerUid`, `refId`/`trackingCode`/`docCode`/`commodityKey`, and `createdAt` cannot be modified after creation (`incoming().field == existing().field`). Timestamps must match `request.time`.
5. **Zero PII Scraping (`list` Hardening)**: Non-admin buyers cannot `list` `/buyers`, `/crmContacts`, `/crmLeads`, `/crmEmails`, `/crmTasks`, or `/siteConfig`. Buyer `list` queries on `/rfqs`, `/shipments`, `/tradeDocuments`, and `/priceAlerts` explicitly enforce `resource.data.buyerUid == request.auth.uid` without `get()`/`exists()` lookups.
6. **Terminal State Locking**: Once an RFQ reaches `'Export Cleared'` or a shipment reaches `'Discharged at Port'`, buyer updates are rejected; only verified admins can amend or archive records.
7. **Schema Whitelisting & Payload Bounds**: Every document validator enforces `keys().hasOnly(...)`, strict enum membership for Android/Web pipeline stages (`PROSPECT`..`LOST`), outreach statuses, 100-pt rubric bounds, and string length limits.
8. **Executive CRM & Task Isolation**: `/crmContacts/{contactId}`, `/crmLeads/{leadId}`, `/crmEmails/{emailId}`, and `/crmTasks/{taskId}` contain confidential buyer dossier contacts, deal values, activities, and tasks; `get`/`create`/`update`/`delete` require `isAdmin()`, and `list` requires `isEmailAdmin()`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: Read `/crmLeads/lead-1` or `/rfqs/rfq-1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Cross-Tenant Read (IDOR)**: Non-admin User B calls `get` on `/buyers/userA` or `/rfqs/rfq-owned-by-A` -> `PERMISSION_DENIED`.
3. **Cross-Tenant List Scraping**: Non-admin User B queries `/buyers` or `/crmLeads` or `/rfqs` without `where('buyerUid', '==', uidB)` -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Create**: User B creates `/rfqs/rfq-x` with `buyerUid: "userA"` -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: User creates `/crmLeads/lead-x` or `/rfqs/rfq-x` adding `isSuperAdmin: true` -> `PERMISSION_DENIED` (`keys().hasOnly(...)`).
6. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts `create` on `/rfqs/rfq-x` -> `PERMISSION_DENIED`.
7. **Spoofed Admin Email**: User with `email: "abdoul@ahzantechltd.com"` and `email_verified: false` attempts admin read -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Create `/crmLeads/abc$$$..1500chars` -> `PERMISSION_DENIED` (`isValidId()`).
9. **String Size Exhaustion**: Create `/crmLeads/lead-1` with 10,000-character `emailBody` -> `PERMISSION_DENIED`.
10. **Timestamp Forgery**: Create `/crmTasks/task-1` with backdated `createdAt != request.time` -> `PERMISSION_DENIED`.
11. **Terminal State Tampering**: Buyer attempts to revert `'Export Cleared'` RFQ back to `'Submitted'` -> `PERMISSION_DENIED`.
12. **Score / Probability Tampering**: Invalid `priorityScore > 100` or `winProbability > 100` on `/crmLeads` -> `PERMISSION_DENIED`.
